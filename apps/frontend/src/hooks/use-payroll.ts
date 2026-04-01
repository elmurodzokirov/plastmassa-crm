import { useQueryClient } from '@tanstack/react-query';
import { useMockableQuery, useMockableMutation } from '@/mocks/mock-query';
import { mockData } from '@/mocks/data';
import { payrollApi, AdvanceQuery, PayrollQuery } from '@/api/payroll';

// ── Advances ──────────────────────────────────────────────────────────

export function useAdvances(params?: AdvanceQuery) {
  return useMockableQuery({
    queryKey: ['advances', params],
    queryFn: () => payrollApi.getAdvances(params),
    mockData: mockData.advances,
  });
}

export function useCreateAdvance() {
  const queryClient = useQueryClient();
  return useMockableMutation({
    mutationFn: payrollApi.createAdvance,
    mockResult: {} as any,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advances'] });
    },
  });
}

export function useUpdateAdvanceStatus() {
  const queryClient = useQueryClient();
  return useMockableMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      payrollApi.updateAdvanceStatus(id, status),
    mockResult: {} as any,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advances'] });
    },
  });
}

// ── Payroll ───────────────────────────────────────────────────────────

export function usePayrolls(params?: PayrollQuery) {
  return useMockableQuery({
    queryKey: ['payrolls', params],
    queryFn: () => payrollApi.getPayrolls(params),
    mockData: mockData.payrolls,
  });
}

export function usePayroll(id: string) {
  return useMockableQuery({
    queryKey: ['payroll', id],
    queryFn: () => payrollApi.getPayrollById(id),
    enabled: !!id,
    mockData: mockData.payroll,
  });
}

export function useCalculatePayroll() {
  const queryClient = useQueryClient();
  return useMockableMutation({
    mutationFn: payrollApi.calculatePayroll,
    mockResult: {} as any,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
      queryClient.invalidateQueries({ queryKey: ['payrollByMonth'] });
    },
  });
}

export function useBulkCalculatePayroll() {
  const queryClient = useQueryClient();
  return useMockableMutation({
    mutationFn: payrollApi.bulkCalculate,
    mockResult: {} as any,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
      queryClient.invalidateQueries({ queryKey: ['payrollByMonth'] });
    },
  });
}

export function useUpdatePayrollStatus() {
  const queryClient = useQueryClient();
  return useMockableMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      payrollApi.updatePayrollStatus(id, status),
    mockResult: {} as any,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
      queryClient.invalidateQueries({ queryKey: ['payrollByMonth'] });
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    },
  });
}

export function usePayrollByMonth(year: number, month: number) {
  return useMockableQuery({
    queryKey: ['payrollByMonth', year, month],
    queryFn: () => payrollApi.getPayrollByMonth(year, month),
    enabled: !!year && !!month,
    mockData: mockData.payrollByMonth,
  });
}

export function usePayrollSlip(id: string) {
  return useMockableQuery({
    queryKey: ['payrollSlip', id],
    queryFn: () => payrollApi.getPayrollSlip(id),
    enabled: !!id,
    mockData: mockData.payrollSlip,
  });
}
