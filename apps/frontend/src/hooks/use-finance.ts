import { useQueryClient } from '@tanstack/react-query';
import { useMockableQuery, useMockableMutation } from '@/mocks/mock-query';
import { mockData } from '@/mocks/data';
import { financeApi, ExpenseQuery, ExpenseData } from '@/api/finance';

// ── Expenses ─────────────────────────────────────────────────────────

export function useExpenses(params?: ExpenseQuery) {
  return useMockableQuery({
    queryKey: ['expenses', params],
    queryFn: () => financeApi.getExpenses(params),
    mockData: mockData.expenses,
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMockableMutation({
    mutationFn: (data: Partial<ExpenseData>) => financeApi.createExpense(data),
    mockResult: {} as any,
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
  return useMockableMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ExpenseData> }) =>
      financeApi.updateExpense(id, data),
    mockResult: {} as any,
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
  return useMockableMutation({
    mutationFn: (id: string) => financeApi.deleteExpense(id),
    mockResult: {} as any,
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
  return useMockableQuery({
    queryKey: ['expenseStats', params],
    queryFn: () => financeApi.getExpenseStats(params),
    mockData: mockData.expenseStats,
  });
}

// ── Finance ──────────────────────────────────────────────────────────

export function useDebtors() {
  return useMockableQuery({
    queryKey: ['debtors'],
    queryFn: () => financeApi.getDebtors(),
    mockData: mockData.financeDebtors,
  });
}

export function useCashFlow(params: { dateFrom?: string; dateTo?: string }) {
  return useMockableQuery({
    queryKey: ['cashFlow', params],
    queryFn: () => financeApi.getCashFlow(params),
    enabled: !!params.dateFrom && !!params.dateTo,
    mockData: mockData.cashFlow,
  });
}

export function useMonthlyCashFlow(year: number) {
  return useMockableQuery({
    queryKey: ['monthlyCashFlow', year],
    queryFn: () => financeApi.getMonthlyCashFlow(year),
    enabled: !!year,
    mockData: mockData.monthlyCashFlow,
  });
}

export function useFinanceSummary() {
  return useMockableQuery({
    queryKey: ['financeSummary'],
    queryFn: () => financeApi.getFinanceSummary(),
    mockData: mockData.financeSummary,
  });
}

export function useProfitAndLoss(params: { dateFrom?: string; dateTo?: string }) {
  return useMockableQuery({
    queryKey: ['profitAndLoss', params],
    queryFn: () => financeApi.getProfitAndLoss(params),
    enabled: !!params.dateFrom && !!params.dateTo,
    mockData: mockData.profitAndLoss,
  });
}
