import client from './client';
import type { PaginatedResponse } from '@plastmassa/shared';

export interface AttendanceRecord {
  _id: string;
  user: any;
  date: string;
  status: string;
  hoursWorked: number;
  overtimeHours: number;
  notes?: string;
  markedBy: any;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  leave: number;
}

export interface MonthlyReport {
  records: AttendanceRecord[];
  summary: {
    totalDays: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    halfDays: number;
    leaveDays: number;
    totalHoursWorked: number;
    totalOvertimeHours: number;
  };
}

export interface AttendanceQuery {
  page?: number;
  limit?: number;
  user?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface BulkAttendanceData {
  date: string;
  records: Array<{
    user: string;
    status: string;
    hoursWorked?: number;
    overtimeHours?: number;
    notes?: string;
  }>;
}

export const attendanceApi = {
  getAll: (params?: AttendanceQuery) =>
    client.get<PaginatedResponse<AttendanceRecord>>('/attendance', { params }).then((r) => r.data),
  getById: (id: string) =>
    client.get<AttendanceRecord>(`/attendance/${id}`).then((r) => r.data),
  create: (data: any) =>
    client.post<AttendanceRecord>('/attendance', data).then((r) => r.data),
  bulkCreate: (data: BulkAttendanceData) =>
    client.post('/attendance/bulk', data).then((r) => r.data),
  getByDate: (date: string) =>
    client.get<AttendanceRecord[]>(`/attendance/date/${date}`).then((r) => r.data),
  getDateSummary: (date: string) =>
    client.get<AttendanceSummary>(`/attendance/date/${date}/summary`).then((r) => r.data),
  getByUser: (userId: string, params?: AttendanceQuery) =>
    client.get<PaginatedResponse<AttendanceRecord>>(`/attendance/user/${userId}`, { params }).then((r) => r.data),
  getMonthlyReport: (userId: string, year: number, month: number) =>
    client.get<MonthlyReport>(`/attendance/user/${userId}/monthly`, { params: { year, month } }).then((r) => r.data),
};
