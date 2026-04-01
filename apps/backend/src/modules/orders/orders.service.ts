import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from './schemas/order.schema';
import { StockMovement, StockMovementDocument } from '../stock/schemas/stock-movement.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { DeliverOrderDto } from './dto/deliver-order.dto';
import { CustomersService } from '../customers/customers.service';
import { ProductsService } from '../products/products.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(StockMovement.name)
    private readonly stockMovementModel: Model<StockMovementDocument>,
    private readonly customersService: CustomersService,
    private readonly productsService: ProductsService,
  ) {}

  async create(
    createOrderDto: CreateOrderDto,
    userId: string,
  ): Promise<OrderDocument> {
    const { customer, items, paymentType, paidAmount = 0, notes, dueDate } = createOrderDto;

    // Validate customer exists
    await this.customersService.findById(customer);

    const orderNumber = await this.generateOrderNumber();

    const orderItems = [];
    let totalAmount = 0;
    let orderTotalCost = 0;

    for (const item of items) {
      const product = await this.productsService.findById(item.product);

      const productPopulated = await product.populate('baseUnit');

      const originalPrice = item.price !== undefined ? item.price : product.price;
      const discountPercent = item.discountPercent || 0;
      const discountAmount = item.discountAmount || Math.round(originalPrice * discountPercent / 100);
      const price = originalPrice - discountAmount;
      const total = item.quantity * price;

      let unitName = '';
      if (productPopulated.baseUnit && typeof productPopulated.baseUnit === 'object') {
        unitName = (productPopulated.baseUnit as any).name || '';
      }

      // Cost from product's costPrice
      const itemCostPerUnit = product.costPrice || product.costPerUnit || 0;
      const itemTotalCost = item.quantity * itemCostPerUnit;

      orderItems.push({
        product: product._id,
        productName: product.name,
        unit: item.unit,
        unitName: unitName,
        quantity: item.quantity,
        originalPrice,
        discountPercent,
        discountAmount,
        price: price,
        total: total,
        costPerUnit: Math.round(itemCostPerUnit),
        totalCost: Math.round(itemTotalCost),
      });

      totalAmount += total;
      orderTotalCost += itemTotalCost;

      // Decrement product stock
      await this.productsService.updateStock(item.product, -item.quantity);
    }

    const grossProfit = totalAmount - Math.round(orderTotalCost);

    if (paymentType === 'CASH' || paymentType === 'TRANSFER') {
      // For cash/transfer, paidAmount should equal totalAmount
      const orderPaidAmount = totalAmount;

      const order = new this.orderModel({
        orderNumber,
        customer,
        items: orderItems,
        totalAmount,
        paidAmount: orderPaidAmount,
        totalCost: Math.round(orderTotalCost),
        grossProfit,
        status: 'PENDING',
        paymentType,
        notes,
        ...(dueDate && { dueDate: new Date(dueDate) }),
        createdBy: userId,
      });

      const savedOrder = await order.save();

      // Create StockMovement audit records
      await this.createOrderStockMovements(savedOrder, userId);

      return savedOrder;
    }

    // paymentType === 'DEBT'
    const debtAmount = totalAmount - paidAmount;

    if (debtAmount > 0) {
      await this.customersService.updateDebt(customer, debtAmount);
    }

    const order = new this.orderModel({
      orderNumber,
      customer,
      items: orderItems,
      totalAmount,
      paidAmount,
      totalCost: Math.round(orderTotalCost),
      grossProfit,
      status: 'PENDING',
      paymentType,
      notes,
      ...(dueDate && { dueDate: new Date(dueDate) }),
      createdBy: userId,
    });

    const savedOrder = await order.save();

    // Create StockMovement audit records
    await this.createOrderStockMovements(savedOrder, userId);

    return savedOrder;
  }

  async update(
    id: string,
    dto: UpdateOrderDto,
    userId: string,
  ): Promise<OrderDocument> {
    const order = await this.orderModel.findById(id);
    if (!order) throw new NotFoundException('Buyurtma topilmadi');
    if (order.status !== 'PENDING') {
      throw new BadRequestException(
        'Faqat kutilayotgan buyurtmalarni tahrirlash mumkin',
      );
    }

    // 1. Reverse old stock for each old item
    for (const oldItem of order.items) {
      await this.productsService.updateStock(
        oldItem.product.toString(),
        oldItem.quantity,
      );

      // Create IN stock movement for reversal
      await new this.stockMovementModel({
        type: 'IN',
        product: oldItem.product,
        quantity: oldItem.quantity,
        unit: oldItem.unit,
        reason: `Buyurtma tahrirlandi (qaytarildi): ${order.orderNumber}`,
        reference: order._id.toString(),
        referenceModel: 'Order',
        createdBy: userId,
      }).save();
    }

    // 2. Reverse old debt if was DEBT
    if (order.paymentType === 'DEBT') {
      const oldDebt = order.totalAmount - order.paidAmount;
      if (oldDebt > 0) {
        await this.customersService.updateDebt(
          order.customer.toString(),
          -oldDebt,
        );
      }
    }

    // 3. Process new items (same logic as create)
    if (dto.items) {
      const orderItems = [];
      let totalAmount = 0;
      let orderTotalCost = 0;

      for (const item of dto.items) {
        const product = await this.productsService.findById(item.product);
        const productPopulated = await product.populate('baseUnit');

        const originalPrice =
          item.price !== undefined ? item.price : product.price;
        const discountPercent = item.discountPercent || 0;
        const discountAmount =
          item.discountAmount ||
          Math.round((originalPrice * discountPercent) / 100);
        const itemPrice = originalPrice - discountAmount;
        const itemTotal = item.quantity * itemPrice;

        let unitName = '';
        if (
          productPopulated.baseUnit &&
          typeof productPopulated.baseUnit === 'object'
        ) {
          unitName = (productPopulated.baseUnit as any).name || '';
        }

        const itemCostPerUnit = product.costPrice || product.costPerUnit || 0;
        const itemTotalCost = item.quantity * itemCostPerUnit;

        totalAmount += itemTotal;
        orderTotalCost += itemTotalCost;

        orderItems.push({
          product: product._id,
          productName: product.name,
          unit: item.unit,
          unitName: unitName,
          quantity: item.quantity,
          originalPrice,
          discountPercent,
          discountAmount,
          price: itemPrice,
          total: itemTotal,
          costPerUnit: Math.round(itemCostPerUnit),
          totalCost: Math.round(itemTotalCost),
        });

        // Decrement stock
        await this.productsService.updateStock(item.product, -item.quantity);
      }

      order.items = orderItems as any;
      order.totalAmount = totalAmount;
      order.totalCost = Math.round(orderTotalCost);
      order.grossProfit = totalAmount - Math.round(orderTotalCost);

      // Create OUT stock movements for new items
      await Promise.all(
        orderItems.map((item) =>
          new this.stockMovementModel({
            type: 'OUT',
            product: item.product,
            quantity: item.quantity,
            unit: item.unit,
            reason: `Buyurtma tahrirlandi: ${order.orderNumber}`,
            reference: order._id.toString(),
            referenceModel: 'Order',
            createdBy: userId,
          }).save(),
        ),
      );
    }

    // 4. Update payment type and amounts
    const paymentType = dto.paymentType || order.paymentType;
    order.paymentType = paymentType as any;

    if (paymentType === 'CASH' || paymentType === 'TRANSFER') {
      order.paidAmount = order.totalAmount;
    } else if (paymentType === 'DEBT') {
      order.paidAmount =
        dto.paidAmount !== undefined ? dto.paidAmount : order.paidAmount;
      const newDebt = order.totalAmount - order.paidAmount;
      if (newDebt > 0) {
        await this.customersService.updateDebt(
          order.customer.toString(),
          newDebt,
        );
      }
    }

    if (dto.notes !== undefined) order.notes = dto.notes;
    if (dto.dueDate !== undefined) order.dueDate = new Date(dto.dueDate);

    await order.save();
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

    const filter: any = {};

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
      this.orderModel
        .find(filter)
        .populate('customer')
        .populate('createdBy', 'name email')
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
      .populate('createdBy', 'name email')
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
      throw new BadRequestException('Cannot change status of a cancelled order');
    }

    if (updateOrderStatusDto.status === 'CANCELLED') {
      // Restore product stock for each item
      for (const item of order.items) {
        await this.productsService.updateStock(
          item.product.toString(),
          item.quantity,
        );
      }

      // Create StockMovement audit records (IN — stock restored)
      await Promise.all(
        order.items.map((item) =>
          new this.stockMovementModel({
            type: 'IN',
            product: item.product,
            quantity: item.quantity,
            unit: item.unit,
            reason: `Buyurtma bekor qilindi: ${order.orderNumber}`,
            reference: order._id.toString(),
            referenceModel: 'Order',
            createdBy: userId,
          }).save(),
        ),
      );

      // Reverse customer debt if paymentType was DEBT
      if (order.paymentType === 'DEBT') {
        const debtAmount = order.totalAmount - order.paidAmount;
        if (debtAmount > 0) {
          await this.customersService.updateDebt(
            order.customer.toString(),
            -debtAmount,
          );
        }
      }
    }

    order.status = updateOrderStatusDto.status;

    if (updateOrderStatusDto.status === 'CONFIRMED' && !order.invoiceNumber) {
      order.invoiceNumber = await this.generateInvoiceNumber();
    }

    await order.save();

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

  private async createOrderStockMovements(
    order: OrderDocument,
    userId: string,
  ): Promise<void> {
    await Promise.all(
      order.items.map((item) =>
        new this.stockMovementModel({
          type: 'OUT',
          product: item.product,
          quantity: item.quantity,
          unit: item.unit,
          reason: `Buyurtma: ${order.orderNumber}`,
          reference: order._id.toString(),
          referenceModel: 'Order',
          createdBy: userId,
        }).save(),
      ),
    );
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
    const order = await this.orderModel.findById(id);
    if (!order) throw new NotFoundException('Buyurtma topilmadi');
    if (order.status === 'CANCELLED') throw new BadRequestException('Bekor qilingan buyurtmani topshirish mumkin emas');
    order.deliveredTo = dto.deliveredTo;
    order.deliveredAt = new Date();
    if (dto.deliveryNotes) order.deliveryNotes = dto.deliveryNotes;
    return order.save();
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
      const lastCounter = parseInt(lastOrder.invoiceNumber.split('-').pop() || '0', 10);
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
      .populate('createdBy', 'name email')
      .exec();

    if (!order) {
      throw new NotFoundException(`Order with ID "${id}" not found`);
    }

    return order;
  }
}
