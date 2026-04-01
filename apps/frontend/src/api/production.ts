import client from './client';
import type { PaginatedResponse } from '@plastmassa/shared';

export interface ProductionLogData {
  _id: string;
  product: any;
  productName: string;
  unit: any;
  unitName: string;
  date: string;
  quantityProduced: number;
  materialsUsed: any[];
  totalMaterialCost: number;
  costPerUnitProduced: number;
  earnedAmount: number;
  notes?: string;
  worker: any;
  status: 'PENDING' | 'APPROVED';
  approvedBy?: any;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductionLogQuery {
  page?: number;
  limit?: number;
  product?: string;
  search?: string;
  worker?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const productionApi = {
  // Logs
  getLogs: (params?: ProductionLogQuery) =>
    client.get<PaginatedResponse<ProductionLogData>>('/production/logs', { params }).then((r) => r.data),
  getLogById: (id: string) =>
    client.get<ProductionLogData>(`/production/logs/${id}`).then((r) => r.data),
  createLog: (data: any) =>
    client.post<ProductionLogData>('/production/logs', data).then((r) => r.data),
  getDailyLogs: (date: string) =>
    client.get<ProductionLogData[]>('/production/logs/daily', { params: { date } }).then((r) => r.data),
  approveLog: (id: string) =>
    client.patch<ProductionLogData>(`/production/logs/${id}/approve`).then((r) => r.data),
};
