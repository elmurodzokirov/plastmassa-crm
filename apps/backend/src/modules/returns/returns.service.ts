import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Return, ReturnDocument } from './schemas/return.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import {
  StockMovement,
  StockMovementDocument,
} from '../stock/schemas/stock-movement.schema';
import { CreateReturnDto } from './dto/create-return.dto';
import { QueryReturnDto } from './dto/query-return.dto';
import { ProductsService } from '../products/products.service';
import { CustomersService } from '../customers/customers.service';
import {
  ProductLotsService,
  LotConsumptionRecord,
} from '../product-lots/product-lots.service';

@Injectable()
export class ReturnsService {
  constructor(
    @InjectModel(Return.name)
    private readonly returnModel: Model<ReturnDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(StockMovement.name)
    private readonly stockMovementModel: Model<StockMovementDocument>,
    private readonly productsService: ProductsService,
    private readonly customersService: CustomersService,
    private readonly productLotsService: ProductLotsService,
  ) {}

  async create(
    dto: CreateReturnDto,
    userId: string,
  ): Promise<ReturnDocument> {
    if (!dto.items.length) {
      throw new BadRequestException(
        'Qaytarishda kamida bitta mahsulot bo\'lishi kerak',
      );
    }

    if (!dto.order) {
      return this.createFromCustomer(dto, userId);
    }

    const order = await this.orderModel.findById(dto.order).exec();

    if (!order) {
      throw new NotFoundException(`Order with ID "${dto.order}" not found`);
    }

    if (order.status === 'CANCELLED') {
      throw new BadRequestException(
        'Bekor qilingan buyurtma uchun qaytarish yaratib bo\'lmaydi',
      );
    }

    const existingReturns = await this.returnModel
      .find({
        order: dto.order,
        status: { $in: ['PENDING', 'APPROVED'] },
      })
      .exec();

    const returnedQuantityByKey = new Map<string, number>();
    const returnedLotsByKey = new Map<string, Map<string, number>>();

    for (const existingReturn of existingReturns) {
      for (const item of existingReturn.items) {
        const key = this.getItemKey(item.product, item.unit);
        returnedQuantityByKey.set(
          key,
          (returnedQuantityByKey.get(key) || 0) + item.quantity,
        );

        const lotQuantities = returnedLotsByKey.get(key) || new Map<string, number>();
        for (const consumption of item.lotConsumptions || []) {
          lotQuantities.set(
            consumption.lot.toString(),
            (lotQuantities.get(consumption.lot.toString()) || 0) +
              consumption.quantity,
          );
        }
        returnedLotsByKey.set(key, lotQuantities);
      }
    }

    const orderItems = new Map<string, any>();
    for (const orderItem of order.items as any[]) {
      orderItems.set(this.getItemKey(orderItem.product, orderItem.unit), orderItem);
    }

    const returnItems = [];
    let totalAmount = 0;

    for (const item of dto.items) {
      const key = this.getItemKey(item.product, item.unit);
      const orderItem = orderItems.get(key);

      if (!orderItem) {
        throw new BadRequestException(
          'Qaytarilayotgan mahsulot buyurtmada topilmadi',
        );
      }

      const alreadyReturnedQuantity = returnedQuantityByKey.get(key) || 0;
      const remainingQuantity = orderItem.quantity - alreadyReturnedQuantity;

      if (item.quantity > remainingQuantity) {
        throw new BadRequestException(
          'Qaytarish miqdori sotilgan miqdordan oshib ketmoqda',
        );
      }

      const product = await this.productsService.findById(
        this.getDocumentId(orderItem.product),
      );
      const baseUnitId = orderItem.baseUnit
        ? this.getDocumentId(orderItem.baseUnit)
        : this.getDocumentId(product.baseUnit);
      const baseUnitName =
        orderItem.baseUnitName || this.getUnitName(product.baseUnit);
      const baseQuantity =
        typeof orderItem.baseQuantity === 'number' && orderItem.baseQuantity > 0
          ? (orderItem.baseQuantity / orderItem.quantity) * item.quantity
          : this.calculateBaseQuantity(product, item.unit, item.quantity);

      const lotConsumptions = this.allocateReturnConsumptions(
        orderItem.lotConsumptions || [],
        returnedLotsByKey.get(key) || new Map<string, number>(),
        baseQuantity,
      );
      const total = item.quantity * orderItem.price;

      returnItems.push({
        product: this.getDocumentId(orderItem.product),
        productName: orderItem.productName,
        unit: this.getDocumentId(orderItem.unit),
        unitName: orderItem.unitName,
        quantity: item.quantity,
        baseQuantity,
        baseUnit: baseUnitId,
        baseUnitName,
        price: orderItem.price,
        total,
        lotConsumptions,
      });

      totalAmount += total;
    }

    const returnDoc = new this.returnModel({
      order: dto.order,
      customer: order.customer,
      items: returnItems,
      reason: dto.reason,
      totalAmount,
      status: 'PENDING',
      createdBy: userId,
    });

    const savedReturn = await returnDoc.save();
    return this.findById(savedReturn._id.toString());
  }

  // A return not tied to any specific order — the customer and returned
  // products/quantities/prices are entered freely (mirrors "Yangi sotuv" cart
  // building), instead of being validated against one order's line items.
  private async createFromCustomer(
    dto: CreateReturnDto,
    userId: string,
  ): Promise<ReturnDocument> {
    if (!dto.customer) {
      throw new BadRequestException('Mijozni tanlang');
    }

    // Validates the customer exists.
    await this.customersService.findById(dto.customer);

    const returnItems = [];
    let totalAmount = 0;

    for (const item of dto.items) {
      if (item.price === undefined || item.price === null) {
        throw new BadRequestException(
          'Har bir mahsulot uchun narx ko\'rsatilishi kerak',
        );
      }

      const product = await this.productsService.findById(item.product);
      const baseUnitId = this.getDocumentId(product.baseUnit);
      const baseUnitName = this.getUnitName(product.baseUnit);
      const baseQuantity = this.calculateBaseQuantity(
        product,
        item.unit,
        item.quantity,
      );
      const unitName = this.resolveUnitName(product, item.unit);
      const total = item.quantity * item.price;

      returnItems.push({
        product: this.getDocumentId((product as any)._id),
        productName: product.name,
        unit: item.unit,
        unitName,
        quantity: item.quantity,
        baseQuantity,
        baseUnit: baseUnitId,
        baseUnitName,
        price: item.price,
        total,
        lotConsumptions: [],
      });

      totalAmount += total;
    }

    if (dto.refundAmount !== undefined && dto.refundAmount > totalAmount) {
      throw new BadRequestException(
        'Qaytarilgan pul summadan katta bo\'lishi mumkin emas',
      );
    }

    const returnDoc = new this.returnModel({
      customer: dto.customer,
      items: returnItems,
      reason: dto.reason,
      totalAmount,
      refundAmount: dto.refundAmount || 0,
      status: 'PENDING',
      createdBy: userId,
    });

    const savedReturn = await returnDoc.save();
    return this.findById(savedReturn._id.toString());
  }

  async findAll(query: QueryReturnDto) {
    const { page = 1, limit = 20, order, status, dateFrom, dateTo } = query;

    const filter: Record<string, unknown> = {};

    if (order) {
      filter.order = order;
    }

    if (status) {
      filter.status = status;
    }

    if (dateFrom || dateTo) {
      const createdAt: Record<string, Date> = {};
      if (dateFrom) {
        createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        createdAt.$lte = endDate;
      }
      filter.createdAt = createdAt;
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.returnModel
        .find(filter)
        .populate('order')
        .populate('customer')
        .populate('items.product')
        .populate('items.unit')
        .populate('items.baseUnit')
        .populate('createdBy', 'fullName username')
        .populate('approvedBy', 'fullName username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.returnModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<ReturnDocument> {
    const returnDoc = await this.returnModel
      .findById(id)
      .populate('order')
      .populate('customer')
      .populate('items.product')
      .populate('items.unit')
      .populate('items.baseUnit')
      .populate('createdBy', 'fullName username')
      .populate('approvedBy', 'fullName username')
      .exec();

    if (!returnDoc) {
      throw new NotFoundException(`Return with ID "${id}" not found`);
    }

    return returnDoc;
  }

  async approve(id: string, userId: string): Promise<ReturnDocument> {
    const returnDoc = await this.returnModel.findById(id).exec();

    if (!returnDoc) {
      throw new NotFoundException(`Return with ID "${id}" not found`);
    }

    if (returnDoc.status !== 'PENDING') {
      throw new BadRequestException('Only PENDING returns can be approved');
    }

    if (returnDoc.order) {
      await this.approveOrderReturn(returnDoc, userId);
    } else {
      await this.approveCustomerReturn(returnDoc, userId);
    }

    returnDoc.status = 'APPROVED';
    returnDoc.approvedBy = userId as any;
    returnDoc.approvedAt = new Date();
    await returnDoc.save();

    return this.findById(id);
  }

  private async approveOrderReturn(
    returnDoc: ReturnDocument,
    userId: string,
  ): Promise<void> {
    const order = await this.orderModel.findById(returnDoc.order).exec();
    if (!order) {
      throw new NotFoundException('Qaytarish uchun buyurtma topilmadi');
    }

    for (const item of returnDoc.items as any[]) {
      const productId = this.getDocumentId(item.product);
      const baseQuantity =
        typeof item.baseQuantity === 'number' ? item.baseQuantity : item.quantity;

      await this.productsService.updateStock(productId, baseQuantity);

      if (Array.isArray(item.lotConsumptions) && item.lotConsumptions.length > 0) {
        await this.productLotsService.restoreConsumptions(item.lotConsumptions);
      } else {
        await this.productLotsService.restoreFIFO(productId, baseQuantity);
      }
    }

    await this.persistStockMovements(returnDoc, userId);

    if (order.paymentType === 'DEBT') {
      const customer = await this.customersService.findById(
        order.customer.toString(),
      );
      const approvedReturnsTotal = await this.getApprovedReturnTotal(
        order._id.toString(),
      );
      const remainingOrderDebt = Math.max(
        order.totalAmount - order.paidAmount - approvedReturnsTotal,
        0,
      );
      const debtReduction = Math.min(
        returnDoc.totalAmount,
        remainingOrderDebt,
        Math.max(customer.currentDebt, 0),
      );

      if (debtReduction > 0) {
        await this.customersService.updateDebt(
          order.customer.toString(),
          -debtReduction,
        );
      }
    }
  }

  // Order-independent "return from customer": there's no original order-line
  // lot-consumption history to restore, so restock via a fresh adjustment lot
  // instead (same pattern StockService uses for manual "IN" stock movements).
  // Money: `refundAmount` (cash handed back) is left as-is on the document —
  // FinanceService reads it directly for the Kassa feed. Whatever isn't
  // refunded in cash settles against the customer's account instead, which may
  // push currentDebt negative (a credit balance for future purchases).
  private async approveCustomerReturn(
    returnDoc: ReturnDocument,
    userId: string,
  ): Promise<void> {
    for (const item of returnDoc.items as any[]) {
      const productId = this.getDocumentId(item.product);
      const baseQuantity =
        typeof item.baseQuantity === 'number' ? item.baseQuantity : item.quantity;
      const product = await this.productsService.findById(productId);
      const unitCost = product.costPrice || (product as any).costPerUnit || 0;

      await this.productsService.updateStock(productId, baseQuantity);
      await this.productLotsService.createAdjustmentLot(
        productId,
        baseQuantity,
        this.getDocumentId(item.baseUnit),
        unitCost,
        userId,
        `Mijozdan qaytarish: ${returnDoc._id}`,
      );
    }

    await this.persistStockMovements(returnDoc, userId);

    const settleAmount = returnDoc.totalAmount - (returnDoc.refundAmount || 0);
    if (settleAmount > 0) {
      await this.customersService.updateDebt(
        returnDoc.customer.toString(),
        -settleAmount,
      );
    }
  }

  private async getApprovedReturnTotal(orderId: string): Promise<number> {
    const result = await this.returnModel
      .aggregate([
        { $match: { order: new Types.ObjectId(orderId), status: 'APPROVED' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ])
      .exec();

    return result.length > 0 ? result[0].total : 0;
  }

  private allocateReturnConsumptions(
    sourceConsumptions: LotConsumptionRecord[],
    alreadyReturnedByLot: Map<string, number>,
    baseQuantity: number,
  ): LotConsumptionRecord[] {
    if (!sourceConsumptions.length) {
      return [];
    }

    const allocations: LotConsumptionRecord[] = [];
    let remaining = baseQuantity;

    for (const consumption of [...sourceConsumptions].reverse()) {
      if (remaining <= 0) {
        break;
      }

      const alreadyReturned = alreadyReturnedByLot.get(consumption.lot) || 0;
      const available = consumption.quantity - alreadyReturned;

      if (available <= 0) {
        continue;
      }

      const quantity = Math.min(remaining, available);
      allocations.push({
        lot: consumption.lot,
        lotNumber: consumption.lotNumber,
        quantity,
        unitCost: consumption.unitCost,
        totalCost: quantity * consumption.unitCost,
      });
      remaining -= quantity;
    }

    if (remaining > 0) {
      throw new BadRequestException(
        'Qaytarish uchun lot qoldiqlari yetarli emas',
      );
    }

    return allocations;
  }

  private async persistStockMovements(
    returnDoc: ReturnDocument,
    userId: string,
  ): Promise<void> {
    try {
      const movements = (returnDoc.items as any[]).map((item) => ({
        type: 'IN',
        product: this.getDocumentId(item.product),
        quantity:
          typeof item.baseQuantity === 'number' ? item.baseQuantity : item.quantity,
        unit: item.baseUnit
          ? this.getDocumentId(item.baseUnit)
          : this.getDocumentId(item.unit),
        reason: `Qaytarish: ${returnDoc._id}`,
        reference: returnDoc._id.toString(),
        referenceModel: 'Return',
        createdBy: userId,
      }));

      await this.stockMovementModel.insertMany(movements);
    } catch (error) {
      console.error('Failed to persist return stock movements', error);
    }
  }

  private getItemKey(product: any, unit: any): string {
    return `${this.getDocumentId(product)}::${this.getDocumentId(unit)}`;
  }

  private getDocumentId(value: any): string {
    if (typeof value === 'string') {
      return value;
    }

    return value?._id?.toString() || value?.toString();
  }

  private getUnitName(unit: any): string {
    if (typeof unit === 'string') {
      return '';
    }

    return unit?.name || '';
  }

  private resolveUnitName(product: any, unitId: string): string {
    const baseUnitId = this.getDocumentId(product.baseUnit);
    if (unitId === baseUnitId) {
      return this.getUnitName(product.baseUnit);
    }

    const salesUnit = (product.salesUnits || []).find(
      (unit: any) => this.getDocumentId(unit.unit) === unitId,
    );

    return salesUnit ? this.getUnitName(salesUnit.unit) : '';
  }

  private calculateBaseQuantity(
    product: any,
    unitId: string,
    quantity: number,
  ): number {
    const baseUnitId = this.getDocumentId(product.baseUnit);
    if (unitId === baseUnitId) {
      return quantity;
    }

    const salesUnit = (product.salesUnits || []).find(
      (unit: any) => this.getDocumentId(unit.unit) === unitId,
    );

    if (!salesUnit) {
      throw new BadRequestException(
        'Tanlangan savdo birligi mahsulotga biriktirilmagan',
      );
    }

    return quantity * salesUnit.conversionFactor;
  }
}
