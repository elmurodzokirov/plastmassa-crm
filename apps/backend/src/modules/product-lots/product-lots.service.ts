import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProductLot, ProductLotDocument } from './schemas/product-lot.schema';
import { CreateProductLotDto } from './dto/create-product-lot.dto';
import { CreateProductLotBatchDto, ProductLotBatchItemDto } from './dto/create-product-lot-batch.dto';
import { QueryProductLotDto } from './dto/query-product-lot.dto';
import { QueryProductLotBatchDto } from './dto/query-product-lot-batch.dto';
import { UpdateProductLotBatchDto } from './dto/update-product-lot-batch.dto';
import { ProductsService } from '../products/products.service';
import { UnitsService } from '../units/units.service';
import { SuppliersService } from '../suppliers/suppliers.service';
import { Types } from 'mongoose';

export interface ProductLotBatchGroup {
  batchNumber: string;
  createdAt: Date;
  supplier: any;
  createdBy: any;
  itemCount: number;
  totalSum: number;
  source: string;
}

export interface LotConsumptionRecord {
  lot: string;
  lotNumber: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

@Injectable()
export class ProductLotsService {
  constructor(
    @InjectModel(ProductLot.name)
    private readonly productLotModel: Model<ProductLotDocument>,
    private readonly productsService: ProductsService,
    private readonly unitsService: UnitsService,
    private readonly suppliersService: SuppliersService,
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

    if (createProductLotDto.paidAmount && createProductLotDto.paidAmount > totalCost) {
      throw new BadRequestException(
        "To'langan summa kirim jamisidan oshib ketmoqda",
      );
    }

    if (
      createProductLotDto.paidAmount &&
      createProductLotDto.paidAmount > 0 &&
      !createProductLotDto.supplier
    ) {
      throw new BadRequestException(
        "Naqd to'lov qilish uchun yetkazib beruvchini tanlang",
      );
    }

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

    const savedLot = await lot.save();

    if (createProductLotDto.supplier) {
      await this.suppliersService.updateDebt(createProductLotDto.supplier, totalCost);

      if (createProductLotDto.paidAmount && createProductLotDto.paidAmount > 0) {
        await this.suppliersService.createPayment(
          {
            supplier: createProductLotDto.supplier,
            amount: createProductLotDto.paidAmount,
            type: 'CASH',
            notes: `Mahsulot kirimi uchun naqd to'lov (${lotNumber})`,
          },
          userId,
        );
      }
    }

    return savedLot;
  }

  async createBatch(
    dto: CreateProductLotBatchDto,
    userId: string,
  ): Promise<ProductLotDocument[]> {
    if (dto.paidAmount && dto.paidAmount > 0 && !dto.supplier) {
      throw new BadRequestException(
        "Naqd to'lov qilish uchun yetkazib beruvchini tanlang",
      );
    }

    // 1) Pre-compute every line's quantities/costs (read-only) before mutating anything,
    //    so a bad line fails the whole batch instead of leaving partial data.
    const computed = await Promise.all(
      dto.items.map((item) => this.computeLotLine(item)),
    );

    const batchTotalCost = computed.reduce((sum, c) => sum + c.totalCost, 0);

    if (dto.paidAmount && dto.paidAmount > batchTotalCost) {
      throw new BadRequestException(
        "To'langan summa kirim jamisidan oshib ketmoqda",
      );
    }

    // Every lot created by this call shares one batchNumber, so the "Mahsulot kirimlari"
    // table can group and later edit them together as a single purchase-invoice document.
    const batchNumber = await this.generateBatchNumber();

    // 2) Create each lot + update stock + optionally update the product's selling price.
    const savedLots: ProductLotDocument[] = [];
    for (let i = 0; i < computed.length; i++) {
      const item = dto.items[i];
      const c = computed[i];
      const lotNumber = await this.generateLotNumber();

      await this.productsService.updateStock(c.product._id.toString(), c.quantity);

      const lot = new this.productLotModel({
        product: item.product,
        lotNumber,
        batchNumber,
        quantity: c.quantity,
        unit: c.baseUnitId,
        unitCost: c.unitCost,
        totalCost: c.totalCost,
        quantityRemaining: c.quantity,
        source: 'PURCHASE',
        purchaseQuantity: c.purchaseQuantity,
        purchaseUnit: c.purchaseUnit,
        supplier: dto.supplier,
        notes: dto.notes,
        createdBy: userId,
      });

      savedLots.push(await lot.save());

      if (item.sellPrice !== undefined && item.sellPrice !== null) {
        await this.productsService.update(item.product, { price: item.sellPrice } as any);
      }
    }

    // 3) One aggregate debt increment + one payment for the whole invoice.
    if (dto.supplier) {
      await this.suppliersService.updateDebt(dto.supplier, batchTotalCost);

      if (dto.paidAmount && dto.paidAmount > 0) {
        await this.suppliersService.createPayment(
          {
            supplier: dto.supplier,
            amount: dto.paidAmount,
            type: 'CASH',
            notes: `Mahsulot kirimi uchun naqd to'lov (${savedLots.map((l) => l.lotNumber).join(', ')})`,
          },
          userId,
        );
      }
    }

    return savedLots;
  }

  /** Unwraps a field that may be a raw ObjectId/string or a populated document into its
   *  plain id string. */
  private toIdString(value: any): string {
    if (value && typeof value === 'object' && value._id) return value._id.toString();
    return value.toString();
  }

  private async computeLotLine(item: ProductLotBatchItemDto) {
    const product = await this.productsService.findById(item.product);

    const baseUnitId = (product.baseUnit as any)?._id
      ? (product.baseUnit as any)._id.toString()
      : product.baseUnit.toString();

    let quantity = item.quantity;
    let unitCost = item.unitCost;
    let purchaseQuantity: number | undefined;
    let purchaseUnit: string | undefined;

    if (item.unit !== baseUnitId) {
      purchaseQuantity = item.quantity;
      purchaseUnit = item.unit;

      quantity = await this.unitsService.convert(item.unit, baseUnitId, item.quantity);
      unitCost = (item.quantity * item.unitCost) / quantity;
    }

    const totalCost = quantity * unitCost;

    return { product, baseUnitId, quantity, unitCost, totalCost, purchaseQuantity, purchaseUnit };
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

  /** The lot auto-created from a production log (if any) — used to check whether
   *  that log's produced stock has since been partially/fully consumed (i.e. can
   *  no longer be safely edited or deleted from the production side). */
  async findByProductionLog(productionLogId: string): Promise<ProductLotDocument | null> {
    return this.productLotModel.findOne({ productionLog: productionLogId }).exec();
  }

  /** Removes the lot auto-created from a production log, used when that log is being
   *  edited (product/quantity changed) or deleted — only ever called after confirming
   *  via findByProductionLog that nothing has been consumed from it yet. */
  async deleteByProductionLog(productionLogId: string): Promise<void> {
    await this.productLotModel.deleteOne({ productionLog: productionLogId }).exec();
  }

  async createAdjustmentLot(
    productId: string,
    quantity: number,
    unitId: string,
    unitCost: number,
    userId: string,
    notes?: string,
  ): Promise<ProductLotDocument> {
    const lotNumber = await this.generateLotNumber();

    const lot = new this.productLotModel({
      product: productId,
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
    productId: string,
    quantityNeeded: number,
  ): Promise<LotConsumptionRecord[]> {
    const lots = await this.productLotModel
      .find({ product: productId, quantityRemaining: { $gt: 0 } })
      .sort({ createdAt: 1 })
      .exec();

    let remaining = quantityNeeded;
    const consumptions: LotConsumptionRecord[] = [];

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

  async restoreConsumptions(
    consumptions: LotConsumptionRecord[],
    quantityToRestore?: number,
  ): Promise<void> {
    const orderedConsumptions = [...consumptions].reverse();
    let remaining = quantityToRestore;

    for (const consumption of orderedConsumptions) {
      if (remaining !== undefined && remaining <= 0) {
        break;
      }

      const restoreQuantity =
        remaining === undefined
          ? consumption.quantity
          : Math.min(remaining, consumption.quantity);

      if (restoreQuantity <= 0) {
        continue;
      }

      await this.productLotModel.findByIdAndUpdate(
        consumption.lot,
        { $inc: { quantityRemaining: restoreQuantity } },
      ).exec();

      if (remaining !== undefined) {
        remaining -= restoreQuantity;
      }
    }
  }

  async consumeRecordedConsumptions(
    consumptions: LotConsumptionRecord[],
  ): Promise<void> {
    for (const consumption of consumptions) {
      const lot = await this.productLotModel.findById(consumption.lot).exec();

      if (!lot) {
        throw new NotFoundException(`Lot with ID "${consumption.lot}" not found`);
      }

      if (lot.quantityRemaining < consumption.quantity) {
        throw new BadRequestException(
          `Lot ${lot.lotNumber} da yetarli qoldiq yo'q`,
        );
      }

      await this.productLotModel.findByIdAndUpdate(
        consumption.lot,
        { $inc: { quantityRemaining: -consumption.quantity } },
      ).exec();
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
      filter.supplier = supplier;
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
        .populate('supplier')
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

  async generateBatchNumber(): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    const prefix = `KIRIM-${dateStr}-`;

    const lastBatch = await this.productLotModel
      .findOne({ batchNumber: { $regex: `^${prefix}` } })
      .sort({ batchNumber: -1 })
      .exec();

    let counter = 1;
    if (lastBatch?.batchNumber) {
      const lastCounter = parseInt(lastBatch.batchNumber.split('-')[2], 10);
      counter = lastCounter + 1;
    }

    return `${prefix}${String(counter).padStart(3, '0')}`;
  }

  // ── Purchase-invoice ("kirim hujjati") grouping ──────────────────────────────
  // Lots created together via createBatch() share one batchNumber. Older lots (created
  // before this field existed) and single production/adjustment lots have none — each of
  // those is treated as its own one-item "batch", keyed by its own _id, so every lot still
  // shows up exactly once in the grouped table.

  async findAllBatches(query: QueryProductLotBatchDto) {
    const { page = 1, limit = 20, supplier, dateFrom, dateTo, sortOrder = 'desc' } = query;

    const filter: any = {};
    if (supplier) filter.supplier = supplier;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    // Grouping is done in application code rather than a $group aggregation — simpler to
    // get right and plenty fast at this table's real-world scale (a manufacturer's lot
    // history is thousands, not millions, of rows). The 2000-row window means grouping
    // only covers the most recent ~2000 lots; older history still lists fine ungrouped
    // further down once paginated past, it just won't be merged into its original batch.
    const rawLots = await this.productLotModel
      .find(filter)
      .populate('supplier')
      .populate('createdBy', 'fullName username')
      .sort({ createdAt: -1 })
      .limit(2000)
      .exec();

    const groups = new Map<string, ProductLotBatchGroup>();
    for (const lot of rawLots) {
      const key = lot.batchNumber || lot._id.toString();
      const existing = groups.get(key);
      if (existing) {
        existing.itemCount += 1;
        existing.totalSum += lot.totalCost;
        if (lot.createdAt < existing.createdAt) existing.createdAt = lot.createdAt;
      } else {
        groups.set(key, {
          batchNumber: key,
          createdAt: lot.createdAt,
          supplier: lot.supplier,
          createdBy: lot.createdBy,
          itemCount: 1,
          totalSum: lot.totalCost,
          source: lot.source,
        });
      }
    }

    let items = Array.from(groups.values());
    items.sort(
      (a, b) =>
        (sortOrder === 'asc' ? 1 : -1) *
        (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    );

    const total = items.length;
    const skip = (page - 1) * limit;
    items = items.slice(skip, skip + limit);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /** Every lot sharing a batchNumber, or — for legacy/ungrouped lots — the single lot
   *  matching that id. Returns lots sorted oldest-first (creation order within the batch). */
  private async findLotsForBatch(key: string): Promise<ProductLotDocument[]> {
    let lots = await this.productLotModel
      .find({ batchNumber: key })
      .populate({ path: 'product', populate: { path: 'baseUnit' } })
      .populate('unit')
      .populate('purchaseUnit')
      .populate('supplier')
      .populate('createdBy', 'fullName username')
      .sort({ createdAt: 1 })
      .exec();

    if (lots.length === 0 && Types.ObjectId.isValid(key)) {
      const single = await this.productLotModel
        .findOne({ _id: key, batchNumber: { $exists: false } })
        .populate({ path: 'product', populate: { path: 'baseUnit' } })
        .populate('unit')
        .populate('purchaseUnit')
        .populate('supplier')
        .populate('createdBy', 'fullName username')
        .exec();
      if (single) lots = [single];
    }

    return lots;
  }

  async findBatchDetail(key: string) {
    const lots = await this.findLotsForBatch(key);
    if (lots.length === 0) {
      throw new NotFoundException(`Kirim hujjati "${key}" topilmadi`);
    }

    return {
      batchNumber: key,
      createdAt: lots[0].createdAt,
      supplier: lots[0].supplier,
      createdBy: lots[0].createdBy,
      notes: lots[0].notes,
      items: lots,
    };
  }

  async updateBatch(
    key: string,
    dto: UpdateProductLotBatchDto,
    userId: string,
  ): Promise<ReturnType<ProductLotsService['findBatchDetail']>> {
    const existingLots = await this.findLotsForBatch(key);
    if (existingLots.length === 0) {
      throw new NotFoundException(`Kirim hujjati "${key}" topilmadi`);
    }

    const supplierId = existingLots[0].supplier ? this.toIdString(existingLots[0].supplier) : undefined;

    const oldTotal = existingLots.reduce((sum, lot) => sum + lot.totalCost, 0);
    const byId = new Map(existingLots.map((lot) => [lot._id.toString(), lot]));
    const touchedIds = new Set<string>();

    let newTotal = 0;

    // 1) Existing lines: apply allowed edits (quantity/unit only if nothing consumed yet).
    for (const item of dto.items) {
      if (!item._id) continue;
      const lot = byId.get(item._id);
      if (!lot) {
        throw new BadRequestException(
          `"${item._id}" ushbu kirim hujjatiga tegishli emas`,
        );
      }
      touchedIds.add(item._id);

      // `lot.unit`/`lot.product` are populated documents here (findLotsForBatch populates
      // them for the detail view), so their raw id must be unwrapped via `._id` — comparing
      // the populated object directly against the plain id string in the payload would
      // always mismatch.
      const lotUnitId = this.toIdString(lot.unit);
      const lotProductId = this.toIdString(lot.product);

      const isUntouched = lot.quantityRemaining === lot.quantity;
      const wantsQuantityChange = item.quantity !== lot.quantity || item.unit !== lotUnitId;

      if (wantsQuantityChange && !isUntouched) {
        throw new BadRequestException(
          `"${lot.lotNumber}" allaqachon qisman sarflangan — uning miqdorini o'zgartirib bo'lmaydi`,
        );
      }

      if (wantsQuantityChange && isUntouched) {
        const product = await this.productsService.findById(lotProductId);
        const baseUnitId = (product.baseUnit as any)?._id
          ? (product.baseUnit as any)._id.toString()
          : product.baseUnit.toString();

        let quantity = item.quantity;
        let unitCost = item.unitCost;
        let purchaseQuantity: number | undefined;
        let purchaseUnit: string | undefined;

        if (item.unit !== baseUnitId) {
          purchaseQuantity = item.quantity;
          purchaseUnit = item.unit;
          quantity = await this.unitsService.convert(item.unit, baseUnitId, item.quantity);
          unitCost = (item.quantity * item.unitCost) / quantity;
        }

        const stockDelta = quantity - lot.quantity;
        if (stockDelta !== 0) {
          await this.productsService.updateStock(lotProductId, stockDelta);
        }

        lot.quantity = quantity;
        lot.unit = baseUnitId as any;
        lot.quantityRemaining = quantity;
        lot.purchaseQuantity = purchaseQuantity as any;
        lot.purchaseUnit = purchaseUnit as any;
        lot.unitCost = unitCost;
        lot.totalCost = quantity * unitCost;
      } else {
        // Quantity unchanged (or locked because it's been consumed) — only the cost can move.
        lot.unitCost = item.unitCost;
        lot.totalCost = lot.quantity * item.unitCost;
      }

      if (dto.notes !== undefined) lot.notes = dto.notes;
      await lot.save();
      newTotal += lot.totalCost;

      if (item.sellPrice !== undefined && item.sellPrice !== null) {
        await this.productsService.update(lotProductId, { price: item.sellPrice } as any);
      }
    }

    // Any existing line the payload didn't mention is left as-is (no delete support yet).
    for (const lot of existingLots) {
      if (!touchedIds.has(lot._id.toString())) {
        newTotal += lot.totalCost;
      }
    }

    // 2) New lines.
    const newItems = dto.items.filter((item) => !item._id);
    for (const item of newItems) {
      if (!item.product) {
        throw new BadRequestException("Yangi qator uchun mahsulot tanlanishi shart");
      }
      const c = await this.computeLotLine({
        product: item.product,
        quantity: item.quantity,
        unit: item.unit,
        unitCost: item.unitCost,
      });
      const lotNumber = await this.generateLotNumber();

      await this.productsService.updateStock(c.product._id.toString(), c.quantity);

      const lot = new this.productLotModel({
        product: item.product,
        lotNumber,
        batchNumber: existingLots[0].batchNumber || key,
        quantity: c.quantity,
        unit: c.baseUnitId,
        unitCost: c.unitCost,
        totalCost: c.totalCost,
        quantityRemaining: c.quantity,
        source: 'PURCHASE',
        purchaseQuantity: c.purchaseQuantity,
        purchaseUnit: c.purchaseUnit,
        supplier: supplierId,
        notes: dto.notes ?? existingLots[0].notes,
        createdBy: userId,
      });
      await lot.save();
      newTotal += c.totalCost;

      if (item.sellPrice !== undefined && item.sellPrice !== null) {
        await this.productsService.update(item.product, { price: item.sellPrice } as any);
      }
    }

    // 3) Reconcile supplier debt for the difference, plus any extra cash paid right now.
    if (supplierId) {
      const delta = newTotal - oldTotal;
      if (delta !== 0) {
        await this.suppliersService.updateDebt(supplierId, delta);
      }
      if (dto.additionalPaidAmount && dto.additionalPaidAmount > 0) {
        await this.suppliersService.createPayment(
          {
            supplier: supplierId,
            amount: dto.additionalPaidAmount,
            type: 'CASH',
            notes: `Kirim hujjati (${key}) uchun qo'shimcha naqd to'lov`,
          },
          userId,
        );
      }
    } else if (dto.additionalPaidAmount && dto.additionalPaidAmount > 0) {
      throw new BadRequestException(
        "Naqd to'lov qilish uchun bu hujjatda yetkazib beruvchi bo'lishi kerak",
      );
    }

    return this.findBatchDetail(key);
  }
}
