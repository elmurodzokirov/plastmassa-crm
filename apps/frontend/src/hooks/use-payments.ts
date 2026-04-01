import { useQueryClient } from '@tanstack/react-query';
import { useMockableQuery, useMockableMutation } from '@/mocks/mock-query';
import { mockData } from '@/mocks/data';
import { paymentsApi, PaymentQuery } from '@/api/payments';

export function usePayments(params?: PaymentQuery) {
  return useMockableQuery({
    queryKey: ['payments', params],
    queryFn: () => paymentsApi.getAll(params),
    mockData: mockData.payments,
  });
}

export function usePayment(id: string) {
  return useMockableQuery({
    queryKey: ['payments', id],
    queryFn: () => paymentsApi.getById(id),
    enabled: !!id,
    mockData: mockData.payment,
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMockableMutation({
    mutationFn: paymentsApi.create,
    mockResult: {} as any,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function usePaymentsByCustomer(customerId: string) {
  return useMockableQuery({
    queryKey: ['payments', 'customer', customerId],
    queryFn: () => paymentsApi.getByCustomer(customerId),
    enabled: !!customerId,
    mockData: mockData.paymentsByCustomer,
  });
}

export function usePaymentsByOrder(orderId: string) {
  return useMockableQuery({
    queryKey: ['payments', 'order', orderId],
    queryFn: () => paymentsApi.getByOrder(orderId),
    enabled: !!orderId,
    mockData: mockData.paymentsByOrder,
  });
}
