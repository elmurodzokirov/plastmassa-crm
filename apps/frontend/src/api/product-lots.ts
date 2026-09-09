import client from './client';
import type { PaginatedResponse, Supplier } from '@plastmassa/shared';

export interface ProductLot {
  _id: string;
  product: any;
  lotNumber: string;
  batchNumber?: string;
  quantity: number;
  unit: any;
  unitCost: number;
  totalCost: number;
  quantityRemaining: number;
  source: 'PURCHASE' | 'PRODUCTION' | 'ADJUSTMENT';
  productionLog?: any;
  purchaseQuantity?: number;
  purchaseUnit?: any;
  supplier?: string | Supplier;
  notes?: string;
  createdBy: any;
  createdAt: string;
  updatedAt: string;
}

export interface ProductLotQuery {
  page?: number;
  limit?: number;
  product?: string;
  supplier?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ProductLotBatchItemInput {
  product: string;
  quantity: number;
  unit: string;
  unitCost: number;
  sellPrice?: number;
}

export interface ProductLotBatchInput {
  supplier?: string;
  paidAmount?: number;
  notes?: string;
  items: ProductLotBatchItemInput[];
}

// ── Grouped "kirim hujjati" (purchase invoice) view ────────────────────────────

export interface ProductLotBatchQuery {
  page?: number;
  limit?: number;
  supplier?: string;
  dateFrom?: string;
  dateTo?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ProductLotBatchGroup {
  batchNumber: string;
  createdAt: string;
  supplier?: Supplier;
  createdBy?: any;
  itemCount: number;
  totalSum: number;
  source: string;
}

export interface ProductLotBatchDetail {
  batchNumber: string;
  createdAt: string;
  supplier?: Supplier;
  createdBy?: any;
  notes?: string;
  items: ProductLot[];
}

export interface UpdateProductLotBatchItemInput {
  _id?: string;
  product?: string;
  quantity: number;
  unit: string;
  unitCost: number;
  sellPrice?: number;
}

export interface UpdateProductLotBatchInput {
  additionalPaidAmount?: number;
  notes?: string;
  items: UpdateProductLotBatchItemInput[];
}

export const productLotsApi = {
  getAll: (params?: ProductLotQuery) =>
    client.get<PaginatedResponse<ProductLot>>('/product-lots', { params }).then((r) => r.data),
  getById: (id: string) =>
    client.get<ProductLot>(`/product-lots/${id}`).then((r) => r.data),
  create: (data: any) =>
    client.post<ProductLot>('/product-lots', data).then((r) => r.data),
  createBatch: (data: ProductLotBatchInput) =>
    client.post<ProductLot[]>('/product-lots/batch', data).then((r) => r.data),
  getByProduct: (productId: string, params?: ProductLotQuery) =>
    client.get<PaginatedResponse<ProductLot>>(`/product-lots/product/${productId}`, { params }).then((r) => r.data),
  getCostHistory: (productId: string) =>
    client.get<ProductLot[]>(`/product-lots/product/${productId}/cost-history`).then((r) => r.data),
  getAllBatches: (params?: ProductLotBatchQuery) =>
    client.get<PaginatedResponse<ProductLotBatchGroup>>('/product-lots/batches', { params }).then((r) => r.data),
  getBatchDetail: (batchNumber: string) =>
    client.get<ProductLotBatchDetail>(`/product-lots/batches/${batchNumber}`).then((r) => r.data),
  updateBatch: (batchNumber: string, data: UpdateProductLotBatchInput) =>
    client.patch<ProductLotBatchDetail>(`/product-lots/batches/${batchNumber}`, data).then((r) => r.data),
};
