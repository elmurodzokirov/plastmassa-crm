import client from './client';
import type { PaginatedResponse } from '@plastmassa/shared';

export interface ProductLot {
  _id: string;
  product: any;
  lotNumber: string;
  quantity: number;
  unit: any;
  unitCost: number;
  totalCost: number;
  quantityRemaining: number;
  source: 'PURCHASE' | 'PRODUCTION';
  productionLog?: any;
  purchaseQuantity?: number;
  purchaseUnit?: any;
  supplier?: string;
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

export const productLotsApi = {
  getAll: (params?: ProductLotQuery) =>
    client.get<PaginatedResponse<ProductLot>>('/product-lots', { params }).then((r) => r.data),
  getById: (id: string) =>
    client.get<ProductLot>(`/product-lots/${id}`).then((r) => r.data),
  create: (data: any) =>
    client.post<ProductLot>('/product-lots', data).then((r) => r.data),
  getByProduct: (productId: string, params?: ProductLotQuery) =>
    client.get<PaginatedResponse<ProductLot>>(`/product-lots/product/${productId}`, { params }).then((r) => r.data),
  getCostHistory: (productId: string) =>
    client.get<ProductLot[]>(`/product-lots/product/${productId}/cost-history`).then((r) => r.data),
};
