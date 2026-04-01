import { useQueryClient } from '@tanstack/react-query';
import { useMockableQuery, useMockableMutation } from '@/mocks/mock-query';
import { mockData } from '@/mocks/data';
import { productsApi, ProductQuery } from '@/api/products';
import type { Product } from '@plastmassa/shared';

export function useProducts(params?: ProductQuery) {
  return useMockableQuery({
    queryKey: ['products', params],
    queryFn: () => productsApi.getAll(params),
    mockData: mockData.products,
  });
}

export function useProduct(id: string) {
  return useMockableQuery({
    queryKey: ['products', id],
    queryFn: () => productsApi.getById(id),
    enabled: !!id,
    mockData: mockData.product,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMockableMutation({
    mutationFn: productsApi.create,
    mockResult: {} as any,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMockableMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      productsApi.update(id, data),
    mockResult: {} as any,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMockableMutation({
    mutationFn: productsApi.delete,
    mockResult: {} as any,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
