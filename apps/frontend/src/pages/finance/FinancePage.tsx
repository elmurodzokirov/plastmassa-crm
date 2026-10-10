import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Plus,
  Phone,
  BarChart3,
  Wallet,
  Truck,
  ArrowUpCircle,
  ArrowDownCircle,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import {
  useCashFlow,
  useTodayTransactions,
  useDebtors,
  useCreditors,
  useFinanceSummary,
} from '@/hooks/use-finance';
import type { FinanceTransaction } from '@/api/finance';
import { toast } from '@/components/ui/use-toast';
import { TransactionViewDialog } from '@/components/finance/transaction-view-dialog';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatCard } from '@/components/shared/stat-card';
import { DataTableWrapper } from '@/components/shared/data-table';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

// ── Helper: get first and last day of current month ───────────────────

function getMonthRange() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    dateFrom: format(firstDay, 'yyyy-MM-dd'),
    dateTo: format(lastDay, 'yyyy-MM-dd'),
  };
}

// ── Component ─────────────────────────────────────────────────────────

export default function FinancePage() {
  const navigate = useNavigate();
  const defaultRange = getMonthRange();

  // ── Shared state ──────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('cashflow');

  // ── Cash Flow state ───────────────────────────────────────────────
  const [cfDateFrom, setCfDateFrom] = useState(defaultRange.dateFrom);
  const [cfDateTo, setCfDateTo] = useState(defaultRange.dateTo);
  const [viewTransaction, setViewTransaction] = useState<FinanceTransaction | null>(null);

  // ── Queries ───────────────────────────────────────────────────────

  const cashFlowParams = useMemo(
    () => ({ dateFrom: cfDateFrom, dateTo: cfDateTo }),
    [cfDateFrom, cfDateTo],
  );
  const { data: cashFlowData, isLoading: cashFlowLoading } = useCashFlow(cashFlowParams);
  const { data: todayTransactionsData, isLoading: todayTransactionsLoading } = useTodayTransactions();
  const { data: financeSummaryData, isLoading: financeSummaryLoading } = useFinanceSummary();

  const { data: debtorsData, isLoading: debtorsLoading } = useDebtors();
  const { data: creditorsData, isLoading: creditorsLoading } = useCreditors();

  // ── Derived data ──────────────────────────────────────────────────

  const debtors = Array.isArray(debtorsData) ? debtorsData : [];
  const totalDebt = debtors.reduce((sum, d) => sum + (d.totalDebt || 0), 0);
  const creditors = Array.isArray(creditorsData) ? creditorsData : [];
  const totalCredit = creditors.reduce((sum, c) => sum + (c.totalDebt || 0), 0);
  const todayTransactions = todayTransactionsData?.items || [];

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-bold text-foreground">Moliya</h1>
      </motion.div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          <TabsList>
            <TabsTrigger value="cashflow">Kassa</TabsTrigger>
            <TabsTrigger value="debtors">Qarzdorlar</TabsTrigger>
            <TabsTrigger value="creditors">Kreditorlar</TabsTrigger>
          </TabsList>
        </motion.div>

        {/* ── TAB 1: Kassa (Cash Flow) ─────────────────────────────────── */}
        <TabsContent value="cashflow" className="space-y-6">
          {/* Date range filter */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="flex flex-col sm:flex-row items-start sm:items-end gap-3"
          >
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Boshlanish sana</Label>
              <Input
                type="date"
                value={cfDateFrom}
                onChange={(e) => setCfDateFrom(e.target.value)}
                className="h-9 rounded-xl text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Tugash sana</Label>
              <Input
                type="date"
                value={cfDateTo}
                onChange={(e) => setCfDateTo(e.target.value)}
                className="h-9 rounded-xl text-xs"
              />
            </div>
          </motion.div>

          {/* Stat Cards */}
          {!cashFlowLoading && cashFlowData && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                title="Kirim"
                value={formatCurrency(cashFlowData.totalIncome || 0)}
                icon={TrendingUp}
                iconColor="text-green-400"
                iconBg="bg-green-500/20"
                index={0}
              />
              <StatCard
                title="Chiqim"
                value={formatCurrency(cashFlowData.totalExpense || 0)}
                icon={TrendingDown}
                iconColor="text-red-400"
                iconBg="bg-red-500/20"
                index={1}
              />
              <StatCard
                title="Kassadagi mablag'"
                value={
                  financeSummaryLoading
                    ? '...'
                    : formatCurrency(financeSummaryData?.cashOnHand || 0)
                }
                icon={Wallet}
                iconColor="text-blue-400"
                iconBg="bg-blue-500/20"
                index={2}
              />
            </div>
          )}

          {cashFlowLoading && (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          )}

          {/* Today's Transactions List */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Bugungi kirim va chiqimlar
            </h2>
            <DataTableWrapper
              isLoading={todayTransactionsLoading}
              isEmpty={todayTransactions.length === 0}
              emptyTitle="Ma'lumot topilmadi"
              emptyDescription="Bugun uchun hech qanday kirim yoki chiqim qayd etilmagan"
            >
              <div className="divide-y divide-border/30 rounded-xl border border-border/50 overflow-hidden">
                {todayTransactions.map((tx) => (
                  <button
                    key={tx._id}
                    type="button"
                    onClick={() => setViewTransaction(tx)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent/50 transition-colors"
                  >
                    {tx.direction === 'IN' ? (
                      <ArrowUpCircle className="h-5 w-5 text-green-400 shrink-0" />
                    ) : (
                      <ArrowDownCircle className="h-5 w-5 text-red-400 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{tx.title}</p>
                      {tx.subtitle && (
                        <p className="text-xs text-muted-foreground truncate">{tx.subtitle}</p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {format(new Date(tx.date), 'HH:mm')}
                    </span>
                    <span
                      className={cn(
                        'text-sm font-semibold shrink-0 w-32 text-right',
                        tx.direction === 'IN' ? 'text-green-400' : 'text-red-400',
                      )}
                    >
                      {tx.direction === 'IN' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </span>
                  </button>
                ))}
              </div>
            </DataTableWrapper>
          </motion.div>
        </TabsContent>

        {/* ── TAB 2: Qarzdorlar (Debtors) ──────────────────────────────── */}
        <TabsContent value="debtors" className="space-y-6">
          {/* Stat Card */}
          {!debtorsLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard
                title="Jami qarz"
                value={formatCurrency(totalDebt)}
                icon={Wallet}
                iconColor="text-red-400"
                iconBg="bg-red-500/20"
                index={0}
              />
              <StatCard
                title="Qarzdorlar soni"
                value={debtors.length}
                icon={Users}
                iconColor="text-yellow-400"
                iconBg="bg-yellow-500/20"
                index={1}
              />
            </div>
          )}

          {/* Debtors Table */}
          <DataTableWrapper
            isLoading={debtorsLoading}
            isEmpty={debtors.length === 0}
            emptyTitle="Qarzdorlar topilmadi"
            emptyDescription="Hozircha hech qanday qarzdor mavjud emas"
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/50 hover:bg-transparent">
                    <TableHead className="min-w-[180px]">Mijoz</TableHead>
                    <TableHead className="min-w-[130px]">Telefon</TableHead>
                    <TableHead className="min-w-[140px]">Qarz miqdori</TableHead>
                    <TableHead className="min-w-[140px]">Kredit limiti</TableHead>
                    <TableHead className="min-w-[100px]">Foiz</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {debtors
                    .sort((a, b) => (b.totalDebt || 0) - (a.totalDebt || 0))
                    .map((debtor) => {
                      const percent =
                        debtor.creditLimit > 0
                          ? Math.round((debtor.totalDebt / debtor.creditLimit) * 100)
                          : 0;
                      return (
                        <TableRow
                          key={debtor._id}
                          className="border-b border-border/30 cursor-pointer hover:bg-accent/50 transition-colors"
                          onClick={() => navigate(`/customers/${debtor._id}`)}
                        >
                          <TableCell>
                            <span className="font-medium text-foreground">
                              {debtor.name || '---'}
                            </span>
                          </TableCell>
                          <TableCell>
                            {debtor.phone ? (
                              <span className="flex items-center gap-1.5 text-muted-foreground">
                                <Phone className="h-3.5 w-3.5" />
                                {debtor.phone}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">---</span>
                            )}
                          </TableCell>
                          <TableCell className="font-semibold text-red-400">
                            {formatCurrency(debtor.totalDebt || 0)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatCurrency(debtor.creditLimit || 0)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={percent >= 80 ? 'destructive' : percent >= 50 ? 'warning' : 'success'}
                            >
                              {percent}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          </DataTableWrapper>
        </TabsContent>

        {/* ── TAB: Kreditorlar (Creditors / suppliers we owe) ──────────── */}
        <TabsContent value="creditors" className="space-y-6">
          {!creditorsLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard
                title="Jami qarzimiz"
                value={formatCurrency(totalCredit)}
                icon={Wallet}
                iconColor="text-red-400"
                iconBg="bg-red-500/20"
                index={0}
              />
              <StatCard
                title="Qarzdor yetkazib beruvchilar"
                value={creditors.length}
                icon={Truck}
                iconColor="text-yellow-400"
                iconBg="bg-yellow-500/20"
                index={1}
              />
            </div>
          )}

          <DataTableWrapper
            isLoading={creditorsLoading}
            isEmpty={creditors.length === 0}
            emptyTitle="Kreditorlar topilmadi"
            emptyDescription="Hozircha hech qanday yetkazib beruvchiga qarzimiz mavjud emas"
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/50 hover:bg-transparent">
                    <TableHead className="min-w-[180px]">Yetkazib beruvchi</TableHead>
                    <TableHead className="min-w-[130px]">Telefon</TableHead>
                    <TableHead className="min-w-[140px]">Qarzimiz</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creditors
                    .sort((a, b) => (b.totalDebt || 0) - (a.totalDebt || 0))
                    .map((creditor) => (
                      <TableRow
                        key={creditor._id}
                        className="border-b border-border/30 hover:bg-accent/50 transition-colors"
                      >
                        <TableCell>
                          <span className="font-medium text-foreground">
                            {creditor.name || '---'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {creditor.phone ? (
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                              <Phone className="h-3.5 w-3.5" />
                              {creditor.phone}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">---</span>
                          )}
                        </TableCell>
                        <TableCell className="font-semibold text-red-400">
                          {formatCurrency(creditor.totalDebt || 0)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </DataTableWrapper>
        </TabsContent>

      </Tabs>


      {/* Transaction View (read-only) */}
      <TransactionViewDialog
        open={viewTransaction !== null}
        onOpenChange={(open) => { if (!open) setViewTransaction(null); }}
        transaction={viewTransaction}
      />
    </div>
  );
}
