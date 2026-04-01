import client from './client';
import type { Customer, PaginatedResponse } from '@plastmassa/shared';

export interface CustomerQuery {
  page?: number;
  limit?: number;
  search?: string;
  hasDebt?: boolean;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DebtSummary {
  totalDebt: number;
  debtorCount: number;
  averageDebt: number;
}

export const customersApi = {
  getAll: (params?: CustomerQuery) =>
    client.get<PaginatedResponse<Customer>>('/customers', { params }).then((r) => r.data),

  getById: (id: string) =>
    client.get<Customer>(`/customers/${id}`).then((r) => r.data),

  create: (data: Partial<Customer>) =>
    client.post<Customer>('/customers', data).then((r) => r.data),

  update: (id: string, data: Partial<Customer>) =>
    client.patch<Customer>(`/customers/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    client.delete(`/customers/${id}`).then((r) => r.data),

  getDebtors: () =>
    client.get<Customer[]>('/customers/debtors').then((r) => r.data),

  getDebtSummary: () =>
    client.get<DebtSummary>('/customers/debt-summary').then((r) => r.data),
};
