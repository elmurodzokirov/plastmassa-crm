import client from './client';

// ── Types ────────────────────────────────────────────────────────────

export interface SalesReportParams {
  dateFrom?: string;
  dateTo?: string;
  groupBy?: 'daily' | 'weekly' | 'monthly';
}

export interface SalesReport {
  totalOrders: number;
  totalAmount: number;
  averageOrder: number;
  byPeriod: Array<{
    period: string;
    orders: number;
    amount: number;
  }>;
  topProducts: Array<{
    name: string;
    quantity: number;
    total: number;
  }>;
  topCustomers: Array<{
    name: string;
    orders: number;
    total: number;
  }>;
}

export interface ProductionReportParams {
  dateFrom?: string;
  dateTo?: string;
}

export interface ProductionReport {
  totalProduced: number;
  totalAmount: number;
  byProduct: Array<{
    name: string;
    quantity: number;
    amount: number;
  }>;
  byWorker: Array<{
    name: string;
    quantity: number;
    amount: number;
  }>;
  daily: Array<{
    date: string;
    quantity: number;
    amount: number;
  }>;
}

export interface StockReportProduct {
  _id: string;
  name: string;
  currentStock: number;
  unit: string;
}

export interface StockReportMaterial {
  _id: string;
  name: string;
  currentStock: number;
  avgCost: number;
  unit: string;
  minStock?: number;
}

export interface StockReport {
  products: StockReportProduct[];
  materials: StockReportMaterial[];
}

export interface AttendanceReportParams {
  year: number;
  month: number;
}

export interface AttendanceReportItem {
  userId: string;
  fullName: string;
  role: string;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  totalHours: number;
  overtimeHours: number;
}

export interface AttendanceReport {
  employees: AttendanceReportItem[];
  summary: {
    totalEmployees: number;
    avgPresent: number;
    avgAbsent: number;
    totalHours: number;
  };
}

// ── API Client ───────────────────────────────────────────────────────

export const reportsApi = {
  getSalesReport: (params?: SalesReportParams) =>
    client.get<SalesReport>('/reports/sales', { params }).then((r) => r.data),

  getProductionReport: (params?: ProductionReportParams) =>
    client.get<ProductionReport>('/reports/production', { params }).then((r) => r.data),

  getStockReport: () =>
    client.get<StockReport>('/reports/stock').then((r) => r.data),

  getAttendanceReport: (params: AttendanceReportParams) =>
    client.get<AttendanceReport>('/reports/attendance', { params }).then((r) => r.data),
};
