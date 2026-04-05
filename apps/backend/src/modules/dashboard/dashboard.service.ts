import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Customer, CustomerDocument } from '../customers/schemas/customer.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { Payment, PaymentDocument } from '../payments/schemas/payment.schema';
import { Expense, ExpenseDocument } from '../expenses/schemas/expense.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import {
  ProductionLog,
  ProductionLogDocument,
} from '../production/schemas/production-log.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Customer.name)
    private readonly customerModel: Model<CustomerDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(Expense.name)
    private readonly expenseModel: Model<ExpenseDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(ProductionLog.name)
    private readonly productionLogModel: Model<ProductionLogDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  async getStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const endOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999,
    );

    const [
      totalCustomers,
      activeOrders,
      initialIncome,
      paymentIncome,
      monthlyExpensesResult,
      totalDebtResult,
      productionToday,
      employeeCount,
      lowStockProducts,
    ] = await Promise.all([
      this.customerModel.countDocuments().exec(),
      this.orderModel.countDocuments({ status: { $ne: 'CANCELLED' } }).exec(),
      this.getInitialOrderIncomeTotal(startOfMonth, endOfMonth),
      this.getPaymentIncomeTotal(startOfMonth, endOfMonth),
      this.expenseModel
        .aggregate([
          { $match: { date: { $gte: startOfMonth, $lte: endOfMonth } } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ])
        .exec(),
      this.customerModel
        .aggregate([{ $group: { _id: null, total: { $sum: '$currentDebt' } } }])
        .exec(),
      this.productionLogModel
        .countDocuments({
          date: { $gte: startOfToday, $lte: endOfToday },
          status: 'APPROVED',
        })
        .exec(),
      this.userModel.countDocuments({ isActive: true }).exec(),
      this.productModel.countDocuments({ currentStock: { $lte: 0 } }).exec(),
    ]);

    const monthlyRevenue = initialIncome + paymentIncome;
    const monthlyExpenses =
      monthlyExpensesResult.length > 0 ? monthlyExpensesResult[0].total : 0;
    const totalDebt =
      totalDebtResult.length > 0 ? totalDebtResult[0].total : 0;

    return {
      totalCustomers,
      activeOrders,
      monthlyRevenue,
      monthlyExpenses,
      totalDebt,
      productionToday,
      employeeCount,
      lowStockProducts,
    };
  }

  async getRecentOrders(limit: number = 5) {
    return this.orderModel
      .find()
      .populate('customer', 'name')
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async getRecentPayments(limit: number = 5) {
    return this.paymentModel
      .find()
      .populate('customer', 'name')
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async getMonthlyRevenue(months: number = 6) {
    const now = new Date();
    const data: Array<{ month: number; year: number; revenue: number; total: number }> = [];

    for (let index = 0; index < months; index++) {
      const current = new Date(
        now.getFullYear(),
        now.getMonth() - months + 1 + index,
        1,
      );
      const startDate = new Date(current.getFullYear(), current.getMonth(), 1);
      const endDate = new Date(
        current.getFullYear(),
        current.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );

      const [initialIncome, paymentIncome] = await Promise.all([
        this.getInitialOrderIncomeTotal(startDate, endDate),
        this.getPaymentIncomeTotal(startDate, endDate),
      ]);

      const revenue = initialIncome + paymentIncome;
      data.push({
        month: current.getMonth() + 1,
        year: current.getFullYear(),
        revenue,
        total: revenue,
      });
    }

    return data;
  }

  async getSalesChart(
    period: 'year' | 'month' | 'day' = 'month',
    year?: number,
    month?: number,
  ) {
    const now = new Date();
    const targetYear = year || now.getFullYear();

    const matchFilter: Record<string, unknown> = {
      status: { $ne: 'CANCELLED' },
    };
    let groupId: Record<string, unknown>;
    let sortKey: Record<string, 1 | -1>;

    if (period === 'year') {
      matchFilter.createdAt = { $gte: new Date(targetYear - 4, 0, 1) };
      groupId = { year: { $year: '$createdAt' } };
      sortKey = { '_id.year': 1 };
    } else if (period === 'month') {
      matchFilter.createdAt = {
        $gte: new Date(targetYear, 0, 1),
        $lte: new Date(targetYear, 11, 31, 23, 59, 59, 999),
      };
      groupId = {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
      };
      sortKey = { '_id.year': 1, '_id.month': 1 };
    } else {
      const targetMonth = (month || now.getMonth() + 1) - 1;
      matchFilter.createdAt = {
        $gte: new Date(targetYear, targetMonth, 1),
        $lte: new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999),
      };
      groupId = {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
        day: { $dayOfMonth: '$createdAt' },
      };
      sortKey = { '_id.year': 1, '_id.month': 1, '_id.day': 1 };
    }

    const result = await this.orderModel
      .aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: groupId,
            totalSales: { $sum: '$totalAmount' },
            totalCost: { $sum: '$totalCost' },
            grossProfit: { $sum: '$grossProfit' },
            orderCount: { $sum: 1 },
          },
        },
        { $sort: sortKey },
      ])
      .exec();

    return result.map((item: any) => ({
      year: item._id.year,
      month: item._id.month || undefined,
      day: item._id.day || undefined,
      totalSales: item.totalSales,
      totalCost: item.totalCost,
      grossProfit: item.grossProfit,
      orderCount: item.orderCount,
    }));
  }

  private async getInitialOrderIncomeTotal(from: Date, to: Date): Promise<number> {
    const result = await this.orderModel
      .aggregate([
        {
          $match: {
            status: { $ne: 'CANCELLED' },
            createdAt: { $gte: from, $lte: to },
          },
        },
        {
          $lookup: {
            from: 'payments',
            localField: '_id',
            foreignField: 'order',
            as: 'linkedPayments',
          },
        },
        {
          $addFields: {
            linkedPaymentsTotal: { $sum: '$linkedPayments.amount' },
          },
        },
        {
          $project: {
            recognizedIncome: {
              $ifNull: [
                '$initialPaidAmount',
                {
                  $cond: [
                    { $gte: [{ $subtract: ['$paidAmount', '$linkedPaymentsTotal'] }, 0] },
                    { $subtract: ['$paidAmount', '$linkedPaymentsTotal'] },
                    0,
                  ],
                },
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$recognizedIncome' },
          },
        },
      ])
      .exec();

    return result.length > 0 ? result[0].total : 0;
  }

  private async getPaymentIncomeTotal(from: Date, to: Date): Promise<number> {
    const result = await this.paymentModel
      .aggregate([
        { $match: { createdAt: { $gte: from, $lte: to } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ])
      .exec();

    return result.length > 0 ? result[0].total : 0;
  }
}
