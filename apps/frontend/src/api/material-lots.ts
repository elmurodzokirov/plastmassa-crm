import client from './client';
import type { MaterialLot, PaginatedResponse } from '@plastmassa/shared';

export interface MaterialLotQuery {
  page?: number;
  limit?: number;
  material?: string;
  supplier?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface MaterialLotCreateInput {
  material: string;
  quantity: number;
  unit: string;
  unitCost: number;
  supplier?: string;
  paidAmount?: number;
  notes?: string;
}

export const materialLotsApi = {
  getAll: (params?: MaterialLotQuery) =>
    client.get<PaginatedResponse<MaterialLot>>('/material-lots', { params }).then((r) => r.data),
  getByMaterial: (materialId: string, params?: MaterialLotQuery) =>
    client.get<PaginatedResponse<MaterialLot>>(`/material-lots/material/${materialId}`, { params }).then((r) => r.data),
  getAverageCost: (materialId: string) =>
    client.get<{ cost: number }>(`/material-lots/material/${materialId}/average-cost`).then((r) => r.data),
  create: (data: MaterialLotCreateInput) =>
    client.post<MaterialLot>('/material-lots', data).then((r) => r.data),
};
