import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { settingsApi } from '@/api/settings';

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.getSettings(),
  });
}

export function useUpdateSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string | number | boolean }) =>
      settingsApi.updateSetting(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

export function useSeedSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => settingsApi.seedSettings(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}
