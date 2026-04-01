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
  Pencil,
  Trash2,
  Phone,
  BarChart3,
  Wallet,
  Receipt,
  PieChart,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import {
  useExpenses,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
  useCashFlow,
  useMonthlyCashFlow,
  useDebtors,
  useProfitAndLoss,
} from '@/hooks/use-finance';
import { toast } from '@/components/ui/use-toast';

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

// ── Constants ─────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'Yanvar',
  'Fevral',
  'Mart',
  'Aprel',
  'May',
  'Iyun',
  'Iyul',
  'Avgust',
  'Sentyabr',
  'Oktyabr',
  'Noyabr',
  'Dekabr',
];

const EXPENSE_CATEGORIES = [
  { value: 'Xomashyo', label: 'Xomashyo' },
  { value: 'Transport', label: 'Transport' },
  { value: 'Kommunal', label: 'Kommunal' },
  { value: 'Maosh', label: 'Maosh' },
  { value: 'Boshqa', label: 'Boshqa' },
];

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Naqd' },
  { value: 'bank', label: 'Bank' },
  { value: 'card', label: 'Karta' },
];

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Naqd',
  bank: 'Bank',
  card: 'Karta',
};

const CATEGORY_COLORS: Record<string, string> = {
  Xomashyo: 'bg-blue-500/20 text-blue-400',
  Transport: 'bg-yellow-500/20 text-yellow-400',
  Kommunal: 'bg-purple-500/20 text-purple-400',
  Maosh: 'bg-green-500/20 text-green-400',
  Boshqa: 'bg-gray-500/20 text-gray-400',
};

// ── Zod schema for expense form ───────────────────────────────────────

const expenseSchema = z.object({
  category: z.string().min(1, 'Kategoriyani tanlang'),
  description: z.string().min(1, 'Tavsifni kiriting'),
  amount: z.coerce.number().min(1, 'Summani kiriting'),
  date: z.string().min(1, 'Sanani tanlang'),
  paymentMethod: z.string().min(1, "To'lov usulini tanlang"),
  notes: z.string().optional(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

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
  const now = new Date();
  const defaultRange = getMonthRange();

  // ── Shared state ──────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('cashflow');

  // ── Cash Flow state ───────────────────────────────────────────────
  const [cfDateFrom, setCfDateFrom] = useState(defaultRange.dateFrom);
  const [cfDateTo, setCfDateTo] = useState(defaultRange.dateTo);
  const [cfYear] = useState(now.getFullYear());

  // ── Expenses state ────────────────────────────────────────────────
  const [expCategoryFilter, setExpCategoryFilter] = useState<string>('ALL');
  const [expPaymentFilter, setExpPaymentFilter] = useState<string>('ALL');
  const [expDateFrom, setExpDateFrom] = useState('');
  const [expDateTo, setExpDateTo] = useState('');
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);

  // ── P&L state ─────────────────────────────────────────────────────
  const [plDateFrom, setPlDateFrom] = useState(defaultRange.dateFrom);
  const [plDateTo, setPlDateTo] = useState(defaultRange.dateTo);

  // ── Queries ───────────────────────────────────────────────────────

  const cashFlowParams = useMemo(
    () => ({ dateFrom: cfDateFrom, dateTo: cfDateTo }),
    [cfDateFrom, cfDateTo],
  );
  const { data: cashFlowData, isLoading: cashFlowLoading } = useCashFlow(cashFlowParams);
  const { data: monthlyCashFlow, isLoading: monthlyLoading } = useMonthlyCashFlow(cfYear);

  const { data: debtorsData, isLoading: debtorsLoading } = useDebtors();

  const expenseParams = useMemo(() => {
    const params: any = { limit: 50, sortBy: 'date', sortOrder: 'desc' };
    if (expCategoryFilter !== 'ALL') params.category = expCategoryFilter;
    if (expPaymentFilter !== 'ALL') params.paymentMethod = expPaymentFilter;
    if (expDateFrom) params.dateFrom = expDateFrom;
    if (expDateTo) params.dateTo = expDateTo;
    return params;
  }, [expCategoryFilter, expPaymentFilter, expDateFrom, expDateTo]);
  const { data: expensesData, isLoading: expensesLoading } = useExpenses(expenseParams);

  const plParams = useMemo(
    () => ({ dateFrom: plDateFrom, dateTo: plDateTo }),
    [plDateFrom, plDateTo],
  );
  const { data: plData, isLoading: plLoading } = useProfitAndLoss(plParams);

  // ── Mutations ─────────────────────────────────────────────────────

  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();

  // ── Derived data ──────────────────────────────────────────────────

  const debtors = Array.isArray(debtorsData) ? debtorsData : [];
  const totalDebt = debtors.reduce((sum, d) => sum + (d.totalDebt || 0), 0);
  const expenses = expensesData?.items || [];
  const monthlyData = Array.isArray(monthlyCashFlow) ? monthlyCashFlow : [];

  // ── Expense form ──────────────────────────────────────────────────

  const expenseForm = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      category: '',
      description: '',
      amount: 0,
      date: format(new Date(), 'yyyy-MM-dd'),
      paymentMethod: '',
      notes: '',
    },
  });

  const openCreateDialog = useCallback(() => {
    setEditingExpense(null);
    expenseForm.reset({
      category: '',
      description: '',
      amount: 0,
      date: format(new Date(), 'yyyy-MM-dd'),
      paymentMethod: '',
      notes: '',
    });
    setExpenseDialogOpen(true);
  }, [expenseForm]);

  const openEditDialog = useCallback(
    (expense: any) => {
      setEditingExpense(expense);
      expenseForm.reset({
        category: expense.category || '',
        description: expense.description || '',
        amount: expense.amount || 0,
        date: expense.date ? format(new Date(expense.date), 'yyyy-MM-dd') : '',
        paymentMethod: expense.paymentMethod || '',
        notes: expense.notes || '',
      });
      setExpenseDialogOpen(true);
    },
    [expenseForm],
  );

  const handleSubmitExpense = useCallback(
    async (data: ExpenseFormData) => {
      try {
        if (editingExpense) {
          await updateExpense.mutateAsync({ id: editingExpense._id, data });
          toast({
            title: 'Muvaffaqiyatli',
            description: 'Xarajat yangilandi',
            variant: 'success',
          });
        } else {
          await createExpense.mutateAsync(data);
          toast({
            title: 'Muvaffaqiyatli',
            description: "Xarajat qo'shildi",
            variant: 'success',
          });
        }
        setExpenseDialogOpen(false);
        setEditingExpense(null);
      } catch {
        toast({
          title: 'Xatolik',
          description: 'Xarajatni saqlashda xatolik yuz berdi',
          variant: 'destructive',
        });
      }
    },
    [editingExpense, createExpense, updateExpense],
  );

  const openDeleteDialog = useCallback((id: string) => {
    setDeletingExpenseId(id);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteExpense = useCallback(async () => {
    if (!deletingExpenseId) return;
    try {
      await deleteExpense.mutateAsync(deletingExpenseId);
      toast({
        title: 'Muvaffaqiyatli',
        description: "Xarajat o'chirildi",
        variant: 'success',
      });
      setDeleteDialogOpen(false);
      setDeletingExpenseId(null);
    } catch {
      toast({
        title: 'Xatolik',
        description: "Xarajatni o'chirishda xatolik yuz berdi",
        variant: 'destructive',
      });
    }
  }, [deletingExpenseId, deleteExpense]);

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
            <TabsTrigger value="expenses">Xarajatlar</TabsTrigger>
            <TabsTrigger value="pnl">Foyda va Zarar</TabsTrigger>
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
                title="Sof foyda"
                value={formatCurrency(cashFlowData.netProfit || 0)}
                icon={DollarSign}
                iconColor="text-indigo-400"
                iconBg="bg-indigo-500/20"
                index={2}
              />
            </div>
          )}

          {cashFlowLoading && (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          )}

          {/* Monthly Cash Flow Table */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <h2 className="text-lg font-semibold text-foreground mb-4">
              {cfYear}-yil oylik pul oqimi
            </h2>
            <DataTableWrapper
              isLoading={monthlyLoading}
              isEmpty={monthlyData.length === 0}
              emptyTitle="Ma'lumot topilmadi"
              emptyDescription="Bu yil uchun oylik pul oqimi mavjud emas"
            >
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border/50 hover:bg-transparent">
                      <TableHead className="min-w-[120px]">Oy</TableHead>
                      <TableHead className="min-w-[140px]">Kirim</TableHead>
                      <TableHead className="min-w-[140px]">Chiqim</TableHead>
                      <TableHead className="min-w-[140px]">Sof foyda</TableHead>
                      <TableHead className="min-w-[100px]">Holat</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyData.map((row) => (
                      <TableRow
                        key={row.month}
                        className="border-b border-border/30 hover:bg-accent/50 transition-colors"
                      >
                        <TableCell className="font-medium text-foreground">
                          {MONTH_NAMES[row.month - 1] || `Oy ${row.month}`}
                        </TableCell>
                        <TableCell className="text-green-400">
                          {formatCurrency(row.income || 0)}
                        </TableCell>
                        <TableCell className="text-red-400">
                          {formatCurrency(row.expense || 0)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            'font-semibold',
                            (row.net || 0) >= 0 ? 'text-green-400' : 'text-red-400',
                          )}
                        >
                          {formatCurrency(row.net || 0)}
                        </TableCell>
                        <TableCell>
                          {(row.net || 0) >= 0 ? (
                            <Badge variant="success">Foyda</Badge>
                          ) : (
                            <Badge variant="destructive">Zarar</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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

        {/* ── TAB 3: Xarajatlar (Expenses) ─────────────────────────────── */}
        <TabsContent value="expenses" className="space-y-6">
          {/* Filters & Create button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="flex flex-col lg:flex-row items-start lg:items-end gap-4"
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1 w-full">
              {/* Category filter */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Kategoriya</Label>
                <Select value={expCategoryFilter} onValueChange={setExpCategoryFilter}>
                  <SelectTrigger className="h-9 rounded-xl text-xs">
                    <SelectValue placeholder="Hammasi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Hammasi</SelectItem>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Payment method filter */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">To'lov usuli</Label>
                <Select value={expPaymentFilter} onValueChange={setExpPaymentFilter}>
                  <SelectTrigger className="h-9 rounded-xl text-xs">
                    <SelectValue placeholder="Hammasi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Hammasi</SelectItem>
                    {PAYMENT_METHODS.map((pm) => (
                      <SelectItem key={pm.value} value={pm.value}>
                        {pm.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date from */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Boshlanish sana</Label>
                <Input
                  type="date"
                  value={expDateFrom}
                  onChange={(e) => setExpDateFrom(e.target.value)}
                  className="h-9 rounded-xl text-xs"
                />
              </div>

              {/* Date to */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Tugash sana</Label>
                <Input
                  type="date"
                  value={expDateTo}
                  onChange={(e) => setExpDateTo(e.target.value)}
                  className="h-9 rounded-xl text-xs"
                />
              </div>
            </div>

            <Button onClick={openCreateDialog} className="gap-2 rounded-xl shrink-0">
              <Plus className="h-4 w-4" />
              Xarajat qo'shish
            </Button>
          </motion.div>

          {/* Expenses Table */}
          <DataTableWrapper
            isLoading={expensesLoading}
            isEmpty={expenses.length === 0}
            emptyTitle="Xarajatlar topilmadi"
            emptyDescription="Hozircha hech qanday xarajat kiritilmagan"
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/50 hover:bg-transparent">
                    <TableHead className="min-w-[120px]">Kategoriya</TableHead>
                    <TableHead className="min-w-[180px]">Tavsif</TableHead>
                    <TableHead className="min-w-[130px]">Summa</TableHead>
                    <TableHead className="min-w-[100px]">Sana</TableHead>
                    <TableHead className="min-w-[110px]">To'lov usuli</TableHead>
                    <TableHead className="w-[100px]">Amallar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow
                      key={expense._id}
                      className="border-b border-border/30 hover:bg-accent/50 transition-colors"
                    >
                      <TableCell>
                        <Badge
                          className={cn(
                            'border-transparent',
                            CATEGORY_COLORS[expense.category] || CATEGORY_COLORS['Boshqa'],
                          )}
                        >
                          {expense.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-foreground">
                          {expense.description || '---'}
                        </span>
                      </TableCell>
                      <TableCell className="font-semibold text-red-400">
                        {formatCurrency(expense.amount || 0)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {expense.date
                          ? format(new Date(expense.date), 'dd.MM.yyyy')
                          : '---'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {PAYMENT_METHOD_LABELS[expense.paymentMethod] || expense.paymentMethod}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                            onClick={() => openEditDialog(expense)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            onClick={() => openDeleteDialog(expense._id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </DataTableWrapper>
        </TabsContent>

        {/* ── TAB 4: Foyda va Zarar (P&L) ──────────────────────────────── */}
        <TabsContent value="pnl" className="space-y-6">
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
                value={plDateFrom}
                onChange={(e) => setPlDateFrom(e.target.value)}
                className="h-9 rounded-xl text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Tugash sana</Label>
              <Input
                type="date"
                value={plDateTo}
                onChange={(e) => setPlDateTo(e.target.value)}
                className="h-9 rounded-xl text-xs"
              />
            </div>
          </motion.div>

          {plLoading && (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          )}

          {!plLoading && plData && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                  title="Jami daromad"
                  value={formatCurrency(plData.totalRevenue || 0)}
                  icon={TrendingUp}
                  iconColor="text-green-400"
                  iconBg="bg-green-500/20"
                  index={0}
                />
                <StatCard
                  title="Jami xarajat"
                  value={formatCurrency(plData.totalExpenses || 0)}
                  icon={TrendingDown}
                  iconColor="text-red-400"
                  iconBg="bg-red-500/20"
                  index={1}
                />
                <StatCard
                  title="Sof foyda"
                  value={formatCurrency(plData.netProfit || 0)}
                  icon={BarChart3}
                  iconColor="text-indigo-400"
                  iconBg="bg-indigo-500/20"
                  index={2}
                />
              </div>

              {/* Revenue Breakdown by Product */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.25 }}
              >
                <h3 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-green-400" />
                  Mahsulot bo'yicha daromad
                </h3>
                <DataTableWrapper
                  isEmpty={!plData.revenueByProduct || plData.revenueByProduct.length === 0}
                  emptyTitle="Ma'lumot topilmadi"
                  emptyDescription="Bu davr uchun mahsulot bo'yicha daromad mavjud emas"
                >
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-border/50 hover:bg-transparent">
                          <TableHead className="min-w-[200px]">Mahsulot</TableHead>
                          <TableHead className="min-w-[120px]">Miqdori</TableHead>
                          <TableHead className="min-w-[150px]">Jami summa</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(plData.revenueByProduct || []).map((item, idx) => (
                          <TableRow
                            key={idx}
                            className="border-b border-border/30 hover:bg-accent/50 transition-colors"
                          >
                            <TableCell className="font-medium text-foreground">
                              {item.name || '---'}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {item.quantity ?? '---'}
                            </TableCell>
                            <TableCell className="font-semibold text-green-400">
                              {formatCurrency(item.total || 0)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </DataTableWrapper>
              </motion.div>

              {/* Expense Breakdown by Category */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
              >
                <h3 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                  <PieChart className="h-4 w-4 text-red-400" />
                  Kategoriya bo'yicha xarajatlar
                </h3>
                <DataTableWrapper
                  isEmpty={!plData.expensesByCategory || plData.expensesByCategory.length === 0}
                  emptyTitle="Ma'lumot topilmadi"
                  emptyDescription="Bu davr uchun kategoriya bo'yicha xarajat mavjud emas"
                >
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-border/50 hover:bg-transparent">
                          <TableHead className="min-w-[180px]">Kategoriya</TableHead>
                          <TableHead className="min-w-[100px]">Soni</TableHead>
                          <TableHead className="min-w-[150px]">Jami summa</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(plData.expensesByCategory || []).map((item, idx) => (
                          <TableRow
                            key={idx}
                            className="border-b border-border/30 hover:bg-accent/50 transition-colors"
                          >
                            <TableCell>
                              <Badge
                                className={cn(
                                  'border-transparent',
                                  CATEGORY_COLORS[item.category] || CATEGORY_COLORS['Boshqa'],
                                )}
                              >
                                {item.category || '---'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {item.count ?? '---'}
                            </TableCell>
                            <TableCell className="font-semibold text-red-400">
                              {formatCurrency(item.total || 0)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </DataTableWrapper>
              </motion.div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Create/Edit Expense Dialog ──────────────────────────────────── */}
      <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingExpense ? 'Xarajatni tahrirlash' : "Xarajat qo'shish"}
            </DialogTitle>
            <DialogDescription>
              {editingExpense
                ? "Xarajat ma'lumotlarini yangilang"
                : "Yangi xarajat ma'lumotlarini kiriting"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={expenseForm.handleSubmit(handleSubmitExpense)} className="space-y-4">
            {/* Category */}
            <div className="space-y-2">
              <Label>Kategoriya</Label>
              <Select
                value={expenseForm.watch('category')}
                onValueChange={(value) => expenseForm.setValue('category', value)}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Kategoriyani tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {expenseForm.formState.errors.category && (
                <p className="text-xs text-destructive">
                  {expenseForm.formState.errors.category.message}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Tavsif</Label>
              <Input
                placeholder="Xarajat tavsifi"
                className="rounded-xl"
                {...expenseForm.register('description')}
              />
              {expenseForm.formState.errors.description && (
                <p className="text-xs text-destructive">
                  {expenseForm.formState.errors.description.message}
                </p>
              )}
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label>Summa</Label>
              <Input
                type="number"
                min={1}
                placeholder="0"
                className="rounded-xl"
                {...expenseForm.register('amount', { valueAsNumber: true })}
              />
              {expenseForm.formState.errors.amount && (
                <p className="text-xs text-destructive">
                  {expenseForm.formState.errors.amount.message}
                </p>
              )}
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label>Sana</Label>
              <Input type="date" className="rounded-xl" {...expenseForm.register('date')} />
              {expenseForm.formState.errors.date && (
                <p className="text-xs text-destructive">
                  {expenseForm.formState.errors.date.message}
                </p>
              )}
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label>To'lov usuli</Label>
              <Select
                value={expenseForm.watch('paymentMethod')}
                onValueChange={(value) => expenseForm.setValue('paymentMethod', value)}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="To'lov usulini tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((pm) => (
                    <SelectItem key={pm.value} value={pm.value}>
                      {pm.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {expenseForm.formState.errors.paymentMethod && (
                <p className="text-xs text-destructive">
                  {expenseForm.formState.errors.paymentMethod.message}
                </p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Izoh</Label>
              <Textarea
                placeholder="Qo'shimcha izoh (ixtiyoriy)"
                className="rounded-xl"
                {...expenseForm.register('notes')}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setExpenseDialogOpen(false)}
                disabled={createExpense.isPending || updateExpense.isPending}
                className="rounded-xl"
              >
                Bekor qilish
              </Button>
              <Button
                type="submit"
                disabled={createExpense.isPending || updateExpense.isPending}
                className="gap-2 rounded-xl"
              >
                {(createExpense.isPending || updateExpense.isPending) ? (
                  <LoadingSpinner size="sm" className="h-4 w-4" />
                ) : editingExpense ? (
                  <Pencil className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {editingExpense ? 'Yangilash' : "Qo'shish"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ──────────────────────────────────── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Xarajatni o'chirish</DialogTitle>
            <DialogDescription>
              Bu xarajatni o'chirishni xohlaysizmi? Bu amalni qaytarib bo'lmaydi.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteExpense.isPending}
              className="rounded-xl"
            >
              Bekor qilish
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteExpense}
              disabled={deleteExpense.isPending}
              className="gap-2 rounded-xl"
            >
              {deleteExpense.isPending ? (
                <LoadingSpinner size="sm" className="h-4 w-4" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              O'chirish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
