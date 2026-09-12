import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Material, MaterialDocument } from './schemas/material.schema';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { QueryMaterialDto } from './dto/query-material.dto';

@Injectable()
export class MaterialsService {
  constructor(
    @InjectModel(Material.name)
    private readonly materialModel: Model<MaterialDocument>,
  ) {}

  async create(dto: CreateMaterialDto): Promise<MaterialDocument> {
    const material = new this.materialModel(dto);
    return material.save();
  }

  async findAll(query: QueryMaterialDto) {
    const {
      page = 1,
      limit = 20,
      search,
      category,
      isActive,
      lowStock,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const filter: any = {};

    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    if (category) {
      filter.category = category;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive;
    }

    if (lowStock) {
      filter.$expr = {
        $and: [
          { $gt: ['$minStock', 0] },
          { $lte: ['$currentStock', '$minStock'] },
        ],
      };
    }

    const skip = (page - 1) * limit;
    const sort: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [items, total] = await Promise.all([
      this.materialModel
        .find(filter)
        .populate('baseUnit')
        .populate('defaultSupplier')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.materialModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<MaterialDocument> {
    const material = await this.materialModel.findById(id).populate('baseUnit')
        .populate('defaultSupplier').exec();
    if (!material) {
      throw new NotFoundException(`Material with ID "${id}" not found`);
    }
    return material;
  }

  async update(id: string, dto: UpdateMaterialDto): Promise<MaterialDocument> {
    const updateData = { ...dto };
    delete (updateData as any).currentStock;

    const material = await this.materialModel
      .findByIdAndUpdate(id, { $set: updateData }, { new: true })
      .populate('baseUnit')
        .populate('defaultSupplier')
      .exec();

    if (!material) {
      throw new NotFoundException(`Material with ID "${id}" not found`);
    }
    return material;
  }

  async remove(id: string): Promise<MaterialDocument> {
    const material = await this.materialModel
      .findByIdAndUpdate(id, { $set: { isActive: false } }, { new: true })
      .exec();
    if (!material) {
      throw new NotFoundException(`Material with ID "${id}" not found`);
    }
    return material;
  }

  async getStats() {
    const [agg] = await this.materialModel.aggregate([
      {
        $group: {
          _id: null,
          totalMaterials: { $sum: 1 },
          activeMaterials: { $sum: { $cond: ['$isActive', 1, 0] } },
          inventoryValue: {
            $sum: { $multiply: ['$currentStock', '$costPrice'] },
          },
          lowStockCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gt: ['$minStock', 0] },
                    { $lte: ['$currentStock', '$minStock'] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    return {
      totalMaterials: agg?.totalMaterials || 0,
      activeMaterials: agg?.activeMaterials || 0,
      inventoryValue: agg?.inventoryValue || 0,
      lowStockCount: agg?.lowStockCount || 0,
    };
  }

  async getCategories(): Promise<string[]> {
    const categories = await this.materialModel
      .distinct('category', { category: { $nin: [null, ''] } })
      .exec();
    return categories.sort();
  }

  async updateStock(id: string, quantity: number, costPrice?: number): Promise<MaterialDocument> {
    const updateOps: any = { $inc: { currentStock: quantity } };
    if (costPrice !== undefined) {
      updateOps.$set = { costPrice };
    }

    const material = await this.materialModel
      .findByIdAndUpdate(id, updateOps, { new: true })
      .exec();

    if (!material) {
      throw new NotFoundException(`Material with ID "${id}" not found`);
    }
    return material;
  }

  async stockTake(id: string, countedQuantity: number): Promise<MaterialDocument> {
    const material = await this.materialModel.findById(id).exec();
    if (!material) {
      throw new NotFoundException(`Material with ID "${id}" not found`);
    }

    const diff = countedQuantity - material.currentStock;
    if (diff === 0) {
      return material;
    }

    return this.updateStock(id, diff);
  }
}
