import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { financeApi, ExpenseQuery, ExpenseData } from '@/api/finance';

// ── Expenses ─────────────────────────────────────────────────────────

export function useExpenses(params?: ExpenseQuery) {
  return useQuery({
    queryKey: ['expenses', params],
    queryFn: () => financeApi.getExpenses(params),
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ExpenseData>) => financeApi.createExpense(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenseStats'] });
      queryClient.invalidateQueries({ queryKey: ['cashFlow'] });
      queryClient.invalidateQueries({ queryKey: ['financeSummary'] });
      queryClient.invalidateQueries({ queryKey: ['profitAndLoss'] });
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ExpenseData> }) =>
      financeApi.updateExpense(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenseStats'] });
      queryClient.invalidateQueries({ queryKey: ['cashFlow'] });
      queryClient.invalidateQueries({ queryKey: ['financeSummary'] });
      queryClient.invalidateQueries({ queryKey: ['profitAndLoss'] });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financeApi.deleteExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenseStats'] });
      queryClient.invalidateQueries({ queryKey: ['cashFlow'] });
      queryClient.invalidateQueries({ queryKey: ['financeSummary'] });
      queryClient.invalidateQueries({ queryKey: ['profitAndLoss'] });
    },
  });
}

export function useExpenseStats(params?: { dateFrom?: string; dateTo?: string }) {
  return useQuery({
    queryKey: ['expenseStats', params],
    queryFn: () => financeApi.getExpenseStats(params),
  });
}

// ── Finance ──────────────────────────────────────────────────────────

export function useDebtors() {
  return useQuery({
    queryKey: ['debtors'],
    queryFn: () => financeApi.getDebtors(),
  });
}

export function useCreditors() {
  return useQuery({
    queryKey: ['creditors'],
    queryFn: () => financeApi.getCreditors(),
  });
}

export function useCashFlow(params: { dateFrom?: string; dateTo?: string }) {
  return useQuery({
    queryKey: ['cashFlow', params],
    queryFn: () => financeApi.getCashFlow(params),
    enabled: !!params.dateFrom && !!params.dateTo,
  });
}

export function useMonthlyCashFlow(year: number) {
  return useQuery({
    queryKey: ['monthlyCashFlow', year],
    queryFn: () => financeApi.getMonthlyCashFlow(year),
    enabled: !!year,
  });
}

export function useFinanceSummary() {
  return useQuery({
    queryKey: ['financeSummary'],
    queryFn: () => financeApi.getFinanceSummary(),
  });
}

export function useProfitAndLoss(params: { dateFrom?: string; dateTo?: string }) {
  return useQuery({
    queryKey: ['profitAndLoss', params],
    queryFn: () => financeApi.getProfitAndLoss(params),
    enabled: !!params.dateFrom && !!params.dateTo,
  });
}
