import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from './schemas/order.schema';
import {
  StockMovement,
  StockMovementDocument,
} from '../stock/schemas/stock-movement.schema';
import { Payment, PaymentDocument } from '../payments/schemas/payment.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { DeliverOrderDto } from './dto/deliver-order.dto';
import { CustomersService } from '../customers/customers.service';
import { ProductsService } from '../products/products.service';
import {
  ProductLotsService,
  LotConsumptionRecord,
} from '../product-lots/product-lots.service';

interface BuiltOrderItem {
  product: string;
  productName: string;
  unit: string;
  unitName: string;
  quantity: number;
  baseQuantity: number;
  baseUnit: string;
  baseUnitName: string;
  originalPrice: number;
  discountPercent: number;
  discountAmount: number;
  price: number;
  total: number;
  costPerUnit: number;
  totalCost: number;
  lotConsumptions: LotConsumptionRecord[];
}

interface BuildOrderItemsResult {
  items: BuiltOrderItem[];
  totalAmount: number;
  totalCost: number;
  reservations: Array<{
    productId: string;
    baseQuantity: number;
    lotConsumptions: LotConsumptionRecord[];
  }>;
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(StockMovement.name)
    private readonly stockMovementModel: Model<StockMovementDocument>,
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
    private readonly customersService: CustomersService,
    private readonly productsService: ProductsService,
    private readonly productLotsService: ProductLotsService,
  ) {}

  async create(
    createOrderDto: CreateOrderDto,
    userId: string,
  ): Promise<OrderDocument> {
    const { customer, items, paymentType, paidAmount = 0, notes, dueDate } =
      createOrderDto;

    if (!items.length) {
      throw new BadRequestException(
        'Buyurtmada kamida bitta mahsulot bo\'lishi kerak',
      );
    }

    const customerDoc = await this.customersService.findById(customer);
    const orderNumber = await this.generateOrderNumber();

    let buildResult: BuildOrderItemsResult | null = null;
    let debtApplied = 0;

    try {
      buildResult = await this.buildOrderItems(items);

      const initialPaidAmount = this.normalizeInitialPaidAmount(
        paymentType,
        buildResult.totalAmount,
        paidAmount,
      );
      const debtAmount =
        paymentType === 'DEBT'
          ? Math.max(buildResult.totalAmount - initialPaidAmount, 0)
          : 0;

      this.ensureDebtLimit(
        customerDoc.currentDebt,
        customerDoc.debtLimit,
        debtAmount,
      );

      if (debtAmount > 0) {
        await this.customersService.updateDebt(customer, debtAmount);
        debtApplied = debtAmount;
      }

      const order = new this.orderModel({
        orderNumber,
        customer,
        items: buildResult.items,
        totalAmount: buildResult.totalAmount,
        initialPaidAmount,
        paidAmount: initialPaidAmount,
        totalCost: Math.round(buildResult.totalCost),
        grossProfit:
          buildResult.totalAmount - Math.round(buildResult.totalCost),
        status: 'PENDING',
        paymentType,
        notes,
        ...(dueDate && { dueDate: new Date(dueDate) }),
        createdBy: userId,
      });

      const savedOrder = await order.save();

      await this.persistStockMovements(
        buildResult.items,
        'OUT',
        `Buyurtma: ${orderNumber}`,
        savedOrder._id.toString(),
        userId,
      );

      return this.findById(savedOrder._id.toString());
    } catch (error) {
      if (debtApplied > 0) {
        await this.customersService.updateDebt(customer, -debtApplied);
      }
      if (buildResult) {
        await this.rollbackReservedInventory(buildResult.reservations);
      }
      throw error;
    }
  }

  async update(
    id: string,
    dto: UpdateOrderDto,
    userId: string,
  ): Promise<OrderDocument> {
    const order = await this.orderModel.findById(id).exec();

    if (!order) {
      throw new NotFoundException('Buyurtma topilmadi');
    }

    if (order.status !== 'PENDING') {
      throw new BadRequestException(
        'Faqat kutilayotgan buyurtmalarni tahrirlash mumkin',
      );
    }

    const paymentTotal = await this.getOrderPaymentTotal(id);
    const currentInitialPaidAmount = this.getInitialPaidAmount(
      order,
      paymentTotal,
    );
    const financialChangeRequested =
      dto.items !== undefined ||
      dto.paymentType !== undefined ||
      dto.paidAmount !== undefined;

    if (paymentTotal > 0 && financialChangeRequested) {
      throw new BadRequestException(
        'Buyurtmaga to\'lov qo\'shilgandan keyin mahsulot yoki to\'lov qismini tahrirlab bo\'lmaydi',
      );
    }

    const previousState = {
      items: [...(order.items as any[])],
      totalAmount: order.totalAmount,
      totalCost: order.totalCost,
      grossProfit: order.grossProfit,
      paymentType: order.paymentType,
      paidAmount: order.paidAmount,
      initialPaidAmount: currentInitialPaidAmount,
      notes: order.notes,
      dueDate: order.dueDate,
    };

    let buildResult: BuildOrderItemsResult | null = null;
    let releasedOldItems = false;
    let debtDeltaApplied = 0;

    try {
      if (dto.items) {
        if (!dto.items.length) {
          throw new BadRequestException(
            'Buyurtmada kamida bitta mahsulot bo\'lishi kerak',
          );
        }

        await this.releaseOrderItems(previousState.items);
        releasedOldItems = true;

        buildResult = await this.buildOrderItems(dto.items);
        order.items = buildResult.items as any;
        order.totalAmount = buildResult.totalAmount;
        order.totalCost = Math.round(buildResult.totalCost);
        order.grossProfit =
          buildResult.totalAmount - Math.round(buildResult.totalCost);
      }

      const nextPaymentType = dto.paymentType || order.paymentType;
      const nextInitialPaidAmount = this.normalizeInitialPaidAmount(
        nextPaymentType,
        order.totalAmount,
        dto.paidAmount !== undefined
          ? dto.paidAmount
          : previousState.initialPaidAmount,
      );
      const nextPaidAmount = nextInitialPaidAmount + paymentTotal;

      if (nextPaidAmount > order.totalAmount) {
        throw new BadRequestException(
          'To\'langan summa buyurtma summasidan katta bo\'lishi mumkin emas',
        );
      }

      const oldDebt =
        previousState.paymentType === 'DEBT'
          ? Math.max(previousState.totalAmount - previousState.paidAmount, 0)
          : 0;
      const newDebt =
        nextPaymentType === 'DEBT'
          ? Math.max(order.totalAmount - nextPaidAmount, 0)
          : 0;

      const customerDoc = await this.customersService.findById(
        order.customer.toString(),
      );
      const projectedDebtBase = customerDoc.currentDebt - oldDebt;

      this.ensureDebtLimit(projectedDebtBase, customerDoc.debtLimit, newDebt);

      const debtDelta = newDebt - oldDebt;
      if (debtDelta !== 0) {
        await this.customersService.updateDebt(order.customer.toString(), debtDelta);
        debtDeltaApplied = debtDelta;
      }

      order.paymentType = nextPaymentType as any;
      order.initialPaidAmount = nextInitialPaidAmount;
      order.paidAmount = nextPaidAmount;

      if (dto.notes !== undefined) {
        order.notes = dto.notes;
      }

      if (dto.dueDate !== undefined) {
        order.dueDate = new Date(dto.dueDate);
      }

      await order.save();
    } catch (error) {
      if (debtDeltaApplied !== 0) {
        await this.customersService.updateDebt(
          order.customer.toString(),
          -debtDeltaApplied,
        );
      }

      if (buildResult) {
        await this.rollbackReservedInventory(buildResult.reservations);
      }

      if (releasedOldItems) {
        await this.reapplyReleasedItems(previousState.items);
      }

      throw error;
    }

    if (buildResult) {
      await this.persistStockMovements(
        previousState.items,
        'IN',
        `Buyurtma tahrirlandi (qaytarildi): ${order.orderNumber}`,
        order._id.toString(),
        userId,
      );
      await this.persistStockMovements(
        buildResult.items,
        'OUT',
        `Buyurtma tahrirlandi: ${order.orderNumber}`,
        order._id.toString(),
        userId,
      );
    }

    return this.findById(id);
  }

  async findAll(query: QueryOrderDto) {
    const {
      page = 1,
      limit = 20,
      search,
      customer,
      status,
      paymentType,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const filter: Record<string, unknown> = {};

    if (search) {
      filter.orderNumber = { $regex: search, $options: 'i' };
    }

    if (customer) {
      filter.customer = customer;
    }

    if (status) {
      filter.status = status;
    }

    if (paymentType) {
      filter.paymentType = paymentType;
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
    const sort: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === 'asc' ? 1 : -1,
    };

    const [items, total] = await Promise.all([
      this.orderModel
        .find(filter)
        .populate('customer')
        .populate('createdBy', 'fullName username')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.orderModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<OrderDocument> {
    const order = await this.orderModel
      .findById(id)
      .populate('customer')
      .populate('items.product')
      .populate('items.unit')
      .populate('items.baseUnit')
      .populate('createdBy', 'fullName username')
      .exec();

    if (!order) {
      throw new NotFoundException(`Order with ID "${id}" not found`);
    }

    return order;
  }

  async updateStatus(
    id: string,
    updateOrderStatusDto: UpdateOrderStatusDto,
    userId: string,
  ): Promise<OrderDocument> {
    const order = await this.orderModel.findById(id).exec();

    if (!order) {
      throw new NotFoundException(`Order with ID "${id}" not found`);
    }

    if (order.status === 'CANCELLED') {
      throw new BadRequestException(
        'Bekor qilingan buyurtma statusini o\'zgartirib bo\'lmaydi',
      );
    }

    if (updateOrderStatusDto.status === 'CANCELLED') {
      if ((order.paidAmount || 0) > 0) {
        throw new BadRequestException(
          'To\'lov qabul qilingan buyurtmani bekor qilib bo\'lmaydi',
        );
      }

      const debtAmount =
        order.paymentType === 'DEBT'
          ? Math.max(order.totalAmount - order.paidAmount, 0)
          : 0;

      try {
        await this.releaseOrderItems(order.items as any[]);

        if (debtAmount > 0) {
          await this.customersService.updateDebt(
            order.customer.toString(),
            -debtAmount,
          );
        }

        order.status = 'CANCELLED';
        await order.save();
      } catch (error) {
        await this.reapplyReleasedItems(order.items as any[]);

        if (debtAmount > 0) {
          await this.customersService.updateDebt(
            order.customer.toString(),
            debtAmount,
          );
        }

        throw error;
      }

      await this.persistStockMovements(
        order.items as any[],
        'IN',
        `Buyurtma bekor qilindi: ${order.orderNumber}`,
        order._id.toString(),
        userId,
      );
    } else {
      order.status = updateOrderStatusDto.status;
    }

    if (
      updateOrderStatusDto.status === 'CONFIRMED' &&
      !order.invoiceNumber
    ) {
      order.invoiceNumber = await this.generateInvoiceNumber();
      await order.save();
    }

    return this.findById(id);
  }

  async getOrdersByCustomer(customerId: string, query: QueryOrderDto) {
    return this.findAll({ ...query, customer: customerId });
  }

  async generateOrderNumber(): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    const prefix = `ORD-${dateStr}-`;

    const lastOrder = await this.orderModel
      .findOne({ orderNumber: { $regex: `^${prefix}` } })
      .sort({ orderNumber: -1 })
      .exec();

    let counter = 1;
    if (lastOrder) {
      const lastCounter = parseInt(lastOrder.orderNumber.split('-')[2], 10);
      counter = lastCounter + 1;
    }

    return `${prefix}${String(counter).padStart(3, '0')}`;
  }

  async getOverdueDebts(): Promise<OrderDocument[]> {
    const now = new Date();

    return this.orderModel
      .find({
        paymentType: 'DEBT',
        status: { $ne: 'CANCELLED' },
        dueDate: { $lt: now, $ne: null },
        $expr: { $gt: ['$totalAmount', '$paidAmount'] },
      })
      .populate('customer', 'name phone currentDebt')
      .sort({ dueDate: 1 })
      .exec();
  }

  async markDelivered(id: string, dto: DeliverOrderDto): Promise<OrderDocument> {
    const order = await this.orderModel.findById(id).exec();

    if (!order) {
      throw new NotFoundException('Buyurtma topilmadi');
    }

    if (order.status === 'CANCELLED') {
      throw new BadRequestException(
        'Bekor qilingan buyurtmani topshirish mumkin emas',
      );
    }

    order.deliveredTo = dto.deliveredTo;
    order.deliveredAt = new Date();
    if (dto.deliveryNotes) {
      order.deliveryNotes = dto.deliveryNotes;
    }

    await order.save();
    return this.findById(id);
  }

  private async generateInvoiceNumber(): Promise<string> {
    const now = new Date();
    const datePrefix = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const lastOrder = await this.orderModel
      .findOne({ invoiceNumber: { $regex: `^${datePrefix}` } })
      .sort({ invoiceNumber: -1 })
      .exec();

    let counter = 1;
    if (lastOrder?.invoiceNumber) {
      const lastCounter = parseInt(
        lastOrder.invoiceNumber.split('-').pop() || '0',
        10,
      );
      counter = lastCounter + 1;
    }

    return `${datePrefix}-${String(counter).padStart(3, '0')}`;
  }

  async getCheckData(id: string): Promise<OrderDocument> {
    const order = await this.orderModel
      .findById(id)
      .populate('customer')
      .populate('items.product')
      .populate('items.unit')
      .populate('items.baseUnit')
      .populate('createdBy', 'fullName username')
      .exec();

    if (!order) {
      throw new NotFoundException(`Order with ID "${id}" not found`);
    }

    return order;
  }

  private async buildOrderItems(
    items: Array<Record<string, any>>,
  ): Promise<BuildOrderItemsResult> {
    const orderItems: BuiltOrderItem[] = [];
    const reservations: BuildOrderItemsResult['reservations'] = [];
    let totalAmount = 0;
    let totalCost = 0;

    try {
      for (const item of items) {
        const product = await this.productsService.findById(item.product);
        const productId = product._id.toString();
        const baseUnitId = this.getUnitId(product.baseUnit);
        const baseUnitName = this.getUnitName(product.baseUnit);
        const unitId = item.unit;
        const unitName = this.getOrderUnitName(product, unitId);
        const baseQuantity = this.calculateBaseQuantity(
          product,
          unitId,
          item.quantity,
        );
        const lotConsumptions = await this.productLotsService.consumeFIFO(
          productId,
          baseQuantity,
        );

        reservations.push({
          productId,
          baseQuantity,
          lotConsumptions,
        });

        await this.productsService.updateStock(productId, -baseQuantity);

        const originalPrice =
          item.price !== undefined
            ? item.price
            : this.getDefaultUnitPrice(product, unitId);
        const discountPercent = item.discountPercent || 0;
        const discountAmount =
          item.discountAmount !== undefined
            ? item.discountAmount
            : Math.round((originalPrice * discountPercent) / 100);
        const price = originalPrice - discountAmount;

        if (price < 0) {
          throw new BadRequestException(
            'Chegirmadan keyingi narx manfiy bo\'lishi mumkin emas',
          );
        }

        const lineTotal = item.quantity * price;
        const lineCost = lotConsumptions.reduce(
          (sum, consumption) => sum + consumption.totalCost,
          0,
        );

        orderItems.push({
          product: productId,
          productName: product.name,
          unit: unitId,
          unitName,
          quantity: item.quantity,
          baseQuantity,
          baseUnit: baseUnitId,
          baseUnitName,
          originalPrice,
          discountPercent,
          discountAmount,
          price,
          total: lineTotal,
          costPerUnit:
            item.quantity > 0 ? Math.round(lineCost / item.quantity) : 0,
          totalCost: Math.round(lineCost),
          lotConsumptions,
        });

        totalAmount += lineTotal;
        totalCost += lineCost;
      }
    } catch (error) {
      await this.rollbackReservedInventory(reservations);
      throw error;
    }

    return {
      items: orderItems,
      totalAmount,
      totalCost,
      reservations,
    };
  }

  private normalizeInitialPaidAmount(
    paymentType: string,
    totalAmount: number,
    paidAmount: number,
  ): number {
    if (paymentType === 'CASH' || paymentType === 'TRANSFER') {
      return totalAmount;
    }

    if (paidAmount < 0) {
      throw new BadRequestException(
        'To\'langan summa manfiy bo\'lishi mumkin emas',
      );
    }

    if (paidAmount > totalAmount) {
      throw new BadRequestException(
        'To\'langan summa buyurtma summasidan katta bo\'lishi mumkin emas',
      );
    }

    return paidAmount;
  }

  private ensureDebtLimit(
    currentDebt: number,
    debtLimit: number,
    newDebt: number,
  ): void {
    if (newDebt <= 0 || debtLimit <= 0) {
      return;
    }

    if (currentDebt + newDebt > debtLimit) {
      throw new BadRequestException('Mijozning qarz limiti oshib ketmoqda');
    }
  }

  private getInitialPaidAmount(
    order: OrderDocument,
    paymentTotal: number,
  ): number {
    if (typeof order.initialPaidAmount === 'number') {
      return order.initialPaidAmount;
    }

    return Math.max((order.paidAmount || 0) - paymentTotal, 0);
  }

  private async getOrderPaymentTotal(orderId: string): Promise<number> {
    const result = await this.paymentModel
      .aggregate([
        { $match: { order: new Types.ObjectId(orderId) } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ])
      .exec();

    return result.length > 0 ? result[0].total : 0;
  }

  private async rollbackReservedInventory(
    reservations: BuildOrderItemsResult['reservations'],
  ): Promise<void> {
    for (const reservation of [...reservations].reverse()) {
      await this.productsService.updateStock(
        reservation.productId,
        reservation.baseQuantity,
      );
      await this.productLotsService.restoreConsumptions(
        reservation.lotConsumptions,
      );
    }
  }

  private async releaseOrderItems(items: Array<Record<string, any>>): Promise<void> {
    for (const item of items) {
      const productId = this.getDocumentId(item.product);
      const baseQuantity = await this.getExistingBaseQuantity(item);

      await this.productsService.updateStock(productId, baseQuantity);

      if (Array.isArray(item.lotConsumptions) && item.lotConsumptions.length > 0) {
        await this.productLotsService.restoreConsumptions(item.lotConsumptions);
      } else {
        await this.productLotsService.restoreFIFO(productId, baseQuantity);
      }
    }
  }

  private async reapplyReleasedItems(
    items: Array<Record<string, any>>,
  ): Promise<void> {
    for (const item of items) {
      const productId = this.getDocumentId(item.product);
      const baseQuantity = await this.getExistingBaseQuantity(item);

      if (Array.isArray(item.lotConsumptions) && item.lotConsumptions.length > 0) {
        await this.productLotsService.consumeRecordedConsumptions(
          item.lotConsumptions,
        );
      } else {
        await this.productLotsService.consumeFIFO(productId, baseQuantity);
      }

      await this.productsService.updateStock(productId, -baseQuantity);
    }
  }

  private async persistStockMovements(
    items: Array<Record<string, any>>,
    type: 'IN' | 'OUT',
    reason: string,
    reference: string,
    userId: string,
  ): Promise<void> {
    try {
      const movements = await Promise.all(
        items.map(async (item) => ({
          type,
          product: this.getDocumentId(item.product),
          quantity: await this.getExistingBaseQuantity(item),
          unit: await this.getExistingBaseUnitId(item),
          reason,
          reference,
          referenceModel: 'Order',
          createdBy: userId,
        })),
      );

      await this.stockMovementModel.insertMany(movements);
    } catch (error) {
      console.error('Failed to persist stock movements for order', error);
    }
  }

  private getDefaultUnitPrice(product: any, unitId: string): number {
    const baseUnitId = this.getUnitId(product.baseUnit);
    if (unitId === baseUnitId) {
      return product.price;
    }

    const salesUnit = (product.salesUnits || []).find(
      (unit: any) => this.getUnitId(unit.unit) === unitId,
    );

    if (!salesUnit) {
      throw new BadRequestException('Mahsulot uchun tanlangan birlik topilmadi');
    }

    return salesUnit.price;
  }

  private getOrderUnitName(product: any, unitId: string): string {
    const baseUnitId = this.getUnitId(product.baseUnit);
    if (unitId === baseUnitId) {
      return this.getUnitName(product.baseUnit);
    }

    const salesUnit = (product.salesUnits || []).find(
      (unit: any) => this.getUnitId(unit.unit) === unitId,
    );

    if (!salesUnit) {
      throw new BadRequestException('Mahsulot uchun tanlangan birlik topilmadi');
    }

    return this.getUnitName(salesUnit.unit);
  }

  private calculateBaseQuantity(
    product: any,
    unitId: string,
    quantity: number,
  ): number {
    const baseUnitId = this.getUnitId(product.baseUnit);

    if (unitId === baseUnitId) {
      return quantity;
    }

    const salesUnit = (product.salesUnits || []).find(
      (unit: any) => this.getUnitId(unit.unit) === unitId,
    );

    if (!salesUnit) {
      throw new BadRequestException(
        'Tanlangan savdo birligi mahsulotga biriktirilmagan',
      );
    }

    return quantity * salesUnit.conversionFactor;
  }

  private async getExistingBaseQuantity(item: Record<string, any>): Promise<number> {
    if (typeof item.baseQuantity === 'number' && item.baseQuantity > 0) {
      return item.baseQuantity;
    }

    const product = await this.productsService.findById(this.getDocumentId(item.product));
    return this.calculateBaseQuantity(
      product,
      this.getDocumentId(item.unit),
      item.quantity,
    );
  }

  private async getExistingBaseUnitId(item: Record<string, any>): Promise<string> {
    if (item.baseUnit) {
      return this.getDocumentId(item.baseUnit);
    }

    const product = await this.productsService.findById(this.getDocumentId(item.product));
    return this.getUnitId(product.baseUnit);
  }

  private getDocumentId(value: any): string {
    if (typeof value === 'string') {
      return value;
    }

    return value?._id?.toString() || value?.toString();
  }

  private getUnitId(unit: any): string {
    if (typeof unit === 'string') {
      return unit;
    }

    return unit?._id?.toString() || unit?.toString();
  }

  private getUnitName(unit: any): string {
    if (typeof unit === 'string') {
      return '';
    }

    return unit?.name || '';
  }
}
