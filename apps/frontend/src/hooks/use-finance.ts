import { useQueryClient, useQuery, useMutation, QueryClient } from '@tanstack/react-query';
import {
  financeApi,
  ExpenseQuery,
  ExpenseData,
  TransactionsLedgerParams,
  CashOperationInput,
} from '@/api/finance';

/**
 * Every mutation that moves money (order payments, supplier payments,
 * expenses, material/product lot purchases, returns, payroll, ...) should
 * call this so the Moliya pages (Kassa, Pul oqimi, Hisobotlar) refresh
 * immediately instead of only updating after a manual page reload.
 *
 * IMPORTANT: use this helper instead of hand-writing query keys — 'finance'
 * and 'dashboard' are NOT real query keys used anywhere in this app, and
 * invalidating them silently does nothing.
 */
export function invalidateFinanceQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['todayTransactions'] });
  queryClient.invalidateQueries({ queryKey: ['transactions'] });
  queryClient.invalidateQueries({ queryKey: ['cashFlow'] });
  queryClient.invalidateQueries({ queryKey: ['monthlyCashFlow'] });
  queryClient.invalidateQueries({ queryKey: ['financeSummary'] });
  queryClient.invalidateQueries({ queryKey: ['debtors'] });
  queryClient.invalidateQueries({ queryKey: ['creditors'] });
  queryClient.invalidateQueries({ queryKey: ['expenseStats'] });
  queryClient.invalidateQueries({ queryKey: ['profitAndLoss'] });
}

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
      invalidateFinanceQueries(queryClient);
    },
  });
}

export function useCancelExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      financeApi.cancelExpense(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      invalidateFinanceQueries(queryClient);
    },
  });
}

// ── Cash operations (opening balance, owner top-up/withdrawal, loans...) ──

export function useCashOperations(direction?: 'IN' | 'OUT') {
  return useQuery({
    queryKey: ['cashOperations', direction],
    queryFn: () => financeApi.getCashOperations(direction),
  });
}

export function useCreateCashOperation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CashOperationInput) => financeApi.createCashOperation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashOperations'] });
      invalidateFinanceQueries(queryClient);
    },
  });
}

export function useCancelCashOperation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      financeApi.cancelCashOperation(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashOperations'] });
      invalidateFinanceQueries(queryClient);
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
      invalidateFinanceQueries(queryClient);
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financeApi.deleteExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      invalidateFinanceQueries(queryClient);
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

export function useTodayTransactions() {
  return useQuery({
    queryKey: ['todayTransactions'],
    queryFn: () => financeApi.getTodayTransactions(),
  });
}

export function useTransactions(params: TransactionsLedgerParams) {
  return useQuery({
    queryKey: ['transactions', params],
    queryFn: () => financeApi.getTransactions(params),
    enabled: !!params.dateFrom && !!params.dateTo,
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
