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
import { CreateProductionLogBatchDto } from './dto/create-production-log-batch.dto';
import { UpdateProductionLogBatchDto } from './dto/update-production-log-batch.dto';
import { QueryProductionLogBatchDto } from './dto/query-production-log-batch.dto';
import { ProductsService } from '../products/products.service';
import { ProductLotsService } from '../product-lots/product-lots.service';
import { RecipesService } from '../recipes/recipes.service';
import { MaterialsService } from '../materials/materials.service';
import { MaterialLotsService } from '../material-lots/material-lots.service';
import { UsersService } from '../users/users.service';

export interface BatchGroup {
  batchNumber: string;
  date: Date;
  worker: any;
  itemCount: number;
  totalQuantity: number;
  totalMaterialCost: number;
  createdAt: Date;
  productNames: string[];
  locked: boolean;
}

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
    private readonly usersService: UsersService,
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
        const lotConsumptions = await this.materialLotsService.consumeFIFO(m.material, m.quantity, {
          allowShortfall: true,
        });
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
      batchNumber: dto.batchNumber,
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

  // ── "Ishlab chiqarish hujjati" grouping ──────────────────────────────────────
  // Logs created together via createLogsBatch() share one batchNumber, so the
  // production list can group, view and edit them together as a single document.
  // Older logs (created before this field existed) have none — each of those is
  // treated as its own one-item "document", keyed by its own _id.

  async generateBatchNumber(): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const prefix = `ISHLAB-${year}${month}${day}-`;

    const lastBatch = await this.productionLogModel
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

  async createLogsBatch(
    dto: CreateProductionLogBatchDto,
    userId: string,
  ): Promise<ProductionLogDocument[]> {
    const batchNumber = await this.generateBatchNumber();
    const saved: ProductionLogDocument[] = [];

    for (const item of dto.items) {
      const log = await this.createLog(
        {
          product: item.product,
          date: dto.date,
          quantityProduced: item.quantityProduced,
          worker: dto.worker,
          notes: dto.notes,
          status: 'APPROVED',
          batchNumber,
        } as CreateProductionLogDto,
        userId,
      );
      saved.push(log);
    }

    return saved;
  }

  /** True when the ProductLot auto-created from this log has already been partially
   *  or fully consumed elsewhere — such a log's product/quantity can no longer be
   *  safely edited or removed without corrupting stock history. */
  private async isLogLocked(logId: string): Promise<boolean> {
    const lot = await this.productLotsService.findByProductionLog(logId);
    if (!lot) return false;
    return lot.quantityRemaining !== lot.quantity;
  }

  async findAllBatches(query: QueryProductionLogBatchDto) {
    const { page = 1, limit = 20, worker, search, dateFrom, dateTo, sortOrder = 'desc' } = query;

    const filter: any = {};
    if (worker) filter.worker = worker;
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = new Date(dateFrom);
      if (dateTo) filter.date.$lte = new Date(dateTo);
    }

    // Grouping is done in application code, mirroring the same approach used for
    // "Kirim hujjati" (product lot batches) — simple, correct, and plenty fast at
    // this table's real-world scale.
    const rawLogs = await this.productionLogModel
      .find(filter)
      .populate('worker', 'fullName username')
      .sort({ createdAt: -1 })
      .limit(2000)
      .exec();

    const groups = new Map<string, BatchGroup>();
    for (const log of rawLogs) {
      const key = log.batchNumber || log._id.toString();
      const existing = groups.get(key);
      if (existing) {
        existing.itemCount += 1;
        existing.totalQuantity += log.quantityProduced;
        existing.totalMaterialCost += log.totalMaterialCost;
        existing.productNames.push(log.productName);
        if (log.createdAt < existing.createdAt) existing.createdAt = log.createdAt;
      } else {
        groups.set(key, {
          batchNumber: key,
          date: log.date,
          worker: log.worker,
          itemCount: 1,
          totalQuantity: log.quantityProduced,
          totalMaterialCost: log.totalMaterialCost,
          createdAt: log.createdAt,
          productNames: [log.productName],
          locked: false,
        });
      }
    }

    let items = Array.from(groups.values());

    if (search) {
      const q = search.toLowerCase();
      items = items.filter((g) => g.productNames.some((n) => n.toLowerCase().includes(q)));
    }

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

  /** Every log sharing a batchNumber, or — for legacy/ungrouped logs — the single log
   *  matching that id. Returns logs sorted oldest-first (creation order within the doc). */
  private async findLogsForBatch(key: string): Promise<ProductionLogDocument[]> {
    let logs = await this.productionLogModel
      .find({ batchNumber: key })
      .populate('product')
      .populate('worker', 'fullName username')
      .populate('editHistory.user', 'fullName username')
      .sort({ createdAt: 1 })
      .exec();

    if (logs.length === 0 && Types.ObjectId.isValid(key)) {
      const single = await this.productionLogModel
        .findOne({ _id: key, batchNumber: { $exists: false } })
        .populate('product')
        .populate('worker', 'fullName username')
        .populate('editHistory.user', 'fullName username')
        .exec();
      if (single) logs = [single];
    }

    return logs;
  }

  async findBatchDetail(key: string) {
    const logs = await this.findLogsForBatch(key);
    if (logs.length === 0) {
      throw new NotFoundException(`Ishlab chiqarish hujjati "${key}" topilmadi`);
    }

    const items = await Promise.all(
      logs.map(async (log) => ({
        ...log.toObject(),
        locked: await this.isLogLocked(log._id.toString()),
      })),
    );

    const editHistory = logs
      .flatMap((log) =>
        (log.editHistory || []).map((h: any) => ({
          ...(h.toObject ? h.toObject() : h),
          productName: log.productName,
        })),
      )
      .sort((a: any, b: any) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime());

    return {
      batchNumber: logs[0].batchNumber || key,
      date: logs[0].date,
      worker: logs[0].worker,
      notes: logs[0].notes,
      items,
      editHistory,
    };
  }

  async updateBatch(
    key: string,
    dto: UpdateProductionLogBatchDto,
    userId: string,
    userName: string,
  ) {
    const existingLogs = await this.findLogsForBatch(key);
    if (existingLogs.length === 0) {
      throw new NotFoundException(`Ishlab chiqarish hujjati "${key}" topilmadi`);
    }
    const batchNumber = existingLogs[0].batchNumber || key;
    const byId = new Map(existingLogs.map((log) => [log._id.toString(), log]));
    const touchedIds = new Set<string>();
    const now = new Date();

    let newWorkerName: string | undefined;
    if (dto.worker) {
      const newWorkerUser = await this.usersService.findById(dto.worker);
      newWorkerName = newWorkerUser.fullName;
    }

    for (const item of dto.items) {
      if (item._id && byId.has(item._id)) {
        touchedIds.add(item._id);
        const log = byId.get(item._id)!;
        const locked = await this.isLogLocked(log._id.toString());
        const productChanged = item.product !== log.product.toString();
        const quantityChanged = item.quantityProduced !== log.quantityProduced;

        if ((productChanged || quantityChanged) && locked) {
          throw new BadRequestException(
            `"${log.productName}" qatori allaqachon sarflangan — mahsulot yoki miqdorini o'zgartirib bo'lmaydi`,
          );
        }

        if (productChanged || quantityChanged) {
          const oldProductId = log.product.toString();
          const oldProductName = log.productName;
          const oldQuantity = log.quantityProduced;

          // Reverse the original stock/lot impact of this line.
          await this.productsService.updateStock(oldProductId, -oldQuantity);
          await this.productLotsService.deleteByProductionLog(log._id.toString());
          await new this.stockMovementModel({
            type: 'OUT',
            product: oldProductId,
            quantity: oldQuantity,
            unit: log.unit,
            reason: `Tuzatish: "${oldProductName}" yozuvi bekor qilindi`,
            reference: log._id.toString(),
            referenceModel: 'ProductionLog',
            createdBy: userId,
          }).save();

          const newProduct = await this.productsService.findById(item.product);
          const fallbackCostPerUnit = newProduct.costPrice || newProduct.costPerUnit || 0;
          const computed = await this.computeProductionCost(
            item.product,
            item.quantityProduced,
            undefined,
            undefined,
            fallbackCostPerUnit,
          );
          const newProductUnitId = typeof newProduct.baseUnit === 'string'
            ? newProduct.baseUnit
            : (newProduct.baseUnit as any)._id?.toString() || newProduct.baseUnit;
          const newProductUnitName = typeof newProduct.baseUnit === 'object'
            ? (newProduct.baseUnit as any).name || ''
            : '';

          log.product = new Types.ObjectId(item.product);
          log.productName = newProduct.name;
          log.unit = new Types.ObjectId(newProductUnitId);
          log.unitName = newProductUnitName;
          log.quantityProduced = item.quantityProduced;
          log.materialsUsed = computed.materialsUsed;
          log.totalMaterialCost = computed.totalMaterialCost;
          log.costPerUnitProduced = computed.costPerUnitProduced;
          log.earnedAmount = item.quantityProduced * newProduct.price;
          log.pieceRateAmount = item.quantityProduced * ((newProduct as any).pieceRate || 0);

          await this.productsService.updateStock(item.product, item.quantityProduced);
          await this.productLotsService.createFromProduction(
            item.product,
            item.quantityProduced,
            newProductUnitId.toString(),
            log.costPerUnitProduced,
            log._id.toString(),
            userId,
          );
          await new this.stockMovementModel({
            type: 'IN',
            product: item.product,
            quantity: item.quantityProduced,
            unit: newProductUnitId,
            reason: `Tuzatish: ${newProduct.name}`,
            reference: log._id.toString(),
            referenceModel: 'ProductionLog',
            createdBy: userId,
          }).save();

          if (productChanged) {
            log.editHistory.push({
              user: new Types.ObjectId(userId),
              userName,
              changedAt: now,
              field: 'Mahsulot',
              oldValue: oldProductName,
              newValue: newProduct.name,
            } as any);
          }
          if (quantityChanged) {
            log.editHistory.push({
              user: new Types.ObjectId(userId),
              userName,
              changedAt: now,
              field: 'Miqdor',
              oldValue: String(oldQuantity),
              newValue: String(item.quantityProduced),
            } as any);
          }

          await this.updateProductCostPrice(oldProductId);
          if (oldProductId !== item.product) {
            await this.updateProductCostPrice(item.product);
          }
        }

        // Batch-level fields (worker/date/notes) apply to every line, and are
        // recorded on each line's own history so each document's story stays complete.
        if (dto.worker !== undefined && dto.worker !== log.worker.toString()) {
          const oldWorkerName = (log.worker as any)?.fullName || log.worker.toString();
          log.editHistory.push({
            user: new Types.ObjectId(userId),
            userName,
            changedAt: now,
            field: 'Ishchi',
            oldValue: oldWorkerName,
            newValue: newWorkerName || dto.worker,
          } as any);
          log.worker = new Types.ObjectId(dto.worker);
        }
        if (dto.date !== undefined) {
          const newDateObj = new Date(dto.date);
          if (newDateObj.getTime() !== new Date(log.date).getTime()) {
            log.editHistory.push({
              user: new Types.ObjectId(userId),
              userName,
              changedAt: now,
              field: 'Sana',
              oldValue: new Date(log.date).toISOString().slice(0, 10),
              newValue: newDateObj.toISOString().slice(0, 10),
            } as any);
            log.date = newDateObj;
          }
        }
        if (dto.notes !== undefined && dto.notes !== (log.notes || '')) {
          log.editHistory.push({
            user: new Types.ObjectId(userId),
            userName,
            changedAt: now,
            field: 'Izoh',
            oldValue: log.notes || '',
            newValue: dto.notes,
          } as any);
          log.notes = dto.notes;
        }

        await log.save();
      } else {
        // New line — create it fresh under the same document (batchNumber).
        const created = await this.createLog(
          {
            product: item.product,
            date: dto.date || existingLogs[0].date.toISOString(),
            quantityProduced: item.quantityProduced,
            worker: dto.worker || existingLogs[0].worker.toString(),
            notes: dto.notes !== undefined ? dto.notes : existingLogs[0].notes,
            status: 'APPROVED',
            batchNumber,
          } as CreateProductionLogDto,
          userId,
        );
        touchedIds.add(created._id.toString());
      }
    }

    // Lines dropped from the submitted list are removed — but only if nothing has
    // been consumed from their auto-created lot yet.
    for (const log of existingLogs) {
      const idStr = log._id.toString();
      if (touchedIds.has(idStr)) continue;

      const locked = await this.isLogLocked(idStr);
      if (locked) {
        throw new BadRequestException(
          `"${log.productName}" qatori allaqachon sarflangan — uni o'chirib bo'lmaydi`,
        );
      }

      await this.productsService.updateStock(log.product.toString(), -log.quantityProduced);
      await this.productLotsService.deleteByProductionLog(idStr);
      await new this.stockMovementModel({
        type: 'OUT',
        product: log.product.toString(),
        quantity: log.quantityProduced,
        unit: log.unit,
        reason: `Tuzatish: "${log.productName}" qatori o'chirildi`,
        reference: idStr,
        referenceModel: 'ProductionLog',
        createdBy: userId,
      }).save();
      await this.productionLogModel.deleteOne({ _id: idStr }).exec();
      await this.updateProductCostPrice(log.product.toString());
    }

    return this.findBatchDetail(batchNumber);
  }
}
