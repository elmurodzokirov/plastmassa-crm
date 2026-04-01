import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Customer, CustomerDocument } from '../customers/schemas/customer.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { Payment, PaymentDocument } from '../payments/schemas/payment.schema';
import { Expense, ExpenseDocument } from '../expenses/schemas/expense.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { ProductionLog, ProductionLogDocument } from '../production/schemas/production-log.schema';
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
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const [
      totalCustomers,
      activeOrders,
      monthlyRevenueResult,
      monthlyExpensesResult,
      totalDebtResult,
      productionToday,
      employeeCount,
      lowStockProducts,
    ] = await Promise.all([
      this.customerModel.countDocuments().exec(),
      this.orderModel
        .countDocuments({ status: { $nin: ['COMPLETED', 'CANCELLED'] } })
        .exec(),
      this.paymentModel
        .aggregate([
          { $match: { createdAt: { $gte: startOfMonth, $lte: endOfMonth } } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ])
        .exec(),
      this.expenseModel
        .aggregate([
          { $match: { date: { $gte: startOfMonth, $lte: endOfMonth } } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ])
        .exec(),
      this.customerModel
        .aggregate([
          { $group: { _id: null, total: { $sum: '$currentDebt' } } },
        ])
        .exec(),
      this.productionLogModel
        .countDocuments({ date: { $gte: startOfToday, $lte: endOfToday } })
        .exec(),
      this.userModel.countDocuments({ isActive: true }).exec(),
      this.productModel
        .countDocuments({
          $expr: { $lt: ['$currentStock', '$minStock'] },
        })
        .exec(),
    ]);

    const monthlyRevenue =
      monthlyRevenueResult.length > 0 ? monthlyRevenueResult[0].total : 0;
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
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

    const result = await this.paymentModel
      .aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: {
              month: { $month: '$createdAt' },
              year: { $year: '$createdAt' },
            },
            total: { $sum: '$amount' },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ])
      .exec();

    const data: Array<{ month: number; year: number; total: number }> = [];

    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - months + 1 + i, 1);
      const month = d.getMonth() + 1;
      const year = d.getFullYear();
      const found = result.find(
        (r: any) => r._id.month === month && r._id.year === year,
      );
      data.push({
        month,
        year,
        total: found ? found.total : 0,
      });
    }

    return data;
  }

  async getSalesChart(period: 'year' | 'month' | 'day' = 'month', year?: number, month?: number) {
    const now = new Date();
    const targetYear = year || now.getFullYear();

    let matchFilter: Record<string, unknown> = { status: { $ne: 'CANCELLED' } };
    let groupId: Record<string, unknown>;
    let sortKey: Record<string, 1 | -1>;

    if (period === 'year') {
      // Last 5 years
      const startDate = new Date(targetYear - 4, 0, 1);
      matchFilter.createdAt = { $gte: startDate };
      groupId = { year: { $year: '$createdAt' } };
      sortKey = { '_id.year': 1 };
    } else if (period === 'month') {
      // All months in target year
      const startDate = new Date(targetYear, 0, 1);
      const endDate = new Date(targetYear, 11, 31, 23, 59, 59, 999);
      matchFilter.createdAt = { $gte: startDate, $lte: endDate };
      groupId = {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
      };
      sortKey = { '_id.year': 1, '_id.month': 1 };
    } else {
      // All days in target month
      const targetMonth = (month || now.getMonth() + 1) - 1;
      const startDate = new Date(targetYear, targetMonth, 1);
      const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);
      matchFilter.createdAt = { $gte: startDate, $lte: endDate };
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

    return result.map((r: Record<string, unknown>) => {
      const id = r._id as Record<string, number>;
      return {
        year: id.year,
        month: id.month || undefined,
        day: id.day || undefined,
        totalSales: r.totalSales,
        totalCost: r.totalCost,
        grossProfit: r.grossProfit,
        orderCount: r.orderCount,
      };
    });
  }
}
