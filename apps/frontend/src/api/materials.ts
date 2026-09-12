import client from './client';
import type { Material, MaterialStats, PaginatedResponse } from '@plastmassa/shared';

export interface MaterialQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  isActive?: boolean;
  lowStock?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface MaterialUpsertInput {
  name: string;
  category?: string;
  baseUnit: string;
  costPrice?: number;
  minStock?: number;
  defaultSupplier?: string;
}

export const materialsApi = {
  getAll: (params?: MaterialQuery) =>
    client.get<PaginatedResponse<Material>>('/materials', { params }).then((r) => r.data),
  getById: (id: string) =>
    client.get<Material>(`/materials/${id}`).then((r) => r.data),
  getStats: () =>
    client.get<MaterialStats>('/materials/stats').then((r) => r.data),
  getCategories: () =>
    client.get<string[]>('/materials/categories').then((r) => r.data),
  create: (data: MaterialUpsertInput) =>
    client.post<Material>('/materials', data).then((r) => r.data),
  update: (id: string, data: Partial<MaterialUpsertInput> & { isActive?: boolean }) =>
    client.patch<Material>(`/materials/${id}`, data).then((r) => r.data),
  delete: (id: string) =>
    client.delete(`/materials/${id}`).then((r) => r.data),
  stockTake: (id: string, quantity: number) =>
    client.patch<Material>(`/materials/${id}/stock-take`, { quantity }).then((r) => r.data),
};
