import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Return, ReturnDocument } from './schemas/return.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { StockMovement, StockMovementDocument } from '../stock/schemas/stock-movement.schema';
import { CreateReturnDto } from './dto/create-return.dto';
import { QueryReturnDto } from './dto/query-return.dto';
import { ProductsService } from '../products/products.service';
import { CustomersService } from '../customers/customers.service';

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
  ) {}

  async create(
    dto: CreateReturnDto,
    userId: string,
  ): Promise<ReturnDocument> {
    // Validate order exists and is not cancelled
    const order = await this.orderModel.findById(dto.order).exec();

    if (!order) {
      throw new NotFoundException(`Order with ID "${dto.order}" not found`);
    }

    if (order.status === 'CANCELLED') {
      throw new BadRequestException('Cannot create a return for a cancelled order');
    }

    const returnItems = [];
    let totalAmount = 0;

    for (const item of dto.items) {
      const product = await this.productsService.findById(item.product);
      const productPopulated = await product.populate('baseUnit');

      let unitName = '';
      if (productPopulated.baseUnit && typeof productPopulated.baseUnit === 'object') {
        unitName = (productPopulated.baseUnit as any).name || '';
      }

      const total = item.quantity * item.price;

      returnItems.push({
        product: product._id,
        productName: product.name,
        unit: item.unit,
        unitName,
        quantity: item.quantity,
        price: item.price,
        total,
      });

      totalAmount += total;
    }

    const returnDoc = new this.returnModel({
      order: dto.order,
      items: returnItems,
      reason: dto.reason,
      totalAmount,
      status: 'PENDING',
      createdBy: userId,
    });

    return returnDoc.save();
  }

  async findAll(query: QueryReturnDto) {
    const {
      page = 1,
      limit = 20,
      order,
      status,
      dateFrom,
      dateTo,
    } = query;

    const filter: any = {};

    if (order) {
      filter.order = order;
    }

    if (status) {
      filter.status = status;
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

    const [items, total] = await Promise.all([
      this.returnModel
        .find(filter)
        .populate('order')
        .populate('items.product')
        .populate('createdBy', 'name email')
        .populate('approvedBy', 'name email')
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
      .populate('items.product')
      .populate('items.unit')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
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

    // Restore stock for each item
    for (const item of returnDoc.items) {
      await this.productsService.updateStock(
        item.product.toString(),
        item.quantity,
      );
    }

    // Create stock IN movements for each item
    await Promise.all(
      returnDoc.items.map((item) =>
        new this.stockMovementModel({
          type: 'IN',
          product: item.product,
          quantity: item.quantity,
          unit: item.unit,
          reason: `Qaytarish: ${returnDoc._id}`,
          reference: returnDoc._id.toString(),
          referenceModel: 'Return',
          createdBy: userId,
        }).save(),
      ),
    );

    // If order was DEBT, reduce customer debt
    const order = await this.orderModel.findById(returnDoc.order).exec();
    if (order && order.paymentType === 'DEBT') {
      await this.customersService.updateDebt(
        order.customer.toString(),
        -returnDoc.totalAmount,
      );
    }

    // Update return status
    returnDoc.status = 'APPROVED';
    returnDoc.approvedBy = userId as any;
    returnDoc.approvedAt = new Date();
    await returnDoc.save();

    return this.findById(id);
  }
}
