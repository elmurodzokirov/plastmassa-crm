import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { materialLotsApi, MaterialLotQuery } from '@/api/material-lots';

export function useMaterialLots(params?: MaterialLotQuery) {
  return useQuery({
    queryKey: ['material-lots', params],
    queryFn: () => materialLotsApi.getAll(params),
  });
}

export function useMaterialLotsByMaterial(materialId: string, params?: MaterialLotQuery) {
  return useQuery({
    queryKey: ['material-lots', 'by-material', materialId, params],
    queryFn: () => materialLotsApi.getByMaterial(materialId, params),
    enabled: !!materialId,
  });
}

export function useMaterialAverageCost(materialId: string) {
  return useQuery({
    queryKey: ['material-lots', 'average-cost', materialId],
    queryFn: () => materialLotsApi.getAverageCost(materialId),
    enabled: !!materialId,
  });
}

export function useCreateMaterialLot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: materialLotsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-lots'] });
      queryClient.invalidateQueries({ queryKey: ['materials'] });
    },
  });
}
