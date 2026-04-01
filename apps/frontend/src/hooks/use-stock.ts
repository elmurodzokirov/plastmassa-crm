import { useQueryClient } from '@tanstack/react-query';
import { useMockableQuery, useMockableMutation } from '@/mocks/mock-query';
import { mockData } from '@/mocks/data';
import { stockApi, StockMovementQuery } from '@/api/stock';

export function useStockMovements(params?: StockMovementQuery) {
  return useMockableQuery({
    queryKey: ['stock-movements', params],
    queryFn: () => stockApi.getMovements(params),
    mockData: mockData.stockMovements,
  });
}

export function useStockMovement(id: string) {
  return useMockableQuery({
    queryKey: ['stock-movements', id],
    queryFn: () => stockApi.getMovementById(id),
    enabled: !!id,
    mockData: mockData.stockMovement,
  });
}

export function useCreateStockMovement() {
  const queryClient = useQueryClient();
  return useMockableMutation({
    mutationFn: stockApi.createMovement,
    mockResult: {} as any,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['materials'] });
    },
  });
}
