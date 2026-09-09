import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import {
  suppliersApi,
  SupplierQuery,
  SupplierUpsertInput,
  SupplierPaymentQuery,
  SupplierPaymentCreateInput,
} from '@/api/suppliers';

export function useSuppliers(params?: SupplierQuery) {
  return useQuery({
    queryKey: ['suppliers', params],
    queryFn: () => suppliersApi.getAll(params),
  });
}

export function useSupplier(id: string) {
  return useQuery({
    queryKey: ['suppliers', id],
    queryFn: () => suppliersApi.getById(id),
    enabled: !!id,
  });
}

export function useSupplierCreditors() {
  return useQuery({
    queryKey: ['suppliers', 'creditors'],
    queryFn: () => suppliersApi.getCreditors(),
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SupplierUpsertInput) => suppliersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SupplierUpsertInput> & { isActive?: boolean } }) =>
      suppliersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => suppliersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });
}

export function useSupplierPayments(params?: SupplierPaymentQuery) {
  return useQuery({
    queryKey: ['supplier-payments', params],
    queryFn: () => suppliersApi.getPayments(params),
  });
}

export function useCreateSupplierPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SupplierPaymentCreateInput) => suppliersApi.createPayment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-payments'] });
      queryClient.invalidateQueries({ queryKey: ['creditors'] });
      queryClient.invalidateQueries({ queryKey: ['cashFlow'] });
      queryClient.invalidateQueries({ queryKey: ['monthlyCashFlow'] });
      queryClient.invalidateQueries({ queryKey: ['financeSummary'] });
    },
  });
}
