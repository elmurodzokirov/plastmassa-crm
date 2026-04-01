import client from './client';
import type { Order, PaginatedResponse } from '@plastmassa/shared';

export interface OrderQuery {
  page?: number;
  limit?: number;
  search?: string;
  customer?: string;
  status?: string;
  paymentType?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const ordersApi = {
  getAll: (params?: OrderQuery) =>
    client.get<PaginatedResponse<Order>>('/orders', { params }).then((r) => r.data),
  getById: (id: string) =>
    client.get<Order>(`/orders/${id}`).then((r) => r.data),
  create: (data: any) =>
    client.post<Order>('/orders', data).then((r) => r.data),
  updateStatus: (id: string, status: string) =>
    client.patch<Order>(`/orders/${id}/status`, { status }).then((r) => r.data),
  getCheck: (id: string) =>
    client.get<Order>(`/orders/${id}/check`).then((r) => r.data),
  getByCustomer: (customerId: string, params?: OrderQuery) =>
    client
      .get<PaginatedResponse<Order>>(`/orders/customer/${customerId}`, { params })
      .then((r) => r.data),
  getOverdueDebts: () =>
    client.get('/orders/overdue-debts').then((r) => r.data),
  update: (id: string, data: Record<string, unknown>) =>
    client.patch<Order>(`/orders/${id}/edit`, data).then((r) => r.data),
  deliver: (id: string, data: { deliveredTo: string; deliveryNotes?: string }) =>
    client.patch(`/orders/${id}/deliver`, data).then((r) => r.data),
};
