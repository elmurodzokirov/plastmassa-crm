import client from './client';

// ── Types ────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalCustomers: number;
  activeOrders: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  totalDebt: number;
  productionToday: number;
  employeeCount: number;
  lowStockProducts: number;
}

export interface RecentOrder {
  _id: string;
  orderNumber: string;
  customer: { _id: string; name: string } | string;
  totalAmount: number;
  status: string;
  createdAt: string;
}

export interface RecentPayment {
  _id: string;
  customer: { _id: string; name: string } | string;
  amount: number;
  type: string;
  createdAt: string;
}

export interface MonthlyRevenueItem {
  month: number;
  year: number;
  revenue: number;
}

export interface SalesChartItem {
  year: number;
  month?: number;
  day?: number;
  totalSales: number;
  totalCost: number;
  grossProfit: number;
  orderCount: number;
}

// ── API Client ───────────────────────────────────────────────────────

export const dashboardApi = {
  getDashboardStats: () =>
    client.get<DashboardStats>('/dashboard/stats').then((r) => r.data),

  getRecentOrders: (limit = 5) =>
    client.get<RecentOrder[]>('/dashboard/recent-orders', { params: { limit } }).then((r) => r.data),

  getRecentPayments: (limit = 5) =>
    client.get<RecentPayment[]>('/dashboard/recent-payments', { params: { limit } }).then((r) => r.data),

  getMonthlyRevenue: (months = 6) =>
    client.get<MonthlyRevenueItem[]>('/dashboard/monthly-revenue', { params: { months } }).then((r) => r.data),

  getSalesChart: (period: 'year' | 'month' | 'day' = 'month', year?: number, month?: number) =>
    client.get<SalesChartItem[]>('/dashboard/sales-chart', { params: { period, year, month } }).then((r) => r.data),
};
