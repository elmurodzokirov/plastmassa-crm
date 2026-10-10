import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { returnsApi, ReturnQuery } from '@/api/returns';
import { invalidateFinanceQueries } from './use-finance';
import { invalidateDashboardQueries } from './use-dashboard';

export function useReturns(params?: ReturnQuery, enabled: boolean = true) {
  return useQuery({
    queryKey: ['returns', params],
    queryFn: () => returnsApi.getAll(params),
    enabled,
  });
}

export function useReturn(id: string) {
  return useQuery({
    queryKey: ['returns', id],
    queryFn: () => returnsApi.getById(id),
    enabled: !!id,
  });
}

export function useApproveReturn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => returnsApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      // Approving is the point the refund cash actually leaves the register.
      invalidateDashboardQueries(queryClient);
      invalidateFinanceQueries(queryClient);
    },
  });
}

export function useCreateReturn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: returnsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
