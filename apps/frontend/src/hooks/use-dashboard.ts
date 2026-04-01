import { useMockableQuery } from '@/mocks/mock-query';
import { mockData } from '@/mocks/data';
import { dashboardApi } from '@/api/dashboard';

export function useDashboardStats() {
  return useMockableQuery({
    queryKey: ['dashboardStats'],
    queryFn: () => dashboardApi.getDashboardStats(),
    mockData: mockData.dashboardStats,
  });
}

export function useRecentOrders(limit = 5) {
  return useMockableQuery({
    queryKey: ['recentOrders', limit],
    queryFn: () => dashboardApi.getRecentOrders(limit),
    mockData: mockData.recentOrders,
  });
}

export function useRecentPayments(limit = 5) {
  return useMockableQuery({
    queryKey: ['recentPayments', limit],
    queryFn: () => dashboardApi.getRecentPayments(limit),
    mockData: mockData.recentPayments,
  });
}

export function useMonthlyRevenue(months = 6) {
  return useMockableQuery({
    queryKey: ['monthlyRevenue', months],
    queryFn: () => dashboardApi.getMonthlyRevenue(months),
    mockData: mockData.monthlyRevenue,
  });
}

const SALES_CHART_MOCK: Record<string, unknown[]> = {
  year: mockData.salesChartYear,
  month: mockData.salesChartMonth,
  day: mockData.salesChartDay,
};

export function useSalesChart(period: 'year' | 'month' | 'day' = 'month', year?: number, month?: number) {
  return useMockableQuery({
    queryKey: ['salesChart', period, year, month],
    queryFn: () => dashboardApi.getSalesChart(period, year, month),
    mockData: SALES_CHART_MOCK[period] || [],
  });
}
