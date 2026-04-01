import client from './client';
import type { Product, PaginatedResponse } from '@plastmassa/shared';

export interface ProductQuery {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const productsApi = {
  getAll: (params?: ProductQuery) =>
    client.get<PaginatedResponse<Product>>('/products', { params }).then((r) => r.data),
  getById: (id: string) =>
    client.get<Product>(`/products/${id}`).then((r) => r.data),
  create: (data: any) =>
    client.post<Product>('/products', data).then((r) => r.data),
  update: (id: string, data: any) =>
    client.patch<Product>(`/products/${id}`, data).then((r) => r.data),
  delete: (id: string) =>
    client.delete(`/products/${id}`).then((r) => r.data),
};
