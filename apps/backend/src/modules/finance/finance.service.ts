import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Customer, CustomerDocument } from '../customers/schemas/customer.schema';
import { Payment, PaymentDocument } from '../payments/schemas/payment.schema';
import { Expense, ExpenseDocument } from '../expenses/schemas/expense.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schema';

@Injectable()
export class FinanceService {
  constructor(
    @InjectModel(Customer.name)
    private readonly customerModel: Model<CustomerDocument>,
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(Expense.name)
    private readonly expenseModel: Model<ExpenseDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
  ) {}

  async getDebtors() {
    const customers = await this.customerModel
      .find({ currentDebt: { $gt: 0 } })
      .select('name phone currentDebt debtLimit')
      .sort({ currentDebt: -1 })
      .exec();

    const totalDebt = customers.reduce(
      (sum, c) => sum + c.currentDebt,
      0,
    );

    return {
      customers: customers.map((c) => ({
        _id: c._id,
        name: c.name,
        phone: c.phone,
        currentDebt: c.currentDebt,
        creditLimit: c.debtLimit,
      })),
      totalDebt,
    };
  }

  async getCashFlow(dateFrom: string, dateTo: string) {
    const from = new Date(dateFrom);
    const to = new Date(dateTo);

    const [incomeResult, expensesResult] = await Promise.all([
      this.paymentModel
        .aggregate([
          { $match: { createdAt: { $gte: from, $lte: to } } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ])
        .exec(),
      this.expenseModel
        .aggregate([
          { $match: { date: { $gte: from, $lte: to } } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ])
        .exec(),
    ]);

    const income = incomeResult.length > 0 ? incomeResult[0].total : 0;
    const expenses = expensesResult.length > 0 ? expensesResult[0].total : 0;

    return {
      income,
      expenses,
      net: income - expenses,
      period: { from: dateFrom, to: dateTo },
    };
  }

  async getMonthlyCashFlow(year: number) {
    const startOfYear = new Date(Date.UTC(year, 0, 1));
    const endOfYear = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

    const [incomeByMonth, expensesByMonth] = await Promise.all([
      this.paymentModel
        .aggregate([
          { $match: { createdAt: { $gte: startOfYear, $lte: endOfYear } } },
          {
            $group: {
              _id: { $month: '$createdAt' },
              total: { $sum: '$amount' },
            },
          },
        ])
        .exec(),
      this.expenseModel
        .aggregate([
          { $match: { date: { $gte: startOfYear, $lte: endOfYear } } },
          {
            $group: {
              _id: { $month: '$date' },
              total: { $sum: '$amount' },
            },
          },
        ])
        .exec(),
    ]);

    const incomeMap = new Map<number, number>();
    for (const item of incomeByMonth) {
      incomeMap.set(item._id, item.total);
    }

    const expensesMap = new Map<number, number>();
    for (const item of expensesByMonth) {
      expensesMap.set(item._id, item.total);
    }

    const months = [];
    for (let m = 1; m <= 12; m++) {
      const income = incomeMap.get(m) || 0;
      const expenses = expensesMap.get(m) || 0;
      months.push({
        month: m,
        income,
        expenses,
        net: income - expenses,
      });
    }

    return { year, months };
  }

  async getSummary() {
    const [revenueResult, expensesResult, debtResult] = await Promise.all([
      this.paymentModel
        .aggregate([
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ])
        .exec(),
      this.expenseModel
        .aggregate([
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ])
        .exec(),
      this.customerModel
        .aggregate([
          { $match: { currentDebt: { $gt: 0 } } },
          { $group: { _id: null, total: { $sum: '$currentDebt' } } },
        ])
        .exec(),
    ]);

    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;
    const totalExpenses =
      expensesResult.length > 0 ? expensesResult[0].total : 0;
    const totalDebt = debtResult.length > 0 ? debtResult[0].total : 0;

    return {
      totalRevenue,
      totalExpenses,
      totalDebt,
      netProfit: totalRevenue - totalExpenses,
    };
  }

  async getProfitAndLoss(dateFrom: string, dateTo: string) {
    const from = new Date(dateFrom);
    const to = new Date(dateTo);

    const [revenueByProduct, expensesByCategory] = await Promise.all([
      this.orderModel
        .aggregate([
          {
            $match: {
              createdAt: { $gte: from, $lte: to },
              status: { $ne: 'CANCELLED' },
            },
          },
          { $unwind: '$items' },
          {
            $group: {
              _id: '$items.productName',
              total: { $sum: '$items.total' },
            },
          },
          { $sort: { total: -1 } },
        ])
        .exec(),
      this.expenseModel
        .aggregate([
          { $match: { date: { $gte: from, $lte: to } } },
          {
            $group: {
              _id: '$category',
              total: { $sum: '$amount' },
            },
          },
          { $sort: { total: -1 } },
        ])
        .exec(),
    ]);

    const revenueTotal = revenueByProduct.reduce(
      (sum: number, item: any) => sum + item.total,
      0,
    );
    const expensesTotal = expensesByCategory.reduce(
      (sum: number, item: any) => sum + item.total,
      0,
    );

    return {
      revenue: {
        total: revenueTotal,
        byProduct: revenueByProduct.map((item: any) => ({
          name: item._id,
          total: item.total,
        })),
      },
      expenses: {
        total: expensesTotal,
        byCategory: expensesByCategory.map((item: any) => ({
          category: item._id,
          total: item.total,
        })),
      },
      grossProfit: revenueTotal,
      netProfit: revenueTotal - expensesTotal,
      period: { from: dateFrom, to: dateTo },
    };
  }
}
