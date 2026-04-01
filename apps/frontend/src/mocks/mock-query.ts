import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUIStore } from '@/stores/ui.store';

export function useMockableQuery<TData = unknown>(
  options: {
    queryKey: any[];
    queryFn?: () => Promise<TData>;
    mockData?: any;
    enabled?: boolean;
    [key: string]: any;
  },
) {
  const isMockMode = useUIStore((s) => s.isMockMode);
  const { mockData, queryFn, ...rest } = options;
  return useQuery({
    ...rest,
    queryFn: isMockMode && mockData !== undefined ? () => Promise.resolve(mockData as TData) : queryFn,
  });
}

export function useMockableMutation<TData = unknown, TVariables = void>(
  options: {
    mutationFn?: (variables: TVariables) => Promise<TData>;
    mockResult?: any;
    onSuccess?: (data: any, variables: any, context: any) => void;
    [key: string]: any;
  },
) {
  const isMockMode = useUIStore((s) => s.isMockMode);
  const queryClient = useQueryClient();
  const { mockResult, mutationFn, onSuccess, ...rest } = options;
  return useMutation({
    ...rest,
    mutationFn: isMockMode && mockResult !== undefined
      ? () => Promise.resolve(mockResult as TData)
      : mutationFn,
    onSuccess: (data: any, variables: any, context: any) => {
      onSuccess?.(data, variables, context);
    },
  });
}
