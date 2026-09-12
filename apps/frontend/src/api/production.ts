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
  pieceRateAmount: number;
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

export interface ProductionBatchGroup {
  batchNumber: string;
  date: string;
  worker: any;
  itemCount: number;
  totalQuantity: number;
  totalMaterialCost: number;
  createdAt: string;
  productNames: string[];
}

export interface ProductionBatchEdit {
  userName: string;
  changedAt: string;
  field: string;
  oldValue?: string;
  newValue?: string;
  productName: string;
}

export interface ProductionBatchDetail {
  batchNumber: string;
  date: string;
  worker: any;
  notes?: string;
  items: (ProductionLogData & { locked: boolean })[];
  editHistory: ProductionBatchEdit[];
}

export interface ProductionBatchQuery {
  page?: number;
  limit?: number;
  worker?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateProductionLogBatchItemInput {
  product: string;
  quantityProduced: number;
}

export interface CreateProductionLogBatchInput {
  worker: string;
  date: string;
  notes?: string;
  items: CreateProductionLogBatchItemInput[];
}

export interface UpdateProductionLogBatchItemInput {
  _id?: string;
  product: string;
  quantityProduced: number;
}

export interface UpdateProductionLogBatchInput {
  worker?: string;
  date?: string;
  notes?: string;
  items: UpdateProductionLogBatchItemInput[];
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

  // Batches ("hujjat" — one or more logs created/edited together)
  createLogsBatch: (data: CreateProductionLogBatchInput) =>
    client.post<ProductionLogData[]>('/production/logs/batch', data).then((r) => r.data),
  getBatches: (params?: ProductionBatchQuery) =>
    client.get<PaginatedResponse<ProductionBatchGroup>>('/production/logs/batches', { params }).then((r) => r.data),
  getBatchDetail: (batchNumber: string) =>
    client.get<ProductionBatchDetail>(`/production/logs/batches/${batchNumber}`).then((r) => r.data),
  updateBatch: (batchNumber: string, data: UpdateProductionLogBatchInput) =>
    client.patch<ProductionBatchDetail>(`/production/logs/batches/${batchNumber}`, data).then((r) => r.data),
};
