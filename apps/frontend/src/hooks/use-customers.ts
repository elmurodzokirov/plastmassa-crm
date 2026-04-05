import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { customersApi, CustomerQuery } from '@/api/customers';
import type { Customer } from '@plastmassa/shared';

export function useCustomers(params?: CustomerQuery) {
  return useQuery({
    queryKey: ['customers', params],
    queryFn: () => customersApi.getAll(params),
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ['customers', id],
    queryFn: () => customersApi.getById(id),
    enabled: !!id,
  });
}

export function useDebtors() {
  return useQuery({
    queryKey: ['customers', 'debtors'],
    queryFn: () => customersApi.getDebtors(),
  });
}

export function useDebtSummary() {
  return useQuery({
    queryKey: ['customers', 'debt-summary'],
    queryFn: () => customersApi.getDebtSummary(),
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: customersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Customer> }) =>
      customersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: customersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}
