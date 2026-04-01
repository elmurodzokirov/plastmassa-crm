import { useQueryClient } from '@tanstack/react-query';
import { useMockableQuery, useMockableMutation } from '@/mocks/mock-query';
import { mockData } from '@/mocks/data';
import { productLotsApi, ProductLotQuery } from '@/api/product-lots';

export function useProductLots(params?: ProductLotQuery) {
  return useMockableQuery({
    queryKey: ['product-lots', params],
    queryFn: () => productLotsApi.getAll(params),
    mockData: mockData.productLots,
  });
}

export function useProductLot(id: string) {
  return useMockableQuery({
    queryKey: ['product-lots', id],
    queryFn: () => productLotsApi.getById(id),
    enabled: !!id,
    mockData: mockData.productLot,
  });
}

export function useCreateProductLot() {
  const queryClient = useQueryClient();
  return useMockableMutation({
    mutationFn: productLotsApi.create,
    mockResult: {} as any,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-lots'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useProductLotsByProduct(productId: string, params?: ProductLotQuery) {
  return useMockableQuery({
    queryKey: ['product-lots', 'by-product', productId, params],
    queryFn: () => productLotsApi.getByProduct(productId, params),
    enabled: !!productId,
    mockData: mockData.productLotsByProduct,
  });
}

export function useProductCostHistory(productId: string) {
  return useMockableQuery({
    queryKey: ['product-lots', 'cost-history', productId],
    queryFn: () => productLotsApi.getCostHistory(productId),
    enabled: !!productId,
    mockData: mockData.productCostHistory,
  });
}
