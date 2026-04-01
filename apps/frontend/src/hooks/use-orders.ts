import { useQueryClient } from '@tanstack/react-query';
import { useMockableQuery, useMockableMutation } from '@/mocks/mock-query';
import { mockData } from '@/mocks/data';
import { ordersApi, OrderQuery } from '@/api/orders';

export function useOrders(params?: OrderQuery) {
  return useMockableQuery({
    queryKey: ['orders', params],
    queryFn: () => ordersApi.getAll(params),
    mockData: mockData.orders,
  });
}

export function useOrder(id: string) {
  return useMockableQuery({
    queryKey: ['orders', id],
    queryFn: () => ordersApi.getById(id),
    enabled: !!id,
    mockData: mockData.order,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMockableMutation({
    mutationFn: ordersApi.create,
    mockResult: {} as any,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useUpdateOrder() {
  const queryClient = useQueryClient();
  return useMockableMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      ordersApi.update(id, data),
    mockResult: {} as any,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMockableMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      ordersApi.updateStatus(id, status),
    mockResult: {} as any,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useOrderCheck(id: string) {
  return useMockableQuery({
    queryKey: ['orders', id, 'check'],
    queryFn: () => ordersApi.getCheck(id),
    enabled: !!id,
    mockData: mockData.order,
  });
}

export function useOverdueDebts() {
  return useMockableQuery({
    queryKey: ['overdueDebts'],
    queryFn: () => ordersApi.getOverdueDebts(),
    mockData: [],
  });
}

export function useDeliverOrder() {
  const queryClient = useQueryClient();
  return useMockableMutation({
    mutationFn: ({ id, data }: { id: string; data: { deliveredTo: string; deliveryNotes?: string } }) =>
      ordersApi.deliver(id, data),
    mockResult: {} as any,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useOrdersByCustomer(customerId: string, params?: OrderQuery) {
  return useMockableQuery({
    queryKey: ['orders', 'customer', customerId, params],
    queryFn: () => ordersApi.getByCustomer(customerId, params),
    enabled: !!customerId,
    mockData: mockData.ordersByCustomer,
  });
}
