import client from './client';
import type { Return as ReturnEntity, PaginatedResponse } from '@plastmassa/shared';

export interface ReturnQuery {
  order?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export const returnsApi = {
  getAll: (params?: ReturnQuery) =>
    client.get<PaginatedResponse<ReturnEntity>>('/returns', { params }).then((r) => r.data),
  getById: (id: string) =>
    client.get<ReturnEntity>(`/returns/${id}`).then((r) => r.data),
  create: (data: {
    // Either `order` (return tied to one existing order) or `customer` (a
    // free-form "return from customer" not tied to any order) must be given.
    order?: string;
    customer?: string;
    reason: string;
    refundAmount?: number;
    items: Array<{
      product: string;
      unit: string;
      quantity: number;
      price?: number;
    }>;
  }) =>
    client.post<ReturnEntity>('/returns', data).then((r) => r.data),
  approve: (id: string) =>
    client.patch<ReturnEntity>(`/returns/${id}/approve`, {}).then((r) => r.data),
};
