import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { stockApi, StockMovementQuery } from '@/api/stock';

export function useStockMovements(params?: StockMovementQuery) {
  return useQuery({
    queryKey: ['stock-movements', params],
    queryFn: () => stockApi.getMovements(params),
  });
}

export function useStockMovement(id: string) {
  return useQuery({
    queryKey: ['stock-movements', id],
    queryFn: () => stockApi.getMovementById(id),
    enabled: !!id,
  });
}

export function useCreateStockMovement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: stockApi.createMovement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['materials'] });
    },
  });
}
