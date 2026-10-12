import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
import {
  CashOperation,
  CashOperationDocument,
  CASH_IN_KINDS,
} from './schemas/cash-operation.schema';
import { CreateCashOperationDto } from './dto/create-cash-operation.dto';
import { CancelDto } from '../../common/dto/cancel.dto';

type Account = 'CASH' | 'BANK' | 'CARD';
type AccountTotals = Record<Account, number>;

const ACCOUNTS: Account[] = ['CASH', 'BANK', 'CARD'];
const PAYMENT_TYPE_TO_ACCOUNT: Record<string, Account> = {
  CASH: 'CASH',
  TRANSFER: 'BANK',
  CARD: 'CARD',
};
const EXPENSE_METHOD_TO_ACCOUNT: Record<string, Account> = {
  cash: 'CASH',
  bank: 'BANK',
  card: 'CARD',
};
const CASH_OPERATION_TITLES: Record<string, string> = {
  OPENING: "Boshlang'ich qoldiq",
  CAPITAL_IN: "Egasi kassaga pul qo'shdi",
  LOAN_IN: 'Kredit / qarz olindi',
  OTHER_IN: 'Boshqa kirim',
  WITHDRAWAL: 'Egasi pul yechib oldi',
  LOAN_REPAYMENT: "Kredit / qarz to'landi",
  OTHER_OUT: 'Boshqa chiqim',
};

const emptyTotals = (): AccountTotals => ({ CASH: 0, BANK: 0, CARD: 0 });
const sumTotals = (t: AccountTotals) => t.CASH + t.BANK + t.CARD;

interface PeriodTotals {
  /** Money received in the period, by account (excludes OPENING balance entries). */
  in: AccountTotals;
  /** Money paid out in the period, by account. */
  out: AccountTotals;
  /** OPENING-balance entries in the period, by account. */
  opening: AccountTotals;
  parts: {
    orders: number;
    payments: number;
    expenses: number;
    supplierPayments: number;
    refunds: number;
  };
}

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
    @InjectModel(CashOperation.name)
    private readonly cashOperationModel: Model<CashOperationDocument>,
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

  // ── Account-aware totals ────────────────────────────────────────────

  /** Sums every kind of cash movement inside [from, to] (either bound optional),
   *  split by account (Naqd / Bank / Karta). Cancelled records are ignored. */
  private async sumByAccount(from?: Date, to?: Date): Promise<PeriodTotals> {
    const range = (field: string) => {
      if (!from && !to) return {};
      const r: Record<string, Date> = {};
      if (from) r.$gte = from;
      if (to) r.$lte = to;
      return { [field]: r };
    };
    const active = { status: { $ne: 'CANCELLED' } };

    const [orderIncome, payAgg, expAgg, spAgg, refundAgg, opAgg] =
      await Promise.all([
        this.getInitialOrderIncomeTotal(from, to),
        this.paymentModel
          .aggregate([
            { $match: { ...range('createdAt'), ...active } },
            { $group: { _id: '$type', total: { $sum: '$amount' } } },
          ])
          .exec(),
        this.expenseModel
          .aggregate([
            { $match: { ...range('date'), ...active } },
            { $group: { _id: '$paymentMethod', total: { $sum: '$amount' } } },
          ])
          .exec(),
        this.supplierPaymentModel
          .aggregate([
            { $match: { ...range('createdAt'), ...active } },
            { $group: { _id: '$type', total: { $sum: '$amount' } } },
          ])
          .exec(),
        this.returnModel
          .aggregate([
            {
              $match: {
                status: 'APPROVED',
                refundAmount: { $gt: 0 },
                ...range('approvedAt'),
              },
            },
            { $group: { _id: null, total: { $sum: '$refundAmount' } } },
          ])
          .exec(),
        this.cashOperationModel
          .aggregate([
            { $match: { ...range('date'), ...active } },
            {
              $group: {
                _id: { account: '$account', kind: '$kind', direction: '$direction' },
                total: { $sum: '$amount' },
              },
            },
          ])
          .exec(),
      ]);

    const inT = emptyTotals();
    const outT = emptyTotals();
    const openingT = emptyTotals();

    // Order initial payments are recorded as cash received at the register.
    inT.CASH += orderIncome;

    let payments = 0;
    for (const row of payAgg) {
      inT[PAYMENT_TYPE_TO_ACCOUNT[row._id] || 'CASH'] += row.total;
      payments += row.total;
    }

    let expenses = 0;
    for (const row of expAgg) {
      outT[EXPENSE_METHOD_TO_ACCOUNT[row._id] || 'CASH'] += row.total;
      expenses += row.total;
    }

    let supplierPayments = 0;
    for (const row of spAgg) {
      outT[PAYMENT_TYPE_TO_ACCOUNT[row._id] || 'CASH'] += row.total;
      supplierPayments += row.total;
    }

    const refunds = refundAgg.length > 0 ? refundAgg[0].total : 0;
    outT.CASH += refunds;

    for (const row of opAgg) {
      const account = (row._id.account as Account) || 'CASH';
      if (row._id.kind === 'OPENING') {
        openingT[account] += row.total;
      } else if (row._id.direction === 'IN') {
        inT[account] += row.total;
      } else {
        outT[account] += row.total;
      }
    }

    return {
      in: inT,
      out: outT,
      opening: openingT,
      parts: { orders: orderIncome, payments, expenses, supplierPayments, refunds },
    };
  }

  private balancesOf(t: PeriodTotals): AccountTotals {
    const result = emptyTotals();
    for (const a of ACCOUNTS) {
      result[a] = t.opening[a] + t.in[a] - t.out[a];
    }
    return result;
  }

  /** Account balances as of the moment just before `date` (all history). */
  private async balancesBefore(date: Date): Promise<AccountTotals> {
    if (date.getTime() <= 0) return emptyTotals();
    return this.balancesOf(await this.sumByAccount(undefined, new Date(date.getTime() - 1)));
  }

  async getCashFlow(dateFrom: string, dateTo: string) {
    const { from, to } = this.buildDateRange(dateFrom, dateTo);

    const [period, openingBalances, closingTotals] = await Promise.all([
      this.sumByAccount(from, to),
      this.balancesBefore(from),
      this.sumByAccount(undefined, to),
    ]);

    const totalIncome = sumTotals(period.in);
    const totalExpense = sumTotals(period.out);
    const netProfit = totalIncome - totalExpense;
    const accountBalances = this.balancesOf(closingTotals);

    return {
      totalIncome,
      totalExpense,
      netProfit,
      income: totalIncome,
      expenses: totalExpense,
      net: netProfit,
      openingBalance: sumTotals(openingBalances),
      closingBalance: sumTotals(accountBalances),
      accountBalances,
      period: { from: dateFrom, to: dateTo },
    };
  }

  async getMonthlyCashFlow(year: number) {
    const startOfYear = new Date(Date.UTC(year, 0, 1));
    const endOfYear = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
    const active = { status: { $ne: 'CANCELLED' } };
    const byMonth = (field: string, extraMatch: Record<string, unknown>, model: Model<any>) =>
      model
        .aggregate([
          {
            $match: {
              [field]: { $gte: startOfYear, $lte: endOfYear },
              ...extraMatch,
            },
          },
          { $group: { _id: { $month: `$${field}` }, total: { $sum: '$amount' } } },
        ])
        .exec();

    const [
      initialIncomeByMonth,
      paymentIncomeByMonth,
      expensesByMonth,
      supplierPaymentsByMonth,
      refundsByMonth,
      cashInByMonth,
      cashOutByMonth,
    ] = await Promise.all([
      this.getInitialOrderIncomeByMonth(startOfYear, endOfYear),
      byMonth('createdAt', active, this.paymentModel),
      byMonth('date', active, this.expenseModel),
      byMonth('createdAt', active, this.supplierPaymentModel),
      this.returnModel
        .aggregate([
          {
            $match: {
              status: 'APPROVED',
              refundAmount: { $gt: 0 },
              approvedAt: { $gte: startOfYear, $lte: endOfYear },
            },
          },
          { $group: { _id: { $month: '$approvedAt' }, total: { $sum: '$refundAmount' } } },
        ])
        .exec(),
      byMonth('date', { ...active, direction: 'IN', kind: { $ne: 'OPENING' } }, this.cashOperationModel),
      byMonth('date', { ...active, direction: 'OUT' }, this.cashOperationModel),
    ]);

    const initialIncomeMap = this.mapMonthlyTotals(initialIncomeByMonth);
    const paymentIncomeMap = this.mapMonthlyTotals(paymentIncomeByMonth);
    const expenseMap = this.mapMonthlyTotals(expensesByMonth);
    const supplierPaymentMap = this.mapMonthlyTotals(supplierPaymentsByMonth);
    const refundMap = this.mapMonthlyTotals(refundsByMonth);
    const cashInMap = this.mapMonthlyTotals(cashInByMonth);
    const cashOutMap = this.mapMonthlyTotals(cashOutByMonth);

    const months = [];
    for (let month = 1; month <= 12; month++) {
      const income =
        (initialIncomeMap.get(month) || 0) +
        (paymentIncomeMap.get(month) || 0) +
        (cashInMap.get(month) || 0);
      const expense =
        (expenseMap.get(month) || 0) +
        (supplierPaymentMap.get(month) || 0) +
        (refundMap.get(month) || 0) +
        (cashOutMap.get(month) || 0);
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
    const [orders, payments, expenses, supplierPayments, returnRefunds, cashOps, openingBalances] =
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
        this.cashOperationModel
          .find({ date: { $gte: from, $lte: to } })
          .exec(),
        this.balancesBefore(from),
      ]);

    const transactions: any[] = [];

    const cancelInfo = (doc: any) =>
      doc.status === 'CANCELLED'
        ? {
            cancelled: true,
            cancelReason: doc.cancelReason,
            cancelledAt: doc.cancelledAt,
          }
        : {};

    for (const order of orders) {
      const customer = order.customer as any;
      transactions.push({
        _id: order._id.toString(),
        type: 'ORDER_INCOME',
        direction: 'IN',
        account: 'CASH',
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
        account: PAYMENT_TYPE_TO_ACCOUNT[payment.type] || 'CASH',
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
        ...cancelInfo(payment),
      });
    }

    for (const expense of expenses) {
      transactions.push({
        _id: expense._id.toString(),
        type: 'EXPENSE',
        direction: 'OUT',
        account: EXPENSE_METHOD_TO_ACCOUNT[expense.paymentMethod] || 'CASH',
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
        ...cancelInfo(expense),
      });
    }

    for (const sp of supplierPayments) {
      const supplier = sp.supplier as any;
      transactions.push({
        _id: sp._id.toString(),
        type: 'SUPPLIER_PAYMENT',
        direction: 'OUT',
        account: PAYMENT_TYPE_TO_ACCOUNT[sp.type] || 'CASH',
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
        ...cancelInfo(sp),
      });
    }

    for (const ret of returnRefunds) {
      const customer = ret.customer as any;
      transactions.push({
        _id: ret._id.toString(),
        type: 'RETURN_REFUND',
        direction: 'OUT',
        account: 'CASH',
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

    for (const op of cashOps) {
      transactions.push({
        _id: op._id.toString(),
        type: 'CASH_OPERATION',
        direction: op.direction,
        account: op.account,
        amount: op.amount,
        date: op.date,
        title: CASH_OPERATION_TITLES[op.kind] || op.kind,
        subtitle: op.notes,
        isOpening: op.kind === 'OPENING',
        detail: {
          kind: op.kind,
          notes: op.notes,
        },
        ...cancelInfo(op),
      });
    }

    transactions.sort((a, b) =>
      order === 'asc'
        ? new Date(a.date).getTime() - new Date(b.date).getTime()
        : new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    // Running balance is computed in chronological order regardless of the
    // array's display order, starting from the balance carried over from
    // before the period. Cancelled entries don't move the balance.
    const chronological =
      order === 'asc' ? transactions : [...transactions].reverse();
    const openingBalance = sumTotals(openingBalances);
    let runningBalance = openingBalance;
    for (const t of chronological) {
      if (t.cancelled) {
        t.balance = runningBalance;
        continue;
      }
      runningBalance += t.direction === 'IN' ? t.amount : -t.amount;
      t.balance = runningBalance;
    }

    // Opening-balance entries are a starting point, not income/expense.
    const counted = transactions.filter((t) => !t.cancelled && !t.isOpening);
    const totalIncome = counted
      .filter((t) => t.direction === 'IN')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = counted
      .filter((t) => t.direction === 'OUT')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      items: transactions,
      totalIncome,
      totalExpense,
      openingBalance,
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
    const [totals, debtResult, creditResult] = await Promise.all([
      this.sumByAccount(),
      this.customerModel
        .aggregate([
          { $match: { currentDebt: { $gt: 0 } } },
          { $group: { _id: null, total: { $sum: '$currentDebt' } } },
        ])
        .exec(),
      this.supplierModel
        .aggregate([
          { $match: { currentDebt: { $gt: 0 } } },
          { $group: { _id: null, total: { $sum: '$currentDebt' } } },
        ])
        .exec(),
    ]);

    const totalRevenue = totals.parts.orders + totals.parts.payments;
    const totalExpenses =
      totals.parts.expenses + totals.parts.supplierPayments + totals.parts.refunds;
    const totalDebt = debtResult.length > 0 ? debtResult[0].total : 0;
    const totalCredit = creditResult.length > 0 ? creditResult[0].total : 0;
    const netProfit = totalRevenue - totalExpenses;
    const balances = this.balancesOf(totals);

    return {
      totalRevenue,
      totalExpenses,
      totalDebt,
      totalCredit,
      netProfit,
      // Real money in the register right now (all history): opening balances
      // + every cash-in − every cash-out, split by account.
      cashOnHand: sumTotals(balances),
      accountBalances: balances,
    };
  }

  // ── Manual cash operations (opening balance, owner top-up/withdrawal, loans...) ──

  async createCashOperation(dto: CreateCashOperationDto, userId: string) {
    const direction = (CASH_IN_KINDS as readonly string[]).includes(dto.kind)
      ? 'IN'
      : 'OUT';

    const operation = new this.cashOperationModel({
      kind: dto.kind,
      direction,
      account: dto.account,
      amount: dto.amount,
      date: new Date(dto.date),
      notes: dto.notes ?? '',
      createdBy: userId,
    });

    return operation.save();
  }

  async findCashOperations(direction?: string) {
    const filter: Record<string, unknown> = {};
    if (direction) filter.direction = direction;

    const items = await this.cashOperationModel
      .find(filter)
      .populate('createdBy', 'fullName username')
      .sort({ date: -1, createdAt: -1 })
      .exec();

    return { items };
  }

  async cancelCashOperation(id: string, dto: CancelDto, userId: string) {
    const operation = await this.cashOperationModel.findById(id).exec();

    if (!operation) {
      throw new NotFoundException('Kassa operatsiyasi topilmadi');
    }

    if (operation.status === 'CANCELLED') {
      throw new BadRequestException('Operatsiya allaqachon bekor qilingan');
    }

    operation.status = 'CANCELLED';
    operation.cancelledAt = new Date();
    operation.cancelledBy = userId as any;
    operation.cancelReason = dto.reason;
    return operation.save();
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
          {
            $match: {
              date: { $gte: from, $lte: to },
              status: { $ne: 'CANCELLED' },
            },
          },
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

  private async getInitialOrderIncomeByMonth(from: Date, to: Date) {
    return this.getInitialOrderIncomeAggregate(from, to, { $month: '$createdAt' });
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
