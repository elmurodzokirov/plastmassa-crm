import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import {
  productLotsApi,
  ProductLotQuery,
  ProductLotBatchQuery,
  UpdateProductLotBatchInput,
} from '@/api/product-lots';
import { invalidateFinanceQueries } from './use-finance';

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
      // A lot with a supplier + immediate paidAmount creates a
      // SupplierPayment behind the scenes — reflect it everywhere.
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-payments'] });
      invalidateFinanceQueries(queryClient);
    },
  });
}

export function useCreateProductLotBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: productLotsApi.createBatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-lots'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-payments'] });
      invalidateFinanceQueries(queryClient);
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

export function useProductLotBatches(params?: ProductLotBatchQuery) {
  return useQuery({
    queryKey: ['product-lot-batches', params],
    queryFn: () => productLotsApi.getAllBatches(params),
  });
}

export function useProductLotBatchDetail(batchNumber: string | null) {
  return useQuery({
    queryKey: ['product-lot-batches', batchNumber],
    queryFn: () => productLotsApi.getBatchDetail(batchNumber as string),
    enabled: !!batchNumber,
  });
}

export function useUpdateProductLotBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ batchNumber, data }: { batchNumber: string; data: UpdateProductLotBatchInput }) =>
      productLotsApi.updateBatch(batchNumber, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-lot-batches'] });
      queryClient.invalidateQueries({ queryKey: ['product-lots'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-payments'] });
      invalidateFinanceQueries(queryClient);
    },
  });
}
