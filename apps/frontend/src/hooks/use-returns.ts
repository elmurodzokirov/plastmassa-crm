import { useQueryClient } from '@tanstack/react-query';
import { useMockableMutation, useMockableQuery } from '@/mocks/mock-query';
import { returnsApi, ReturnQuery } from '@/api/returns';

function createEmptyPage(page: number, limit: number) {
  return {
    items: [],
    total: 0,
    page,
    limit,
    totalPages: 1,
  };
}

export function useReturns(params?: ReturnQuery, enabled: boolean = true) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;

  return useMockableQuery({
    queryKey: ['returns', params],
    queryFn: () => returnsApi.getAll(params),
    mockData: createEmptyPage(page, limit),
    enabled,
  });
}

export function useApproveReturn() {
  const queryClient = useQueryClient();

  return useMockableMutation({
    mutationFn: (id: string) => returnsApi.approve(id),
    mockResult: {} as any,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['finance'] });
    },
  });
}

export function useCreateReturn() {
  const queryClient = useQueryClient();

  return useMockableMutation({
    mutationFn: returnsApi.create,
    mockResult: {} as any,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['finance'] });
    },
  });
}
