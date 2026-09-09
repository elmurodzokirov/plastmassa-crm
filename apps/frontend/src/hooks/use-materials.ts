import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { materialsApi, MaterialQuery, MaterialUpsertInput } from '@/api/materials';

export function useMaterials(params?: MaterialQuery) {
  return useQuery({
    queryKey: ['materials', params],
    queryFn: () => materialsApi.getAll(params),
  });
}

export function useMaterial(id: string) {
  return useQuery({
    queryKey: ['materials', id],
    queryFn: () => materialsApi.getById(id),
    enabled: !!id,
  });
}

export function useMaterialStats() {
  return useQuery({
    queryKey: ['materials', 'stats'],
    queryFn: () => materialsApi.getStats(),
  });
}

export function useMaterialCategories() {
  return useQuery({
    queryKey: ['materials', 'categories'],
    queryFn: () => materialsApi.getCategories(),
  });
}

export function useCreateMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: materialsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
    },
  });
}

export function useUpdateMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MaterialUpsertInput> & { isActive?: boolean } }) =>
      materialsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
    },
  });
}

export function useDeleteMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: materialsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
    },
  });
}
