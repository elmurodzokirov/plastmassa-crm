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
  getCashFlow: (params: { dateFrom?: string; dateTo?: string }) =>
    client.get<CashFlowData>('/finance/cash-flow', { params }).then((r) => r.data),
  getMonthlyCashFlow: (year: number) =>
    client.get<MonthlyCashFlowItem[]>(`/finance/cash-flow/monthly`, { params: { year } }).then((r) => r.data),
  getFinanceSummary: () =>
    client.get<FinanceSummary>('/finance/summary').then((r) => r.data),
  getProfitAndLoss: (params: { dateFrom?: string; dateTo?: string }) =>
    client.get<ProfitAndLossData>('/finance/p-and-l', { params }).then((r) => r.data),
};
