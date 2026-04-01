import client from './client';
import type { StockMovement, PaginatedResponse } from '@plastmassa/shared';

export interface StockMovementQuery {
  page?: number;
  limit?: number;
  type?: string;
  product?: string;
  material?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const stockApi = {
  getMovements: (params?: StockMovementQuery) =>
    client.get<PaginatedResponse<StockMovement>>('/stock/movements', { params }).then((r) => r.data),
  getMovementById: (id: string) =>
    client.get<StockMovement>(`/stock/movements/${id}`).then((r) => r.data),
  createMovement: (data: any) =>
    client.post<StockMovement>('/stock/movements', data).then((r) => r.data),
  getByProduct: (productId: string, params?: StockMovementQuery) =>
    client.get<PaginatedResponse<StockMovement>>(`/stock/movements/product/${productId}`, { params }).then((r) => r.data),
  getByMaterial: (materialId: string, params?: StockMovementQuery) =>
    client.get<PaginatedResponse<StockMovement>>(`/stock/movements/material/${materialId}`, { params }).then((r) => r.data),
};
