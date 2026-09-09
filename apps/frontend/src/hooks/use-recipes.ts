import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { recipesApi } from '@/api/recipes';

export function useAllActiveRecipes() {
  return useQuery({
    queryKey: ['recipes', 'all-active'],
    queryFn: () => recipesApi.getAllActive(),
  });
}

export function useActiveRecipe(productId: string) {
  return useQuery({
    queryKey: ['recipes', 'active', productId],
    queryFn: () => recipesApi.getActiveByProduct(productId),
    enabled: !!productId,
  });
}

export function useRecipeHistory(productId: string) {
  return useQuery({
    queryKey: ['recipes', 'history', productId],
    queryFn: () => recipesApi.getHistory(productId),
    enabled: !!productId,
  });
}

export function usePlannedCost(productId: string) {
  return useQuery({
    queryKey: ['recipes', 'cost', productId],
    queryFn: () => recipesApi.getPlannedCost(productId),
    enabled: !!productId,
  });
}

export function useUpsertRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: recipesApi.upsert,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['recipes', 'active', variables.product] });
      queryClient.invalidateQueries({ queryKey: ['recipes', 'history', variables.product] });
      queryClient.invalidateQueries({ queryKey: ['recipes', 'cost', variables.product] });
    },
  });
}
