import client from './client';
import type { User, PaginatedResponse } from '@plastmassa/shared';

export const usersApi = {
  getAll: (params?: any) =>
    client.get<PaginatedResponse<User>>('/users', { params }).then((r) => r.data),
  getById: (id: string) =>
    client.get<User>(`/users/${id}`).then((r) => r.data),
  create: (data: any) =>
    client.post<User>('/users', data).then((r) => r.data),
  update: (id: string, data: any) =>
    client.patch<User>(`/users/${id}`, data).then((r) => r.data),
  delete: (id: string) =>
    client.delete(`/users/${id}`).then((r) => r.data),
};
