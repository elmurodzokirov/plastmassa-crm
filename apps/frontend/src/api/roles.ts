import client from './client';
import type { RoleDoc } from '@plastmassa/shared';

export const rolesApi = {
  findAll: () => client.get<RoleDoc[]>('/roles').then((r) => r.data),
  findById: (id: string) => client.get<RoleDoc>(`/roles/${id}`).then((r) => r.data),
  getAllPermissions: () => client.get<string[]>('/roles/permissions').then((r) => r.data),
  create: (data: { name: string; description?: string; permissions: string[] }) =>
    client.post<RoleDoc>('/roles', data).then((r) => r.data),
  update: (id: string, data: Partial<{ name: string; description?: string; permissions: string[] }>) =>
    client.patch<RoleDoc>(`/roles/${id}`, data).then((r) => r.data),
  delete: (id: string) => client.delete(`/roles/${id}`).then((r) => r.data),
};
