import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MaterialLot, MaterialLotDocument } from './schemas/material-lot.schema';
import { CreateMaterialLotDto } from './dto/create-material-lot.dto';
import { QueryMaterialLotDto } from './dto/query-material-lot.dto';
import { MaterialsService } from '../materials/materials.service';
import { UnitsService } from '../units/units.service';
import { SuppliersService } from '../suppliers/suppliers.service';

export interface MaterialLotConsumptionRecord {
  lot: string;
  lotNumber: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

@Injectable()
export class MaterialLotsService {
  constructor(
    @InjectModel(MaterialLot.name)
    private readonly materialLotModel: Model<MaterialLotDocument>,
    private readonly materialsService: MaterialsService,
    private readonly unitsService: UnitsService,
    private readonly suppliersService: SuppliersService,
  ) {}

  async create(
    dto: CreateMaterialLotDto,
    userId: string,
  ): Promise<MaterialLotDocument> {
    const material = await this.materialsService.findById(dto.material);
    const lotNumber = await this.generateLotNumber();

    const baseUnitId = (material.baseUnit as any)?._id
      ? (material.baseUnit as any)._id.toString()
      : material.baseUnit.toString();

    const dtoUnitId = dto.unit;

    let quantity = dto.quantity;
    let unitCost = dto.unitCost;
    let purchaseQuantity: number | undefined;
    let purchaseUnit: string | undefined;

    if (dtoUnitId !== baseUnitId) {
      purchaseQuantity = dto.quantity;
      purchaseUnit = dtoUnitId;
      quantity = await this.unitsService.convert(dtoUnitId, baseUnitId, dto.quantity);
      unitCost = (dto.quantity * dto.unitCost) / quantity;
    }

    const totalCost = quantity * unitCost;

    if (dto.paidAmount && dto.paidAmount > totalCost) {
      throw new BadRequestException(
        "To'langan summa kirim jamisidan oshib ketmoqda",
      );
    }

    if (dto.paidAmount && dto.paidAmount > 0 && !dto.supplier) {
      throw new BadRequestException(
        "Naqd to'lov qilish uchun yetkazib beruvchini tanlang",
      );
    }

    await this.materialsService.updateStock(material._id.toString(), quantity, unitCost);

    const lot = new this.materialLotModel({
      material: dto.material,
      lotNumber,
      quantity,
      unit: baseUnitId,
      unitCost,
      totalCost,
      quantityRemaining: quantity,
      source: dto.source || 'PURCHASE',
      purchaseQuantity,
      purchaseUnit,
      supplier: dto.supplier,
      notes: dto.notes,
      createdBy: userId,
    });

    const savedLot = await lot.save();

    if (dto.supplier) {
      await this.suppliersService.updateDebt(dto.supplier, totalCost);

      if (dto.paidAmount && dto.paidAmount > 0) {
        await this.suppliersService.createPayment(
          {
            supplier: dto.supplier,
            amount: dto.paidAmount,
            type: 'CASH',
            notes: `Xom-ashyo kirimi uchun naqd to'lov (${lotNumber})`,
          },
          userId,
        );
      }
    }

    return savedLot;
  }

  async createAdjustmentLot(
    materialId: string,
    quantity: number,
    unitId: string,
    unitCost: number,
    userId: string,
    notes?: string,
  ): Promise<MaterialLotDocument> {
    const lotNumber = await this.generateLotNumber();

    const lot = new this.materialLotModel({
      material: materialId,
      lotNumber,
      quantity,
      unit: unitId,
      unitCost,
      totalCost: quantity * unitCost,
      quantityRemaining: quantity,
      source: 'ADJUSTMENT',
      notes,
      createdBy: userId,
    });

    return lot.save();
  }

  async consumeFIFO(
    materialId: string,
    quantityNeeded: number,
  ): Promise<MaterialLotConsumptionRecord[]> {
    const lots = await this.materialLotModel
      .find({ material: materialId, quantityRemaining: { $gt: 0 } })
      .sort({ createdAt: 1 })
      .exec();

    let remaining = quantityNeeded;
    const consumptions: MaterialLotConsumptionRecord[] = [];

    for (const lot of lots) {
      if (remaining <= 0) break;

      const take = Math.min(remaining, lot.quantityRemaining);

      await this.materialLotModel.findByIdAndUpdate(
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
      for (const c of consumptions) {
        await this.materialLotModel.findByIdAndUpdate(
          c.lot,
          { $inc: { quantityRemaining: c.quantity } },
        ).exec();
      }
      throw new BadRequestException(
        `Xom-ashyo yetarli emas. Kerak: ${quantityNeeded}, mavjud lotlarda: ${quantityNeeded - remaining}`,
      );
    }

    return consumptions;
  }

  async restoreConsumptions(consumptions: MaterialLotConsumptionRecord[]): Promise<void> {
    for (const consumption of [...consumptions].reverse()) {
      await this.materialLotModel.findByIdAndUpdate(
        consumption.lot,
        { $inc: { quantityRemaining: consumption.quantity } },
      ).exec();
    }
  }

  async findAll(query: QueryMaterialLotDto) {
    const {
      page = 1,
      limit = 20,
      material,
      supplier,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const filter: any = {};

    if (material) filter.material = material;
    if (supplier) filter.supplier = { $regex: supplier, $options: 'i' };

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const skip = (page - 1) * limit;
    const sort: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [items, total] = await Promise.all([
      this.materialLotModel
        .find(filter)
        .populate({ path: 'material', populate: { path: 'baseUnit' } })
        .populate('unit')
        .populate('purchaseUnit')
        .populate('supplier')
        .populate('createdBy', 'fullName username')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.materialLotModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getLotsByMaterial(materialId: string, query: QueryMaterialLotDto) {
    return this.findAll({ ...query, material: materialId });
  }

  /**
   * Weighted-average cost of a material's currently remaining stock (FIFO lots
   * still open). Falls back to the material's stored costPrice if no open lots exist.
   */
  async getWeightedAverageCost(materialId: string): Promise<number> {
    const lots = await this.materialLotModel
      .find({ material: materialId, quantityRemaining: { $gt: 0 } })
      .exec();

    if (lots.length === 0) {
      const material = await this.materialsService.findById(materialId);
      return material.costPrice || 0;
    }

    let totalQty = 0;
    let totalValue = 0;
    for (const lot of lots) {
      totalQty += lot.quantityRemaining;
      totalValue += lot.quantityRemaining * lot.unitCost;
    }

    return totalQty > 0 ? totalValue / totalQty : 0;
  }

  async generateLotNumber(): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    const prefix = `MLOT-${dateStr}-`;

    const lastLot = await this.materialLotModel
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
