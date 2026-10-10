import { useQuery, QueryClient } from '@tanstack/react-query';
import { dashboardApi } from '@/api/dashboard';

/** Call after any mutation that changes revenue/orders/payments so the
 * Bosh sahifa (dashboard) widgets refresh instead of only updating on reload. */
export function invalidateDashboardQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
  queryClient.invalidateQueries({ queryKey: ['recentOrders'] });
  queryClient.invalidateQueries({ queryKey: ['recentPayments'] });
  queryClient.invalidateQueries({ queryKey: ['monthlyRevenue'] });
  queryClient.invalidateQueries({ queryKey: ['salesChart'] });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboardStats'],
    queryFn: () => dashboardApi.getDashboardStats(),
  });
}

export function useRecentOrders(limit = 5) {
  return useQuery({
    queryKey: ['recentOrders', limit],
    queryFn: () => dashboardApi.getRecentOrders(limit),
  });
}

export function useRecentPayments(limit = 5) {
  return useQuery({
    queryKey: ['recentPayments', limit],
    queryFn: () => dashboardApi.getRecentPayments(limit),
  });
}

export function useMonthlyRevenue(months = 6) {
  return useQuery({
    queryKey: ['monthlyRevenue', months],
    queryFn: () => dashboardApi.getMonthlyRevenue(months),
  });
}

export function useSalesChart(period: 'year' | 'month' | 'day' = 'month', year?: number, month?: number) {
  return useQuery({
    queryKey: ['salesChart', period, year, month],
    queryFn: () => dashboardApi.getSalesChart(period, year, month),
  });
}
