import client from './client';
import type { Machine } from '@plastmassa/shared';

export interface MachineUpsertInput {
  name: string;
  model?: string;
  notes?: string;
}

export const machinesApi = {
  getAll: () => client.get<Machine[]>('/machines').then((r) => r.data),
  create: (data: MachineUpsertInput) =>
    client.post<Machine>('/machines', data).then((r) => r.data),
  update: (id: string, data: Partial<MachineUpsertInput> & { isActive?: boolean }) =>
    client.patch<Machine>(`/machines/${id}`, data).then((r) => r.data),
  delete: (id: string) =>
    client.delete(`/machines/${id}`).then((r) => r.data),
};
