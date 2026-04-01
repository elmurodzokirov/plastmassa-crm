import client from './client';
import type { Payment, PaginatedResponse } from '@plastmassa/shared';

export interface PaymentQuery {
  page?: number;
  limit?: number;
  customer?: string;
  order?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const paymentsApi = {
  getAll: (params?: PaymentQuery) =>
    client.get<PaginatedResponse<Payment>>('/payments', { params }).then((r) => r.data),
  getById: (id: string) =>
    client.get<Payment>(`/payments/${id}`).then((r) => r.data),
  create: (data: any) =>
    client.post<Payment>('/payments', data).then((r) => r.data),
  getByCustomer: (customerId: string) =>
    client.get<Payment[]>(`/payments/customer/${customerId}`).then((r) => r.data),
  getByOrder: (orderId: string) =>
    client.get<Payment[]>(`/payments/order/${orderId}`).then((r) => r.data),
};
