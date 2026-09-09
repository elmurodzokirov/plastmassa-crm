import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Recipe, RecipeDocument } from './schemas/recipe.schema';
import { UpsertRecipeDto } from './dto/upsert-recipe.dto';
import { MaterialsService } from '../materials/materials.service';
import {
  MaterialLotsService,
  MaterialLotConsumptionRecord,
} from '../material-lots/material-lots.service';
import { ProductsService } from '../products/products.service';

export interface PlannedCostItem {
  material: string;
  materialName: string;
  quantityPerUnit: number;
  wastagePercent: number;
  unitCost: number;
  cost: number;
}

export interface PlannedCostBreakdown {
  recipeId: string;
  version: number;
  items: PlannedCostItem[];
  materialCost: number;
  laborCost: number;
  overheadCost: number;
  totalCost: number;
}

export interface MaterialsUsedResult {
  materialsUsed: {
    material: string;
    materialName: string;
    quantity: number;
    unit: string;
    unitName: string;
    cost: number;
    lotsConsumed: MaterialLotConsumptionRecord[];
  }[];
  totalMaterialCost: number;
}

@Injectable()
export class RecipesService {
  constructor(
    @InjectModel(Recipe.name)
    private readonly recipeModel: Model<RecipeDocument>,
    private readonly materialsService: MaterialsService,
    private readonly materialLotsService: MaterialLotsService,
    private readonly productsService: ProductsService,
  ) {}

  async upsert(dto: UpsertRecipeDto, userId: string): Promise<RecipeDocument> {
    const existing = await this.recipeModel
      .findOne({ product: dto.product, isActive: true })
      .exec();

    const nextVersion = existing ? existing.version + 1 : 1;

    if (existing) {
      existing.isActive = false;
      await existing.save();
    }

    const recipe = new this.recipeModel({
      product: dto.product,
      items: dto.items.map((item) => ({
        material: item.material,
        quantityPerUnit: item.quantityPerUnit,
        wastagePercent: item.wastagePercent || 0,
      })),
      laborCostPerUnit: dto.laborCostPerUnit || 0,
      overheadPercent: dto.overheadPercent || 0,
      version: nextVersion,
      isActive: true,
      notes: dto.notes,
      createdBy: userId,
    });

    const savedRecipe = await recipe.save();

    // Keep the product's costPrice in sync with the latest calculation immediately
    const plannedCost = await this.calculatePlannedCost(dto.product);
    if (plannedCost) {
      await this.productsService.updateCostPrice(dto.product, plannedCost.totalCost);
    }

    return savedRecipe;
  }

  async findAllActive(): Promise<RecipeDocument[]> {
    return this.recipeModel
      .find({ isActive: true })
      .populate('product')
      .sort({ updatedAt: -1 })
      .exec();
  }

  async findActiveByProduct(productId: string): Promise<RecipeDocument | null> {
    return this.recipeModel
      .findOne({ product: productId, isActive: true })
      .populate({ path: 'items.material', populate: { path: 'baseUnit' } })
      .populate('createdBy', 'fullName username')
      .exec();
  }

  async findHistory(productId: string): Promise<RecipeDocument[]> {
    return this.recipeModel
      .find({ product: productId })
      .populate({ path: 'items.material', populate: { path: 'baseUnit' } })
      .populate('createdBy', 'fullName username')
      .sort({ version: -1 })
      .exec();
  }

  /**
   * Theoretical ("planned") cost to produce one unit of the product, computed from
   * the active recipe using each material's current FIFO-weighted average cost.
   */
  async calculatePlannedCost(productId: string): Promise<PlannedCostBreakdown | null> {
    const recipe = await this.findActiveByProduct(productId);
    if (!recipe || recipe.items.length === 0) {
      return null;
    }

    const items: PlannedCostItem[] = [];
    let materialCost = 0;

    for (const item of recipe.items) {
      const materialId = (item.material as any)?._id
        ? (item.material as any)._id.toString()
        : item.material.toString();
      const materialName = (item.material as any)?.name || '';
      const unitCost = await this.materialLotsService.getWeightedAverageCost(materialId);
      const effectiveQty = item.quantityPerUnit * (1 + (item.wastagePercent || 0) / 100);
      const cost = effectiveQty * unitCost;
      materialCost += cost;

      items.push({
        material: materialId,
        materialName,
        quantityPerUnit: item.quantityPerUnit,
        wastagePercent: item.wastagePercent || 0,
        unitCost,
        cost,
      });
    }

    const laborCost = recipe.laborCostPerUnit || 0;
    const overheadCost = ((materialCost + laborCost) * (recipe.overheadPercent || 0)) / 100;
    const totalCost = materialCost + laborCost + overheadCost;

    return {
      recipeId: recipe._id.toString(),
      version: recipe.version,
      items,
      materialCost,
      laborCost,
      overheadCost,
      totalCost,
    };
  }

  /**
   * Consumes the real raw materials (FIFO) needed to produce `quantityProduced` units
   * of the product, according to its active recipe. Returns null when no recipe exists
   * (caller should fall back to its previous behavior in that case).
   * Rolls back any partial consumption if a later material runs short.
   */
  async consumeForProduction(
    productId: string,
    quantityProduced: number,
  ): Promise<MaterialsUsedResult | null> {
    const recipe = await this.findActiveByProduct(productId);
    if (!recipe || recipe.items.length === 0) {
      return null;
    }

    const materialsUsed: MaterialsUsedResult['materialsUsed'] = [];
    let totalMaterialCost = 0;
    const consumedForRollback: { materialId: string; qty: number; consumptions: MaterialLotConsumptionRecord[] }[] = [];

    try {
      for (const item of recipe.items) {
        const materialId = (item.material as any)?._id
          ? (item.material as any)._id.toString()
          : item.material.toString();

        const material = await this.materialsService.findById(materialId);
        const neededQty =
          item.quantityPerUnit * (1 + (item.wastagePercent || 0) / 100) * quantityProduced;

        const lotConsumptions = await this.materialLotsService.consumeFIFO(materialId, neededQty);
        await this.materialsService.updateStock(materialId, -neededQty);
        consumedForRollback.push({ materialId, qty: neededQty, consumptions: lotConsumptions });

        const cost = lotConsumptions.reduce((sum, c) => sum + c.totalCost, 0);
        totalMaterialCost += cost;

        const unitId = (material.baseUnit as any)?._id
          ? (material.baseUnit as any)._id.toString()
          : material.baseUnit.toString();
        const unitName = (material.baseUnit as any)?.name || '';

        materialsUsed.push({
          material: materialId,
          materialName: material.name,
          quantity: neededQty,
          unit: unitId,
          unitName,
          cost,
          lotsConsumed: lotConsumptions,
        });
      }
    } catch (error) {
      for (const rollback of consumedForRollback) {
        await this.materialLotsService.restoreConsumptions(rollback.consumptions);
        await this.materialsService.updateStock(rollback.materialId, rollback.qty);
      }
      throw error;
    }

    return { materialsUsed, totalMaterialCost };
  }
}
