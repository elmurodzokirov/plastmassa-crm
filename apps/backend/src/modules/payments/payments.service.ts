import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payment, PaymentDocument } from './schemas/payment.schema';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { QueryPaymentDto } from './dto/query-payment.dto';
import { CustomersService } from '../customers/customers.service';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
    private readonly customersService: CustomersService,
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService,
  ) {}

  async create(
    createPaymentDto: CreatePaymentDto,
    userId: string,
  ): Promise<PaymentDocument> {
    const { customer, order, amount, type, notes } = createPaymentDto;

    const customerDoc = await this.customersService.findById(customer);
    let maxPayableAmount = Math.max(customerDoc.currentDebt, 0);

    if (order) {
      const orderDoc = await this.ordersService.findById(order);
      const orderCustomerId =
        typeof orderDoc.customer === 'string'
          ? orderDoc.customer
          : (orderDoc.customer as any)?._id?.toString() ||
            orderDoc.customer.toString();

      if (orderCustomerId !== customer) {
        throw new BadRequestException(
          'Order does not belong to the specified customer',
        );
      }

      if (orderDoc.status === 'CANCELLED') {
        throw new BadRequestException(
          'Bekor qilingan buyurtma uchun to\'lov qabul qilib bo\'lmaydi',
        );
      }

      const remainingAmount = Math.max(
        orderDoc.totalAmount - orderDoc.paidAmount,
        0,
      );

      if (remainingAmount <= 0) {
        throw new BadRequestException(
          'Ushbu buyurtma uchun qarzdorlik qolmagan',
        );
      }

      maxPayableAmount = Math.min(maxPayableAmount, remainingAmount);
    }

    if (maxPayableAmount <= 0) {
      throw new BadRequestException('Mijozda yopiladigan qarzdorlik mavjud emas');
    }

    if (amount > maxPayableAmount) {
      throw new BadRequestException(
        'To\'lov summasi mavjud qarzdorlikdan oshib ketmoqda',
      );
    }

    const payment = new this.paymentModel({
      customer,
      order,
      amount,
      type,
      notes,
      createdBy: userId,
    });

    const savedPayment = await payment.save();

    // Decrease customer debt
    await this.customersService.updateDebt(customer, -amount);

    // If order provided, increase order paidAmount
    if (order) {
      await this.paymentModel.db
        .model('Order')
        .findByIdAndUpdate(order, { $inc: { paidAmount: amount } })
        .exec();
    }

    return savedPayment;
  }

  async findAll(query: QueryPaymentDto) {
    const {
      page = 1,
      limit = 20,
      customer,
      order,
      type,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const filter: any = {};

    if (customer) {
      filter.customer = customer;
    }

    if (order) {
      filter.order = order;
    }

    if (type) {
      filter.type = type;
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
      this.paymentModel
        .find(filter)
        .populate('customer')
        .populate('order')
        .populate('createdBy', 'fullName username')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.paymentModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<PaymentDocument> {
    const payment = await this.paymentModel
      .findById(id)
      .populate('customer')
      .populate('order')
      .populate('createdBy', 'fullName username')
      .exec();

    if (!payment) {
      throw new NotFoundException(`Payment with ID "${id}" not found`);
    }

    return payment;
  }

  async getPaymentsByCustomer(customerId: string) {
    return this.findAll({ customer: customerId });
  }

  async getPaymentsByOrder(orderId: string) {
    return this.findAll({ order: orderId });
  }
}
