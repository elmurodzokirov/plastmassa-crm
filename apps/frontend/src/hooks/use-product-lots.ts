import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { productLotsApi, ProductLotQuery } from '@/api/product-lots';

export function useProductLots(params?: ProductLotQuery) {
  return useQuery({
    queryKey: ['product-lots', params],
    queryFn: () => productLotsApi.getAll(params),
  });
}

export function useProductLot(id: string) {
  return useQuery({
    queryKey: ['product-lots', id],
    queryFn: () => productLotsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateProductLot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: productLotsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-lots'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useProductLotsByProduct(productId: string, params?: ProductLotQuery) {
  return useQuery({
    queryKey: ['product-lots', 'by-product', productId, params],
    queryFn: () => productLotsApi.getByProduct(productId, params),
    enabled: !!productId,
  });
}

export function useProductCostHistory(productId: string) {
  return useQuery({
    queryKey: ['product-lots', 'cost-history', productId],
    queryFn: () => productLotsApi.getCostHistory(productId),
    enabled: !!productId,
  });
}
