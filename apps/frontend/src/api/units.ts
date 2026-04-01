import client from './client';
import type { Unit } from '@plastmassa/shared';

export const unitsApi = {
  getAll: () => client.get<Unit[]>('/units').then((r) => r.data),
};
