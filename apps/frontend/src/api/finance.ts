import client from './client';
import type { PaginatedResponse } from '@plastmassa/shared';

// ── Types ────────────────────────────────────────────────────────────

export interface ExpenseData {
  _id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  paymentMethod: string;
  notes?: string;
  createdBy?: any;
  createdAt: string;
  updatedAt?: string;
}

export interface ExpenseQuery {
  page?: number;
  limit?: number;
  category?: string;
  paymentMethod?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ExpenseStats {
  totalExpenses: number;
  byCategory: { _id: string; total: number; count: number }[];
  byPaymentMethod: { _id: string; total: number; count: number }[];
}

export interface DebtorData {
  _id: string;
  name: string;
  phone?: string;
  totalDebt: number;
  creditLimit: number;
}

export interface CreditorData {
  _id: string;
  name: string;
  phone?: string;
  totalDebt: number;
}

export interface CashFlowData {
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  transactions?: any[];
}

export interface MonthlyCashFlowItem {
  month: number;
  income: number;
  expense: number;
  net: number;
}

export interface FinanceSummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  totalDebt: number;
  totalCredit: number;
  cashOnHand: number;
}

export interface ProfitAndLossData {
  totalRevenue: number;
  totalExpenses: number;
  grossProfit?: number;
  netProfit: number;
  revenueByProduct: { name: string; total: number; quantity?: number }[];
  expensesByCategory: { category: string; total: number; count: number }[];
}

export type FinanceTransactionType = 'ORDER_INCOME' | 'PAYMENT' | 'EXPENSE' | 'SUPPLIER_PAYMENT' | 'RETURN_REFUND';

export interface FinanceTransaction {
  _id: string;
  type: FinanceTransactionType;
  direction: 'IN' | 'OUT';
  amount: number;
  date: string;
  title: string;
  subtitle?: string;
  detail: {
    orderNumber?: string;
    customerName?: string;
    customerPhone?: string;
    supplierName?: string;
    supplierPhone?: string;
    paymentType?: string;
    orderTotal?: number;
    items?: { productName: string; quantity: number; unitName: string; price: number; total: number }[];
    category?: string;
    description?: string;
    paymentMethod?: string;
    notes?: string;
    reason?: string;
    returnTotal?: number;
  };
  /** Running cash balance at this point in the feed — only set when returned
   *  in chronological (oldest-first) order, i.e. by getTransactions. */
  balance?: number;
}

export interface TodayTransactionsData {
  items: FinanceTransaction[];
  totalIncome: number;
  totalExpense: number;
}

export interface TransactionsLedgerParams {
  dateFrom: string;
  dateTo: string;
}

export interface TransactionsLedgerData {
  items: FinanceTransaction[];
  totalIncome: number;
  totalExpense: number;
  closingBalance: number;
}

// ── API Client ───────────────────────────────────────────────────────

export const financeApi = {
  // Expenses
  getExpenses: (params?: ExpenseQuery) =>
    client.get<PaginatedResponse<ExpenseData>>('/expenses', { params }).then((r) => r.data),
  getExpenseById: (id: string) =>
    client.get<ExpenseData>(`/expenses/${id}`).then((r) => r.data),
  createExpense: (data: Partial<ExpenseData>) =>
    client.post<ExpenseData>('/expenses', data).then((r) => r.data),
  updateExpense: (id: string, data: Partial<ExpenseData>) =>
    client.put<ExpenseData>(`/expenses/${id}`, data).then((r) => r.data),
  deleteExpense: (id: string) =>
    client.delete(`/expenses/${id}`).then((r) => r.data),
  getExpenseStats: (params?: { dateFrom?: string; dateTo?: string }) =>
    client.get<ExpenseStats>('/expenses/stats', { params }).then((r) => r.data),

  // Finance
  getDebtors: () =>
    client.get<DebtorData[]>('/finance/debtors').then((r) => r.data),
  getCreditors: () =>
    client.get<CreditorData[]>('/finance/creditors').then((r) => r.data),
  getCashFlow: (params: { dateFrom?: string; dateTo?: string }) =>
    client.get<CashFlowData>('/finance/cash-flow', { params }).then((r) => r.data),
  getMonthlyCashFlow: (year: number) =>
    client.get<MonthlyCashFlowItem[]>(`/finance/cash-flow/monthly`, { params: { year } }).then((r) => r.data),
  getTodayTransactions: () =>
    client.get<TodayTransactionsData>('/finance/transactions/today').then((r) => r.data),
  getTransactions: (params: TransactionsLedgerParams) =>
    client.get<TransactionsLedgerData>('/finance/transactions', { params }).then((r) => r.data),
  getFinanceSummary: () =>
    client.get<FinanceSummary>('/finance/summary').then((r) => r.data),
  getProfitAndLoss: (params: { dateFrom?: string; dateTo?: string }) =>
    client.get<ProfitAndLossData>('/finance/p-and-l', { params }).then((r) => r.data),
};
