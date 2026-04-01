import client from './client';
import type { PaginatedResponse } from '@plastmassa/shared';

export interface AdvanceData {
  _id: string;
  user: any;
  amount: number;
  date: string;
  notes?: string;
  status: string;
  approvedBy?: any;
  createdBy: any;
  createdAt: string;
}

export interface PayrollData {
  _id: string;
  user: any;
  year: number;
  month: number;
  baseSalary: number;
  workingDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  totalHoursWorked: number;
  overtimeHours: number;
  overtimeAmount: number;
  deductions: number;
  advancesTotal: number;
  bonus: number;
  netSalary: number;
  status: string;
  notes?: string;
  calculatedBy: any;
  createdAt: string;
}

export interface AdvanceQuery {
  page?: number;
  limit?: number;
  user?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PayrollQuery {
  page?: number;
  limit?: number;
  user?: string;
  year?: number;
  month?: number;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const payrollApi = {
  // Advances
  getAdvances: (params?: AdvanceQuery) =>
    client.get<PaginatedResponse<AdvanceData>>('/payroll/advances', { params }).then((r) => r.data),
  getAdvanceById: (id: string) =>
    client.get<AdvanceData>(`/payroll/advances/${id}`).then((r) => r.data),
  createAdvance: (data: any) =>
    client.post<AdvanceData>('/payroll/advances', data).then((r) => r.data),
  updateAdvanceStatus: (id: string, status: string) =>
    client.patch(`/payroll/advances/${id}/status`, { status }).then((r) => r.data),
  getAdvancesByUser: (userId: string) =>
    client.get<AdvanceData[]>(`/payroll/advances/user/${userId}`).then((r) => r.data),

  // Payroll
  getPayrolls: (params?: PayrollQuery) =>
    client.get<PaginatedResponse<PayrollData>>('/payroll', { params }).then((r) => r.data),
  getPayrollById: (id: string) =>
    client.get<PayrollData>(`/payroll/${id}`).then((r) => r.data),
  calculatePayroll: (data: any) =>
    client.post<PayrollData>('/payroll/calculate', data).then((r) => r.data),
  bulkCalculate: (data: any) =>
    client.post('/payroll/calculate/bulk', data).then((r) => r.data),
  updatePayrollStatus: (id: string, status: string) =>
    client.patch(`/payroll/${id}/status`, { status }).then((r) => r.data),
  getPayrollByMonth: (year: number, month: number) =>
    client.get<PayrollData[]>(`/payroll/month/${year}/${month}`).then((r) => r.data),
  getPayrollSlip: (id: string) =>
    client.get<PayrollData>(`/payroll/${id}/slip`).then((r) => r.data),
};
