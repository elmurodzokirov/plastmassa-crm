import { useQueryClient } from '@tanstack/react-query';
import { useMockableQuery, useMockableMutation } from '@/mocks/mock-query';
import { mockData } from '@/mocks/data';
import { settingsApi } from '@/api/settings';

export function useSettings() {
  return useMockableQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.getSettings(),
    mockData: mockData.settings,
  });
}

export function useUpdateSetting() {
  const queryClient = useQueryClient();
  return useMockableMutation({
    mutationFn: ({ key, value }: { key: string; value: string | number | boolean }) =>
      settingsApi.updateSetting(key, value),
    mockResult: {} as any,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

export function useSeedSettings() {
  const queryClient = useQueryClient();
  return useMockableMutation({
    mutationFn: () => settingsApi.seedSettings(),
    mockResult: { message: 'Mock seed' } as any,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}
