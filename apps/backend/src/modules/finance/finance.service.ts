import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Customer, CustomerDocument } from '../customers/schemas/customer.schema';
import { Payment, PaymentDocument } from '../payments/schemas/payment.schema';
import { Expense, ExpenseDocument } from '../expenses/schemas/expense.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { Supplier, SupplierDocument } from '../suppliers/schemas/supplier.schema';
import {
  SupplierPayment,
  SupplierPaymentDocument,
} from '../suppliers/schemas/supplier-payment.schema';
import { Return, ReturnDocument } from '../returns/schemas/return.schema';

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
    @InjectModel(Supplier.name)
    private readonly supplierModel: Model<SupplierDocument>,
    @InjectModel(SupplierPayment.name)
    private readonly supplierPaymentModel: Model<SupplierPaymentDocument>,
    @InjectModel(Return.name)
    private readonly returnModel: Model<ReturnDocument>,
  ) {}

  async getDebtors() {
    const customers = await this.customerModel
      .find({ currentDebt: { $gt: 0 } })
      .select('name phone currentDebt debtLimit')
      .sort({ currentDebt: -1 })
      .exec();

    return customers.map((customer) => ({
      _id: customer._id,
      name: customer.name,
      phone: customer.phone,
      totalDebt: customer.currentDebt,
      creditLimit: customer.debtLimit,
    }));
  }

  async getCreditors() {
    const suppliers = await this.supplierModel
      .find({ currentDebt: { $gt: 0 } })
      .select('name phone currentDebt')
      .sort({ currentDebt: -1 })
      .exec();

    return suppliers.map((supplier) => ({
      _id: supplier._id,
      name: supplier.name,
      phone: supplier.phone,
      totalDebt: supplier.currentDebt,
    }));
  }

  async getCashFlow(dateFrom: string, dateTo: string) {
    const { from, to } = this.buildDateRange(dateFrom, dateTo);

    const [initialIncome, paymentIncome, expenseTotal, supplierPaymentTotal] =
      await Promise.all([
        this.getInitialOrderIncomeTotal(from, to),
        this.getPaymentIncomeTotal(from, to),
        this.getExpenseTotal(from, to),
        this.getSupplierPaymentTotal(from, to),
      ]);

    const totalIncome = initialIncome + paymentIncome;
    const totalExpense = expenseTotal + supplierPaymentTotal;
    const netProfit = totalIncome - totalExpense;

    return {
      totalIncome,
      totalExpense,
      netProfit,
      income: totalIncome,
      expenses: totalExpense,
      net: netProfit,
      period: { from: dateFrom, to: dateTo },
    };
  }

  async getMonthlyCashFlow(year: number) {
    const startOfYear = new Date(Date.UTC(year, 0, 1));
    const endOfYear = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

    const [
      initialIncomeByMonth,
      paymentIncomeByMonth,
      expensesByMonth,
      supplierPaymentsByMonth,
    ] = await Promise.all([
      this.getInitialOrderIncomeByMonth(startOfYear, endOfYear),
      this.getPaymentIncomeByMonth(startOfYear, endOfYear),
      this.getExpensesByMonth(startOfYear, endOfYear),
      this.getSupplierPaymentsByMonth(startOfYear, endOfYear),
    ]);

    const initialIncomeMap = this.mapMonthlyTotals(initialIncomeByMonth);
    const paymentIncomeMap = this.mapMonthlyTotals(paymentIncomeByMonth);
    const expenseMap = this.mapMonthlyTotals(expensesByMonth);
    const supplierPaymentMap = this.mapMonthlyTotals(supplierPaymentsByMonth);

    const months = [];
    for (let month = 1; month <= 12; month++) {
      const income =
        (initialIncomeMap.get(month) || 0) + (paymentIncomeMap.get(month) || 0);
      const expense =
        (expenseMap.get(month) || 0) + (supplierPaymentMap.get(month) || 0);
      months.push({
        month,
        income,
        expense,
        net: income - expense,
      });
    }

    return months;
  }

  /** Every income/expense event recorded today, merged into one chronological feed
   *  for the "Kassa" tab's daily list. Each entry carries enough denormalized detail
   *  for a read-only view dialog on the frontend, so no extra per-row fetch is needed. */
  async getTodayTransactions() {
    const { from, to } = this.buildTodayRange();
    return this.buildTransactionsFeed(from, to, 'desc');
  }

  /** Every income/expense event recorded in the given period, merged into one
   *  chronological feed (oldest first) with a running cash balance — powers the
   *  "Kassa kitobi" (cash book) report. */
  async getTransactions(dateFrom: string, dateTo: string) {
    const { from, to } = this.buildDateRange(dateFrom, dateTo);
    return this.buildTransactionsFeed(from, to, 'asc');
  }

  private async buildTransactionsFeed(
    from: Date,
    to: Date,
    order: 'asc' | 'desc',
  ) {
    const [orders, payments, expenses, supplierPayments, returnRefunds] =
      await Promise.all([
        this.orderModel
          .find({
            createdAt: { $gte: from, $lte: to },
            status: { $ne: 'CANCELLED' },
            initialPaidAmount: { $gt: 0 },
          })
          .populate('customer', 'name phone')
          .exec(),
        this.paymentModel
          .find({ createdAt: { $gte: from, $lte: to } })
          .populate('customer', 'name phone')
          .populate('order', 'orderNumber')
          .exec(),
        this.expenseModel
          .find({ date: { $gte: from, $lte: to } })
          .exec(),
        this.supplierPaymentModel
          .find({ createdAt: { $gte: from, $lte: to } })
          .populate('supplier', 'name phone')
          .exec(),
        // Only "return from customer" documents that actually paid cash back
        // (refundAmount > 0) show up here — the date used is approvedAt, since
        // that's when the cash actually left the register, not when the return
        // document was first drafted.
        this.returnModel
          .find({
            status: 'APPROVED',
            refundAmount: { $gt: 0 },
            approvedAt: { $gte: from, $lte: to },
          })
          .populate('customer', 'name phone')
          .exec(),
      ]);

    const transactions: any[] = [];

    for (const order of orders) {
      const customer = order.customer as any;
      transactions.push({
        _id: order._id.toString(),
        type: 'ORDER_INCOME',
        direction: 'IN',
        amount: order.initialPaidAmount,
        date: order.createdAt,
        title: `Buyurtma ${order.orderNumber} — boshlang'ich to'lov`,
        subtitle: customer?.name,
        detail: {
          orderNumber: order.orderNumber,
          customerName: customer?.name,
          customerPhone: customer?.phone,
          paymentType: order.paymentType,
          orderTotal: order.totalAmount,
          items: (order.items || []).map((item: any) => ({
            productName: item.productName,
            quantity: item.quantity,
            unitName: item.unitName,
            price: item.price,
            total: item.total,
          })),
        },
      });
    }

    for (const payment of payments) {
      const customer = payment.customer as any;
      const order = payment.order as any;
      transactions.push({
        _id: payment._id.toString(),
        type: 'PAYMENT',
        direction: 'IN',
        amount: payment.amount,
        date: payment.createdAt,
        title: "Mijozdan to'lov qabul qilindi",
        subtitle: customer?.name,
        detail: {
          customerName: customer?.name,
          customerPhone: customer?.phone,
          orderNumber: order?.orderNumber,
          paymentType: payment.type,
          notes: payment.notes,
        },
      });
    }

    for (const expense of expenses) {
      transactions.push({
        _id: expense._id.toString(),
        type: 'EXPENSE',
        direction: 'OUT',
        amount: expense.amount,
        date: expense.date,
        title: expense.category,
        subtitle: expense.description,
        detail: {
          category: expense.category,
          description: expense.description,
          paymentMethod: expense.paymentMethod,
          notes: expense.notes,
        },
      });
    }

    for (const sp of supplierPayments) {
      const supplier = sp.supplier as any;
      transactions.push({
        _id: sp._id.toString(),
        type: 'SUPPLIER_PAYMENT',
        direction: 'OUT',
        amount: sp.amount,
        date: sp.createdAt,
        title: "Yetkazib beruvchiga to'lov",
        subtitle: supplier?.name,
        detail: {
          supplierName: supplier?.name,
          supplierPhone: supplier?.phone,
          paymentType: sp.type,
          notes: sp.notes,
        },
      });
    }

    for (const ret of returnRefunds) {
      const customer = ret.customer as any;
      transactions.push({
        _id: ret._id.toString(),
        type: 'RETURN_REFUND',
        direction: 'OUT',
        amount: ret.refundAmount,
        date: ret.approvedAt,
        title: "Mijozga qaytarilgan pul",
        subtitle: customer?.name,
        detail: {
          customerName: customer?.name,
          customerPhone: customer?.phone,
          reason: ret.reason,
          returnTotal: ret.totalAmount,
          items: (ret.items || []).map((item: any) => ({
            productName: item.productName,
            quantity: item.quantity,
            unitName: item.unitName,
            price: item.price,
            total: item.total,
          })),
        },
      });
    }

    transactions.sort((a, b) =>
      order === 'asc'
        ? new Date(a.date).getTime() - new Date(b.date).getTime()
        : new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    // Running balance is computed in chronological order regardless of the
    // array's display order, then attached to each (shared) transaction object.
    const chronological =
      order === 'asc' ? transactions : [...transactions].reverse();
    let runningBalance = 0;
    for (const t of chronological) {
      runningBalance += t.direction === 'IN' ? t.amount : -t.amount;
      t.balance = runningBalance;
    }

    const totalIncome = transactions
      .filter((t) => t.direction === 'IN')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions
      .filter((t) => t.direction === 'OUT')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      items: transactions,
      totalIncome,
      totalExpense,
      closingBalance: runningBalance,
    };
  }

  private buildTodayRange() {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date();
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }

  async getSummary() {
    const [
      initialRevenue,
      paymentRevenue,
      expensesResult,
      debtResult,
      supplierPaymentTotal,
      creditResult,
    ] = await Promise.all([
      this.getInitialOrderIncomeTotal(),
      this.getPaymentIncomeTotal(),
      this.expenseModel
        .aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }])
        .exec(),
      this.customerModel
        .aggregate([
          { $match: { currentDebt: { $gt: 0 } } },
          { $group: { _id: null, total: { $sum: '$currentDebt' } } },
        ])
        .exec(),
      this.getSupplierPaymentTotal(),
      this.supplierModel
        .aggregate([
          { $match: { currentDebt: { $gt: 0 } } },
          { $group: { _id: null, total: { $sum: '$currentDebt' } } },
        ])
        .exec(),
    ]);

    const totalRevenue = initialRevenue + paymentRevenue;
    const totalExpenses =
      (expensesResult.length > 0 ? expensesResult[0].total : 0) +
      supplierPaymentTotal;
    const totalDebt = debtResult.length > 0 ? debtResult[0].total : 0;
    const totalCredit = creditResult.length > 0 ? creditResult[0].total : 0;
    const netProfit = totalRevenue - totalExpenses;

    return {
      totalRevenue,
      totalExpenses,
      totalDebt,
      totalCredit,
      netProfit,
      cashOnHand: netProfit,
    };
  }

  async getProfitAndLoss(dateFrom: string, dateTo: string) {
    const { from, to } = this.buildDateRange(dateFrom, dateTo);

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
              quantity: { $sum: '$items.quantity' },
              total: { $sum: '$items.total' },
              totalCost: { $sum: '$items.totalCost' },
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
              count: { $sum: 1 },
            },
          },
          { $sort: { total: -1 } },
        ])
        .exec(),
    ]);

    const totalRevenue = revenueByProduct.reduce(
      (sum: number, item: any) => sum + item.total,
      0,
    );
    const costOfGoodsSold = revenueByProduct.reduce(
      (sum: number, item: any) => sum + (item.totalCost || 0),
      0,
    );
    const operatingExpenses = expensesByCategory.reduce(
      (sum: number, item: any) => sum + item.total,
      0,
    );
    const grossProfit = totalRevenue - costOfGoodsSold;
    const totalExpenses = costOfGoodsSold + operatingExpenses;
    const netProfit = grossProfit - operatingExpenses;

    return {
      totalRevenue,
      totalExpenses,
      grossProfit,
      netProfit,
      revenueByProduct: revenueByProduct.map((item: any) => ({
        name: item._id,
        total: item.total,
        quantity: item.quantity,
      })),
      expensesByCategory: [
        {
          category: 'Sotilgan mahsulot tannarxi',
          total: costOfGoodsSold,
          count: 0,
        },
        ...expensesByCategory.map((item: any) => ({
          category: item._id,
          total: item.total,
          count: item.count,
        })),
      ],
      period: { from: dateFrom, to: dateTo },
    };
  }

  private buildDateRange(dateFrom?: string, dateTo?: string) {
    const from = dateFrom ? new Date(dateFrom) : new Date(0);
    const to = dateTo ? new Date(dateTo) : new Date();
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }

  private async getInitialOrderIncomeTotal(from?: Date, to?: Date): Promise<number> {
    const result = await this.getInitialOrderIncomeAggregate(from, to);
    return result.length > 0 ? result[0].total : 0;
  }

  private async getPaymentIncomeTotal(from?: Date, to?: Date): Promise<number> {
    const match: Record<string, unknown> = {};
    if (from || to) {
      match.createdAt = {};
      if (from) {
        (match.createdAt as Record<string, Date>).$gte = from;
      }
      if (to) {
        (match.createdAt as Record<string, Date>).$lte = to;
      }
    }

    const result = await this.paymentModel
      .aggregate([
        { $match: match },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ])
      .exec();

    return result.length > 0 ? result[0].total : 0;
  }

  private async getExpenseTotal(from?: Date, to?: Date): Promise<number> {
    const match: Record<string, unknown> = {};
    if (from || to) {
      match.date = {};
      if (from) {
        (match.date as Record<string, Date>).$gte = from;
      }
      if (to) {
        (match.date as Record<string, Date>).$lte = to;
      }
    }

    const result = await this.expenseModel
      .aggregate([
        { $match: match },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ])
      .exec();

    return result.length > 0 ? result[0].total : 0;
  }

  private async getInitialOrderIncomeByMonth(from: Date, to: Date) {
    return this.getInitialOrderIncomeAggregate(from, to, { $month: '$createdAt' });
  }

  private async getPaymentIncomeByMonth(from: Date, to: Date) {
    return this.paymentModel
      .aggregate([
        { $match: { createdAt: { $gte: from, $lte: to } } },
        {
          $group: {
            _id: { $month: '$createdAt' },
            total: { $sum: '$amount' },
          },
        },
      ])
      .exec();
  }

  private async getSupplierPaymentTotal(from?: Date, to?: Date): Promise<number> {
    const match: Record<string, unknown> = {};
    if (from || to) {
      match.createdAt = {};
      if (from) {
        (match.createdAt as Record<string, Date>).$gte = from;
      }
      if (to) {
        (match.createdAt as Record<string, Date>).$lte = to;
      }
    }

    const result = await this.supplierPaymentModel
      .aggregate([
        { $match: match },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ])
      .exec();

    return result.length > 0 ? result[0].total : 0;
  }

  private async getSupplierPaymentsByMonth(from: Date, to: Date) {
    return this.supplierPaymentModel
      .aggregate([
        { $match: { createdAt: { $gte: from, $lte: to } } },
        {
          $group: {
            _id: { $month: '$createdAt' },
            total: { $sum: '$amount' },
          },
        },
      ])
      .exec();
  }

  private async getExpensesByMonth(from: Date, to: Date) {
    return this.expenseModel
      .aggregate([
        { $match: { date: { $gte: from, $lte: to } } },
        {
          $group: {
            _id: { $month: '$date' },
            total: { $sum: '$amount' },
          },
        },
      ])
      .exec();
  }

  private async getInitialOrderIncomeAggregate(
    from?: Date,
    to?: Date,
    groupId: Record<string, unknown> | null = null,
  ) {
    const match: Record<string, unknown> = { status: { $ne: 'CANCELLED' } };

    if (from || to) {
      match.createdAt = {};
      if (from) {
        (match.createdAt as Record<string, Date>).$gte = from;
      }
      if (to) {
        (match.createdAt as Record<string, Date>).$lte = to;
      }
    }

    return this.orderModel
      .aggregate([
        { $match: match },
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
            createdAt: 1,
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
            _id: groupId,
            total: { $sum: '$recognizedIncome' },
          },
        },
      ])
      .exec();
  }

  private mapMonthlyTotals(items: Array<{ _id: number; total: number }>) {
    const map = new Map<number, number>();
    for (const item of items) {
      map.set(item._id, item.total);
    }
    return map;
  }
}
