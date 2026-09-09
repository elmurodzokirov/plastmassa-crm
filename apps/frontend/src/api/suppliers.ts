import client from './client';
import type { Supplier, SupplierPayment, PaginatedResponse } from '@plastmassa/shared';

export interface SupplierQuery {
  page?: number;
  limit?: number;
  search?: string;
  hasDebt?: boolean;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SupplierUpsertInput {
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
  currentDebt?: number;
}

export interface SupplierPaymentQuery {
  page?: number;
  limit?: number;
  supplier?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SupplierPaymentCreateInput {
  supplier: string;
  amount: number;
  type: 'CASH' | 'TRANSFER' | 'CARD';
  notes?: string;
}

export const suppliersApi = {
  getAll: (params?: SupplierQuery) =>
    client.get<PaginatedResponse<Supplier>>('/suppliers', { params }).then((r) => r.data),

  getById: (id: string) =>
    client.get<Supplier>(`/suppliers/${id}`).then((r) => r.data),

  create: (data: SupplierUpsertInput) =>
    client.post<Supplier>('/suppliers', data).then((r) => r.data),

  update: (id: string, data: Partial<SupplierUpsertInput> & { isActive?: boolean }) =>
    client.patch<Supplier>(`/suppliers/${id}`, data).then((r) => r.data),

  setBalance: (id: string, amount: number) =>
    client.patch<Supplier>(`/suppliers/${id}/balance`, { amount }).then((r) => r.data),

  delete: (id: string) =>
    client.delete(`/suppliers/${id}`).then((r) => r.data),

  getCreditors: () =>
    client.get<Supplier[]>('/suppliers/creditors').then((r) => r.data),

  getPayments: (params?: SupplierPaymentQuery) =>
    client.get<PaginatedResponse<SupplierPayment>>('/suppliers/payments', { params }).then((r) => r.data),

  createPayment: (data: SupplierPaymentCreateInput) =>
    client.post<SupplierPayment>('/suppliers/payments', data).then((r) => r.data),
};
