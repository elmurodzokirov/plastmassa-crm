import { useQuery } from '@tanstack/react-query';
import {
  reportsApi,
  SalesReportParams,
  ProductionReportParams,
  AttendanceReportParams,
  SupplierReconciliationParams,
} from '@/api/reports';

export function useSalesReport(params?: SalesReportParams) {
  return useQuery({
    queryKey: ['salesReport', params],
    queryFn: () => reportsApi.getSalesReport(params),
    enabled: !!params?.dateFrom && !!params?.dateTo,
  });
}

export function useProductionReport(params?: ProductionReportParams) {
  return useQuery({
    queryKey: ['productionReport', params],
    queryFn: () => reportsApi.getProductionReport(params),
    enabled: !!params?.dateFrom && !!params?.dateTo,
  });
}

export function useStockReport() {
  return useQuery({
    queryKey: ['stockReport'],
    queryFn: () => reportsApi.getStockReport(),
  });
}

export function useAttendanceReport(params: AttendanceReportParams) {
  return useQuery({
    queryKey: ['attendanceReport', params],
    queryFn: () => reportsApi.getAttendanceReport(params),
    enabled: !!params.year && !!params.month,
  });
}

export function useSupplierReconciliation(params: SupplierReconciliationParams) {
  return useQuery({
    queryKey: ['supplierReconciliation', params],
    queryFn: () => reportsApi.getSupplierReconciliation(params),
    enabled: !!params.supplier,
  });
}
