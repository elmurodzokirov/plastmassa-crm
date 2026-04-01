import { useQueryClient } from '@tanstack/react-query';
import { useMockableQuery, useMockableMutation } from '@/mocks/mock-query';
import { mockData } from '@/mocks/data';
import {
  productionApi,
  ProductionLogQuery,
} from '@/api/production';

export function useProductionLogs(params?: ProductionLogQuery) {
  return useMockableQuery({
    queryKey: ['production-logs', params],
    queryFn: () => productionApi.getLogs(params),
    mockData: mockData.productionLogs,
  });
}

export function useProductionLog(id: string) {
  return useMockableQuery({
    queryKey: ['production-logs', id],
    queryFn: () => productionApi.getLogById(id),
    enabled: !!id,
    mockData: mockData.productionLog,
  });
}

export function useCreateProductionLog() {
  const queryClient = useQueryClient();
  return useMockableMutation({
    mutationFn: productionApi.createLog,
    mockResult: {} as any,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-logs'] });
      queryClient.invalidateQueries({ queryKey: ['daily-production-logs'] });
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useDailyProductionLogs(date: string) {
  return useMockableQuery({
    queryKey: ['daily-production-logs', date],
    queryFn: () => productionApi.getDailyLogs(date),
    enabled: !!date,
    mockData: mockData.dailyProductionLogs,
  });
}

export function useApproveProductionLog() {
  const queryClient = useQueryClient();
  return useMockableMutation({
    mutationFn: (id: string) => productionApi.approveLog(id),
    mockResult: {} as any,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-logs'] });
      queryClient.invalidateQueries({ queryKey: ['daily-production-logs'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
