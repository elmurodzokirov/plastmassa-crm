import { useQueryClient } from '@tanstack/react-query';
import { useMockableQuery, useMockableMutation } from '@/mocks/mock-query';
import { mockData } from '@/mocks/data';
import { usersApi } from '@/api/users';

export function useUsers(params?: any) {
  return useMockableQuery({
    queryKey: ['users', params],
    queryFn: () => usersApi.getAll(params),
    mockData: mockData.users,
  });
}

export function useUser(id: string) {
  return useMockableQuery({
    queryKey: ['users', id],
    queryFn: () => usersApi.getById(id),
    enabled: !!id,
    mockData: null,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMockableMutation({
    mutationFn: usersApi.create,
    mockResult: {} as any,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMockableMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => usersApi.update(id, data),
    mockResult: {} as any,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMockableMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    mockResult: {} as any,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
