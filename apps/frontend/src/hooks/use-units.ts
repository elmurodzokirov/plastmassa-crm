import { useMockableQuery } from '@/mocks/mock-query';
import { mockData } from '@/mocks/data';
import { unitsApi } from '@/api/units';

export function useUnits() {
  return useMockableQuery({
    queryKey: ['units'],
    queryFn: unitsApi.getAll,
    mockData: mockData.units,
  });
}
