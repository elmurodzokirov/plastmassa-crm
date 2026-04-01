import { useQueryClient } from '@tanstack/react-query';
import { useMockableQuery, useMockableMutation } from '@/mocks/mock-query';
import { mockData } from '@/mocks/data';
import { customersApi, CustomerQuery } from '@/api/customers';
import type { Customer } from '@plastmassa/shared';

export function useCustomers(params?: CustomerQuery) {
  return useMockableQuery({
    queryKey: ['customers', params],
    queryFn: () => customersApi.getAll(params),
    mockData: mockData.customers,
  });
}

export function useCustomer(id: string) {
  return useMockableQuery({
    queryKey: ['customers', id],
    queryFn: () => customersApi.getById(id),
    enabled: !!id,
    mockData: mockData.customer,
  });
}

export function useDebtors() {
  return useMockableQuery({
    queryKey: ['customers', 'debtors'],
    queryFn: () => customersApi.getDebtors(),
    mockData: mockData.debtors,
  });
}

export function useDebtSummary() {
  return useMockableQuery({
    queryKey: ['customers', 'debt-summary'],
    queryFn: () => customersApi.getDebtSummary(),
    mockData: mockData.debtSummary,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMockableMutation({
    mutationFn: customersApi.create,
    mockResult: {} as any,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMockableMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Customer> }) =>
      customersApi.update(id, data),
    mockResult: {} as any,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMockableMutation({
    mutationFn: customersApi.delete,
    mockResult: {} as any,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}
