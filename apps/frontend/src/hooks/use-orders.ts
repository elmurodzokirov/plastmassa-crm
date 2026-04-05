import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { ordersApi, OrderQuery } from '@/api/orders';

export function useOrders(params?: OrderQuery) {
  return useQuery({
    queryKey: ['orders', params],
    queryFn: () => ordersApi.getAll(params),
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ['orders', id],
    queryFn: () => ordersApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ordersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useUpdateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      ordersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      ordersApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useOrderCheck(id: string) {
  return useQuery({
    queryKey: ['orders', id, 'check'],
    queryFn: () => ordersApi.getCheck(id),
    enabled: !!id,
  });
}

export function useOverdueDebts() {
  return useQuery({
    queryKey: ['overdueDebts'],
    queryFn: () => ordersApi.getOverdueDebts(),
  });
}

export function useDeliverOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { deliveredTo: string; deliveryNotes?: string } }) =>
      ordersApi.deliver(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useOrdersByCustomer(customerId: string, params?: OrderQuery) {
  return useQuery({
    queryKey: ['orders', 'customer', customerId, params],
    queryFn: () => ordersApi.getByCustomer(customerId, params),
    enabled: !!customerId,
  });
}
