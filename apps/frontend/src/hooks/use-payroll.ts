import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { payrollApi, AdvanceQuery, PayrollQuery } from '@/api/payroll';

// ── Advances ──────────────────────────────────────────────────────────

export function useAdvances(params?: AdvanceQuery) {
  return useQuery({
    queryKey: ['advances', params],
    queryFn: () => payrollApi.getAdvances(params),
  });
}

export function useCreateAdvance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: payrollApi.createAdvance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advances'] });
    },
  });
}

export function useUpdateAdvanceStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      payrollApi.updateAdvanceStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advances'] });
    },
  });
}

// ── Payroll ───────────────────────────────────────────────────────────

export function usePayrolls(params?: PayrollQuery) {
  return useQuery({
    queryKey: ['payrolls', params],
    queryFn: () => payrollApi.getPayrolls(params),
  });
}

export function usePayroll(id: string) {
  return useQuery({
    queryKey: ['payroll', id],
    queryFn: () => payrollApi.getPayrollById(id),
    enabled: !!id,
  });
}

export function useCalculatePayroll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: payrollApi.calculatePayroll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
      queryClient.invalidateQueries({ queryKey: ['payrollByMonth'] });
    },
  });
}

export function useBulkCalculatePayroll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: payrollApi.bulkCalculate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
      queryClient.invalidateQueries({ queryKey: ['payrollByMonth'] });
    },
  });
}

export function useUpdatePayrollStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      payrollApi.updatePayrollStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
      queryClient.invalidateQueries({ queryKey: ['payrollByMonth'] });
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    },
  });
}

export function usePayrollByMonth(year: number, month: number) {
  return useQuery({
    queryKey: ['payrollByMonth', year, month],
    queryFn: () => payrollApi.getPayrollByMonth(year, month),
    enabled: !!year && !!month,
  });
}

export function usePayrollSlip(id: string) {
  return useQuery({
    queryKey: ['payrollSlip', id],
    queryFn: () => payrollApi.getPayrollSlip(id),
    enabled: !!id,
  });
}
