import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { paymentsApi, PaymentQuery } from '@/api/payments';
import { invalidateFinanceQueries } from './use-finance';
import { invalidateDashboardQueries } from './use-dashboard';

export function usePayments(params?: PaymentQuery) {
  return useQuery({
    queryKey: ['payments', params],
    queryFn: () => paymentsApi.getAll(params),
  });
}

export function usePayment(id: string) {
  return useQuery({
    queryKey: ['payments', id],
    queryFn: () => paymentsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: paymentsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['overdueDebts'] });
      invalidateDashboardQueries(queryClient);
      invalidateFinanceQueries(queryClient);
    },
  });
}

export function usePaymentsByCustomer(customerId: string) {
  return useQuery({
    queryKey: ['payments', 'customer', customerId],
    queryFn: () => paymentsApi.getByCustomer(customerId),
    enabled: !!customerId,
  });
}

export function usePaymentsByOrder(orderId: string) {
  return useQuery({
    queryKey: ['payments', 'order', orderId],
    queryFn: () => paymentsApi.getByOrder(orderId),
    enabled: !!orderId,
  });
}
