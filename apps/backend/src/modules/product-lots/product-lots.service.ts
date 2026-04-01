import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProductLot, ProductLotDocument } from './schemas/product-lot.schema';
import { CreateProductLotDto } from './dto/create-product-lot.dto';
import { QueryProductLotDto } from './dto/query-product-lot.dto';
import { ProductsService } from '../products/products.service';
import { UnitsService } from '../units/units.service';

@Injectable()
export class ProductLotsService {
  constructor(
    @InjectModel(ProductLot.name)
    private readonly productLotModel: Model<ProductLotDocument>,
    private readonly productsService: ProductsService,
    private readonly unitsService: UnitsService,
  ) {}

  async create(
    createProductLotDto: CreateProductLotDto,
    userId: string,
  ): Promise<ProductLotDocument> {
    const product = await this.productsService.findById(createProductLotDto.product);

    const lotNumber = await this.generateLotNumber();

    // Get product's baseUnit ID
    const baseUnitId = (product.baseUnit as any)?._id
      ? (product.baseUnit as any)._id.toString()
      : product.baseUnit.toString();

    const dtoUnitId = createProductLotDto.unit;

    let quantity = createProductLotDto.quantity;
    let unitCost = createProductLotDto.unitCost;
    let purchaseQuantity: number | undefined;
    let purchaseUnit: string | undefined;

    // UOM conversion if lot unit differs from product baseUnit
    if (dtoUnitId !== baseUnitId) {
      purchaseQuantity = createProductLotDto.quantity;
      purchaseUnit = dtoUnitId;

      // Convert quantity to baseUnit
      quantity = await this.unitsService.convert(dtoUnitId, baseUnitId, createProductLotDto.quantity);
      // Adjust unitCost: original totalCost / converted quantity
      unitCost = (createProductLotDto.quantity * createProductLotDto.unitCost) / quantity;
    }

    const totalCost = quantity * unitCost;

    // Update product stock (no costPerUnit AVCO)
    await this.productsService.updateStock(
      product._id.toString(),
      quantity,
    );

    const lot = new this.productLotModel({
      product: createProductLotDto.product,
      lotNumber,
      quantity,
      unit: baseUnitId,
      unitCost,
      totalCost,
      quantityRemaining: quantity,
      source: createProductLotDto.source || 'PURCHASE',
      purchaseQuantity,
      purchaseUnit,
      supplier: createProductLotDto.supplier,
      notes: createProductLotDto.notes,
      createdBy: userId,
    });

    return lot.save();
  }

  async createFromProduction(
    productId: string,
    quantity: number,
    unitId: string,
    costPerUnit: number,
    productionLogId: string,
    userId: string,
  ): Promise<ProductLotDocument> {
    const lotNumber = await this.generateLotNumber();

    const lot = new this.productLotModel({
      product: productId,
      lotNumber,
      quantity,
      unit: unitId,
      unitCost: costPerUnit,
      totalCost: quantity * costPerUnit,
      quantityRemaining: quantity,
      source: 'PRODUCTION',
      productionLog: productionLogId,
      createdBy: userId,
    });

    return lot.save();
  }

  async consumeFIFO(
    productId: string,
    quantityNeeded: number,
  ): Promise<{ lot: string; lotNumber: string; quantity: number; unitCost: number; totalCost: number }[]> {
    const lots = await this.productLotModel
      .find({ product: productId, quantityRemaining: { $gt: 0 } })
      .sort({ createdAt: 1 })
      .exec();

    let remaining = quantityNeeded;
    const consumptions: { lot: string; lotNumber: string; quantity: number; unitCost: number; totalCost: number }[] = [];

    for (const lot of lots) {
      if (remaining <= 0) break;

      const take = Math.min(remaining, lot.quantityRemaining);

      await this.productLotModel.findByIdAndUpdate(
        lot._id,
        { $inc: { quantityRemaining: -take } },
      ).exec();

      consumptions.push({
        lot: lot._id.toString(),
        lotNumber: lot.lotNumber,
        quantity: take,
        unitCost: lot.unitCost,
        totalCost: take * lot.unitCost,
      });

      remaining -= take;
    }

    if (remaining > 0) {
      // Rollback consumed lots
      for (const c of consumptions) {
        await this.productLotModel.findByIdAndUpdate(
          c.lot,
          { $inc: { quantityRemaining: c.quantity } },
        ).exec();
      }
      throw new BadRequestException(
        `Mahsulot yetarli emas. Kerak: ${quantityNeeded}, mavjud lotlarda: ${quantityNeeded - remaining}`,
      );
    }

    return consumptions;
  }

  async restoreFIFO(
    productId: string,
    quantityToRestore: number,
  ): Promise<void> {
    // Restore to most recent lots first (DESC order)
    const lots = await this.productLotModel
      .find({ product: productId })
      .sort({ createdAt: -1 })
      .exec();

    let remaining = quantityToRestore;

    for (const lot of lots) {
      if (remaining <= 0) break;

      const canRestore = lot.quantity - lot.quantityRemaining;
      if (canRestore <= 0) continue;

      const restore = Math.min(remaining, canRestore);

      await this.productLotModel.findByIdAndUpdate(
        lot._id,
        { $inc: { quantityRemaining: restore } },
      ).exec();

      remaining -= restore;
    }
  }

  async findAll(query: QueryProductLotDto) {
    const {
      page = 1,
      limit = 20,
      product,
      supplier,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const filter: any = {};

    if (product) {
      filter.product = product;
    }

    if (supplier) {
      filter.supplier = { $regex: supplier, $options: 'i' };
    }

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) {
        filter.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        filter.createdAt.$lte = new Date(dateTo);
      }
    }

    const skip = (page - 1) * limit;
    const sort: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [items, total] = await Promise.all([
      this.productLotModel
        .find(filter)
        .populate({
          path: 'product',
          populate: { path: 'baseUnit' },
        })
        .populate('unit')
        .populate('purchaseUnit')
        .populate('createdBy', 'fullName username')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.productLotModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<ProductLotDocument> {
    const lot = await this.productLotModel
      .findById(id)
      .populate({
        path: 'product',
        populate: { path: 'baseUnit' },
      })
      .populate('unit')
      .populate('purchaseUnit')
      .populate('createdBy', 'fullName username')
      .exec();

    if (!lot) {
      throw new NotFoundException(`ProductLot with ID "${id}" not found`);
    }

    return lot;
  }

  async getLotsByProduct(productId: string, query: QueryProductLotDto) {
    return this.findAll({ ...query, product: productId });
  }

  async getProductCostHistory(productId: string) {
    const lots = await this.productLotModel
      .find({ product: productId })
      .populate('unit')
      .populate('purchaseUnit')
      .sort({ createdAt: 1 })
      .exec();

    return lots;
  }

  async generateLotNumber(): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    const prefix = `PLOT-${dateStr}-`;

    const lastLot = await this.productLotModel
      .findOne({ lotNumber: { $regex: `^${prefix}` } })
      .sort({ lotNumber: -1 })
      .exec();

    let counter = 1;
    if (lastLot) {
      const lastCounter = parseInt(lastLot.lotNumber.split('-')[2], 10);
      counter = lastCounter + 1;
    }

    return `${prefix}${String(counter).padStart(3, '0')}`;
  }
}
