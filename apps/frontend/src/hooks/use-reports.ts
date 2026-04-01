import { useMockableQuery } from '@/mocks/mock-query';
import { mockData } from '@/mocks/data';
import {
  reportsApi,
  SalesReportParams,
  ProductionReportParams,
  AttendanceReportParams,
} from '@/api/reports';

export function useSalesReport(params?: SalesReportParams) {
  return useMockableQuery({
    queryKey: ['salesReport', params],
    queryFn: () => reportsApi.getSalesReport(params),
    enabled: !!params?.dateFrom && !!params?.dateTo,
    mockData: mockData.salesReport,
  });
}

export function useProductionReport(params?: ProductionReportParams) {
  return useMockableQuery({
    queryKey: ['productionReport', params],
    queryFn: () => reportsApi.getProductionReport(params),
    enabled: !!params?.dateFrom && !!params?.dateTo,
    mockData: mockData.productionReport,
  });
}

export function useStockReport() {
  return useMockableQuery({
    queryKey: ['stockReport'],
    queryFn: () => reportsApi.getStockReport(),
    mockData: mockData.stockReport,
  });
}

export function useAttendanceReport(params: AttendanceReportParams) {
  return useMockableQuery({
    queryKey: ['attendanceReport', params],
    queryFn: () => reportsApi.getAttendanceReport(params),
    enabled: !!params.year && !!params.month,
    mockData: mockData.attendanceReport,
  });
}
