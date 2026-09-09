import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ProductionLog, ProductionLogDocument } from './schemas/production-log.schema';
import { StockMovement, StockMovementDocument } from '../stock/schemas/stock-movement.schema';
import { CreateProductionLogDto } from './dto/create-production-log.dto';
import { QueryProductionLogDto } from './dto/query-production-log.dto';
import { ProductsService } from '../products/products.service';
import { ProductLotsService } from '../product-lots/product-lots.service';
import { RecipesService } from '../recipes/recipes.service';
import { MaterialsService } from '../materials/materials.service';
import { MaterialLotsService } from '../material-lots/material-lots.service';

@Injectable()
export class ProductionService {
  constructor(
    @InjectModel(ProductionLog.name)
    private readonly productionLogModel: Model<ProductionLogDocument>,
    @InjectModel(StockMovement.name)
    private readonly stockMovementModel: Model<StockMovementDocument>,
    private readonly productsService: ProductsService,
    private readonly productLotsService: ProductLotsService,
    private readonly recipesService: RecipesService,
    private readonly materialsService: MaterialsService,
    private readonly materialLotsService: MaterialLotsService,
  ) {}

  /**
   * Determines real materials consumption and cost for a production run:
   * 1. If the product has an active recipe, consume the needed raw materials FIFO
   *    according to the recipe (this is the normal, automatic path).
   * 2. Otherwise, if the caller explicitly listed materialsUsed, consume those FIFO.
   * 3. Otherwise, no materials are tracked and the cost falls back to the provided
   *    value or the product's last known cost price (previous behavior).
   */
  private async computeProductionCost(
    productId: string,
    quantityProduced: number,
    manualMaterialsUsed: { material: string; quantity: number; unit: string }[] | undefined,
    manualCostPerUnit: number | undefined,
    fallbackCostPerUnit: number,
  ): Promise<{ materialsUsed: any[]; totalMaterialCost: number; costPerUnitProduced: number }> {
    const recipeResult = await this.recipesService.consumeForProduction(productId, quantityProduced);

    if (recipeResult) {
      const costPerUnitProduced =
        manualCostPerUnit !== undefined
          ? manualCostPerUnit
          : quantityProduced > 0
            ? recipeResult.totalMaterialCost / quantityProduced
            : 0;
      return {
        materialsUsed: recipeResult.materialsUsed,
        totalMaterialCost: recipeResult.totalMaterialCost,
        costPerUnitProduced,
      };
    }

    if (manualMaterialsUsed && manualMaterialsUsed.length > 0) {
      const materialsUsed: any[] = [];
      let totalMaterialCost = 0;

      for (const m of manualMaterialsUsed) {
        const material = await this.materialsService.findById(m.material);
        const lotConsumptions = await this.materialLotsService.consumeFIFO(m.material, m.quantity);
        await this.materialsService.updateStock(m.material, -m.quantity);
        const cost = lotConsumptions.reduce((sum, c) => sum + c.totalCost, 0);
        totalMaterialCost += cost;

        materialsUsed.push({
          material: m.material,
          materialName: material.name,
          quantity: m.quantity,
          unit: m.unit,
          unitName: '',
          cost,
          lotsConsumed: lotConsumptions,
        });
      }

      const costPerUnitProduced =
        manualCostPerUnit !== undefined
          ? manualCostPerUnit
          : quantityProduced > 0
            ? totalMaterialCost / quantityProduced
            : 0;

      return { materialsUsed, totalMaterialCost, costPerUnitProduced };
    }

    return {
      materialsUsed: [],
      totalMaterialCost: 0,
      costPerUnitProduced: manualCostPerUnit !== undefined ? manualCostPerUnit : fallbackCostPerUnit,
    };
  }

  async createLog(
    dto: CreateProductionLogDto,
    userId: string,
  ): Promise<ProductionLogDocument> {
    const product = await this.productsService.findById(dto.product);
    const status = dto.status || 'APPROVED';

    const fallbackCostPerUnit = product.costPrice || product.costPerUnit || 0;
    let materialsUsed: any[] = [];
    let totalMaterialCost = 0;
    let costPerUnitProduced = dto.costPerUnitProduced !== undefined ? dto.costPerUnitProduced : fallbackCostPerUnit;

    // Only consume real raw materials when the log is being saved as APPROVED —
    // a PENDING log shouldn't touch stock until it's approved.
    if (status === 'APPROVED') {
      const computed = await this.computeProductionCost(
        dto.product,
        dto.quantityProduced,
        dto.materialsUsed as any,
        dto.costPerUnitProduced,
        fallbackCostPerUnit,
      );
      materialsUsed = computed.materialsUsed;
      totalMaterialCost = computed.totalMaterialCost;
      costPerUnitProduced = computed.costPerUnitProduced;
    }

    // Calculate earnedAmount
    const earnedAmount = dto.quantityProduced * product.price;

    // Calculate piece rate amount for piece-rate payroll
    const pieceRateAmount = dto.quantityProduced * ((product as any).pieceRate || 0);

    // Get product unit info for snapshot
    const productUnitId = typeof product.baseUnit === 'string'
      ? product.baseUnit
      : (product.baseUnit as any)._id?.toString() || product.baseUnit;
    const productUnitName = typeof product.baseUnit === 'object'
      ? (product.baseUnit as any).name || ''
      : '';

    const log = new this.productionLogModel({
      product: dto.product,
      productName: product.name,
      unit: productUnitId,
      unitName: productUnitName,
      date: new Date(dto.date),
      quantityProduced: dto.quantityProduced,
      materialsUsed,
      totalMaterialCost,
      costPerUnitProduced,
      earnedAmount,
      pieceRateAmount,
      notes: dto.notes,
      worker: dto.worker || userId,
      status,
    });

    const savedLog = await log.save();

    // Only perform stock/lot/movement operations for APPROVED logs
    if (status === 'APPROVED') {
      // Increment product stock
      await this.productsService.updateStock(
        dto.product,
        dto.quantityProduced,
      );

      // Auto-create ProductLot from production
      await this.productLotsService.createFromProduction(
        dto.product,
        dto.quantityProduced,
        productUnitId.toString(),
        costPerUnitProduced,
        savedLog._id.toString(),
        userId,
      );

      // Create StockMovement audit records
      await new this.stockMovementModel({
        type: 'IN',
        product: dto.product,
        quantity: dto.quantityProduced,
        unit: productUnitId,
        reason: `Ishlab chiqarish: ${product.name}`,
        reference: savedLog._id.toString(),
        referenceModel: 'ProductionLog',
        createdBy: userId,
      }).save();

      // Auto-update product costPrice from last 10 production logs average
      await this.updateProductCostPrice(dto.product);
    }

    return savedLog;
  }

  async approveLog(id: string, userId: string): Promise<ProductionLogDocument> {
    const log = await this.productionLogModel.findById(id);
    if (!log) throw new NotFoundException('Ishlab chiqarish logi topilmadi');
    if (log.status === 'APPROVED') throw new BadRequestException('Bu log allaqachon tasdiqlangan');

    const product = await this.productsService.findById(log.product.toString());

    // Get product unit info
    const productUnitId = typeof product.baseUnit === 'string'
      ? product.baseUnit
      : (product.baseUnit as any)._id?.toString() || product.baseUnit;

    // Consume real raw materials now that the log is actually being approved
    const fallbackCostPerUnit = product.costPrice || product.costPerUnit || 0;
    const computed = await this.computeProductionCost(
      log.product.toString(),
      log.quantityProduced,
      undefined,
      undefined,
      log.costPerUnitProduced || fallbackCostPerUnit,
    );
    log.materialsUsed = computed.materialsUsed;
    log.totalMaterialCost = computed.totalMaterialCost;
    log.costPerUnitProduced = computed.costPerUnitProduced;

    // Increment product stock
    await this.productsService.updateStock(log.product.toString(), log.quantityProduced);

    // Create product lot
    await this.productLotsService.createFromProduction(
      log.product.toString(),
      log.quantityProduced,
      productUnitId.toString(),
      log.costPerUnitProduced,
      log._id.toString(),
      userId,
    );

    // Create stock movement IN
    await new this.stockMovementModel({
      type: 'IN',
      product: log.product.toString(),
      quantity: log.quantityProduced,
      unit: productUnitId,
      reason: `Ishlab chiqarish: ${product.name}`,
      reference: log._id.toString(),
      referenceModel: 'ProductionLog',
      createdBy: userId,
    }).save();

    // Update log status
    log.status = 'APPROVED';
    log.approvedBy = new Types.ObjectId(userId);
    log.approvedAt = new Date();
    const savedLog = await log.save();

    // Auto-update product costPrice from last 10 production logs average
    await this.updateProductCostPrice(log.product.toString());

    return savedLog;
  }

  private async updateProductCostPrice(productId: string): Promise<void> {
    const recentLogs = await this.productionLogModel
      .find({ product: productId, status: 'APPROVED', costPerUnitProduced: { $gt: 0 } })
      .sort({ date: -1 })
      .limit(10)
      .exec();
    if (recentLogs.length > 0) {
      const avgCost = Math.round(
        recentLogs.reduce((sum, l) => sum + l.costPerUnitProduced, 0) / recentLogs.length,
      );
      await this.productsService.updateCostPrice(productId, avgCost);
    }
  }

  async findAllLogs(query: QueryProductionLogDto) {
    const {
      page = 1,
      limit = 20,
      product,
      search,
      worker,
      dateFrom,
      dateTo,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const filter: any = {};

    if (product) {
      filter.product = product;
    }

    if (status) {
      filter.status = status;
    }

    if (search) {
      filter.productName = { $regex: search, $options: 'i' };
    }

    if (worker) {
      filter.worker = worker;
    }

    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) {
        filter.date.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        filter.date.$lte = new Date(dateTo);
      }
    }

    const skip = (page - 1) * limit;
    const sort: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [items, total] = await Promise.all([
      this.productionLogModel
        .find(filter)
        .populate('product')
        .populate('worker', 'fullName username')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.productionLogModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findLogById(id: string): Promise<ProductionLogDocument> {
    const log = await this.productionLogModel
      .findById(id)
      .populate('product')
      .populate('worker', 'fullName username')
      .exec();

    if (!log) {
      throw new NotFoundException(`Production log with ID "${id}" not found`);
    }

    return log;
  }

  async getDailyProduction(date: string) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const logs = await this.productionLogModel
      .find({
        date: { $gte: startOfDay, $lte: endOfDay },
        status: 'APPROVED',
      })
      .populate('product')
      .populate('worker', 'fullName username')
      .sort({ date: -1 })
      .exec();

    return logs;
  }
}
