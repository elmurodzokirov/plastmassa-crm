import { useQuery } from '@tanstack/react-query';
import { unitsApi } from '@/api/units';

export function useUnits() {
  return useQuery({
    queryKey: ['units'],
    queryFn: unitsApi.getAll,
  });
}
