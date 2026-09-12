import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import {
  productionApi,
  ProductionLogQuery,
  ProductionBatchQuery,
  CreateProductionLogBatchInput,
  UpdateProductionLogBatchInput,
} from '@/api/production';

export function useProductionLogs(params?: ProductionLogQuery) {
  return useQuery({
    queryKey: ['production-logs', params],
    queryFn: () => productionApi.getLogs(params),
  });
}

export function useProductionLogsEnabled(params: ProductionLogQuery | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['production-logs', params],
    queryFn: () => productionApi.getLogs(params),
    enabled,
  });
}

export function useProductionLog(id: string) {
  return useQuery({
    queryKey: ['production-logs', id],
    queryFn: () => productionApi.getLogById(id),
    enabled: !!id,
  });
}

export function useCreateProductionLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: productionApi.createLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-logs'] });
      queryClient.invalidateQueries({ queryKey: ['daily-production-logs'] });
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useDailyProductionLogs(date: string) {
  return useQuery({
    queryKey: ['daily-production-logs', date],
    queryFn: () => productionApi.getDailyLogs(date),
    enabled: !!date,
  });
}

export function useApproveProductionLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productionApi.approveLog(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-logs'] });
      queryClient.invalidateQueries({ queryKey: ['daily-production-logs'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// ── Batches ("hujjat" — one or more logs created/edited together) ──────────────

export function useCreateProductionLogBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProductionLogBatchInput) => productionApi.createLogsBatch(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-logs'] });
      queryClient.invalidateQueries({ queryKey: ['production-log-batches'] });
      queryClient.invalidateQueries({ queryKey: ['daily-production-logs'] });
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useProductionLogBatches(params?: ProductionBatchQuery) {
  return useQuery({
    queryKey: ['production-log-batches', params],
    queryFn: () => productionApi.getBatches(params),
  });
}

export function useProductionLogBatchDetail(batchNumber: string | null) {
  return useQuery({
    queryKey: ['production-log-batches', 'detail', batchNumber],
    queryFn: () => productionApi.getBatchDetail(batchNumber as string),
    enabled: !!batchNumber,
  });
}

export function useUpdateProductionLogBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ batchNumber, data }: { batchNumber: string; data: UpdateProductionLogBatchInput }) =>
      productionApi.updateBatch(batchNumber, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-logs'] });
      queryClient.invalidateQueries({ queryKey: ['production-log-batches'] });
      queryClient.invalidateQueries({ queryKey: ['daily-production-logs'] });
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
