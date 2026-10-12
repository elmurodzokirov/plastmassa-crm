import { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Plus, Pencil, Ban, Banknote } from 'lucide-react';
import { cn, formatCurrency, getErrorMessage } from '@/lib/utils';
import {
  useExpenses,
  useCreateExpense,
  useUpdateExpense,
  useCancelExpense,
} from '@/hooks/use-finance';
import {
  useSupplierCreditors,
  useSupplierPayments,
  useCreateSupplierPayment,
  useCancelSupplierPayment,
} from '@/hooks/use-suppliers';
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
import { DataTableWrapper } from '@/components/shared/data-table';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { CashOperationsPanel } from '@/components/finance/cash-operations-panel';
import { CancelReasonDialog } from '@/components/finance/cancel-reason-dialog';

// ── Constants ─────────────────────────────────────────────────────────

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

const SUPPLIER_PAYMENT_TYPES = [
  { value: 'CASH', label: 'Naqd' },
  { value: 'TRANSFER', label: "O'tkazma" },
  { value: 'CARD', label: 'Karta' },
];

const SUPPLIER_PAYMENT_TYPE_LABELS: Record<string, string> = {
  CASH: 'Naqd',
  TRANSFER: "O'tkazma",
  CARD: 'Karta',
};

// ── Zod schemas ───────────────────────────────────────────────────────

const expenseSchema = z.object({
  category: z.string().min(1, 'Kategoriyani tanlang'),
  description: z.string().min(1, 'Tavsifni kiriting'),
  amount: z.coerce.number().min(1, 'Summani kiriting'),
  date: z.string().min(1, 'Sanani tanlang'),
  paymentMethod: z.string().min(1, "To'lov usulini tanlang"),
  notes: z.string().optional(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

const supplierPaymentSchema = z.object({
  supplier: z.string().min(1, 'Yetkazib beruvchini tanlang'),
  amount: z.coerce.number().min(0.01, 'Summani kiriting'),
  type: z.enum(['CASH', 'TRANSFER', 'CARD']),
  notes: z.string().optional(),
});

type SupplierPaymentFormData = z.infer<typeof supplierPaymentSchema>;

// ── Component ─────────────────────────────────────────────────────────

export default function ChiqimPage() {
  const [activeTab, setActiveTab] = useState('expenses');

  // ── Expenses state ────────────────────────────────────────────────
  const [expCategoryFilter, setExpCategoryFilter] = useState<string>('ALL');
  const [expPaymentFilter, setExpPaymentFilter] = useState<string>('ALL');
  const [expDateFrom, setExpDateFrom] = useState('');
  const [expDateTo, setExpDateTo] = useState('');
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);

  // ── Supplier payment state ───────────────────────────────────────
  const [supplierPaymentDialogOpen, setSupplierPaymentDialogOpen] = useState(false);

  // ── Queries ───────────────────────────────────────────────────────

  const expenseParams = useMemo(() => {
    const params: any = { limit: 50, sortBy: 'date', sortOrder: 'desc' };
    if (expCategoryFilter !== 'ALL') params.category = expCategoryFilter;
    if (expPaymentFilter !== 'ALL') params.paymentMethod = expPaymentFilter;
    if (expDateFrom) params.dateFrom = expDateFrom;
    if (expDateTo) params.dateTo = expDateTo;
    return params;
  }, [expCategoryFilter, expPaymentFilter, expDateFrom, expDateTo]);
  const { data: expensesData, isLoading: expensesLoading } = useExpenses(expenseParams);

  const { data: creditorsData, isLoading: creditorsLoading } = useSupplierCreditors();
  const { data: supplierPaymentsData, isLoading: supplierPaymentsLoading } =
    useSupplierPayments({ limit: 50, sortBy: 'createdAt', sortOrder: 'desc' });

  // ── Mutations ─────────────────────────────────────────────────────

  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const cancelExpense = useCancelExpense();
  const cancelSupplierPayment = useCancelSupplierPayment();
  const [supplierPaymentToCancel, setSupplierPaymentToCancel] = useState<any | null>(null);
  const createSupplierPayment = useCreateSupplierPayment();

  // ── Derived data ──────────────────────────────────────────────────

  const expenses = expensesData?.items || [];
  const creditors = Array.isArray(creditorsData) ? creditorsData : [];
  const supplierPayments = supplierPaymentsData?.items || [];

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

  const handleDeleteExpense = useCallback(
    async (reason: string) => {
      if (!deletingExpenseId) return;
      try {
        await cancelExpense.mutateAsync({ id: deletingExpenseId, reason });
        toast({
          title: 'Bekor qilindi',
          description: 'Xarajat bekor qilindi',
          variant: 'success',
        });
        setDeleteDialogOpen(false);
        setDeletingExpenseId(null);
      } catch (err) {
        toast({
          title: 'Xatolik',
          description: getErrorMessage(err, 'Xarajatni bekor qilishda xatolik yuz berdi'),
          variant: 'destructive',
        });
      }
    },
    [deletingExpenseId, cancelExpense],
  );

  const handleCancelSupplierPayment = useCallback(
    async (reason: string) => {
      if (!supplierPaymentToCancel) return;
      try {
        await cancelSupplierPayment.mutateAsync({ id: supplierPaymentToCancel._id, reason });
        toast({
          title: 'Bekor qilindi',
          description: "To'lov bekor qilindi, yetkazib beruvchi qarzi qaytarildi",
          variant: 'success',
        });
        setSupplierPaymentToCancel(null);
      } catch (err) {
        toast({
          title: 'Xatolik',
          description: getErrorMessage(err, "To'lovni bekor qilishda xatolik yuz berdi"),
          variant: 'destructive',
        });
      }
    },
    [supplierPaymentToCancel, cancelSupplierPayment],
  );

  // ── Supplier payment form ─────────────────────────────────────────

  const supplierPaymentForm = useForm<SupplierPaymentFormData>({
    resolver: zodResolver(supplierPaymentSchema),
    defaultValues: { supplier: '', amount: 0, type: 'CASH', notes: '' },
  });

  const openSupplierPaymentDialog = useCallback(() => {
    supplierPaymentForm.reset({ supplier: '', amount: 0, type: 'CASH', notes: '' });
    setSupplierPaymentDialogOpen(true);
  }, [supplierPaymentForm]);

  const selectedCreditorId = supplierPaymentForm.watch('supplier');
  const selectedCreditor = creditors.find((c: any) => c._id === selectedCreditorId);

  const handleSubmitSupplierPayment = useCallback(
    async (data: SupplierPaymentFormData) => {
      try {
        await createSupplierPayment.mutateAsync(data);
        toast({
          title: 'Muvaffaqiyatli',
          description: "Yetkazib beruvchiga to'lov amalga oshirildi",
          variant: 'success',
        });
        setSupplierPaymentDialogOpen(false);
      } catch (err: any) {
        toast({
          title: 'Xatolik',
          description:
            err?.response?.data?.message || "To'lovni saqlashda xatolik yuz berdi",
          variant: 'destructive',
        });
      }
    },
    [createSupplierPayment],
  );

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-bold text-foreground">Chiqim</h1>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          <TabsList>
            <TabsTrigger value="expenses">Xarajatlar</TabsTrigger>
            <TabsTrigger value="supplier-payments">Yetkazib beruvchiga to'lovlar</TabsTrigger>
            <TabsTrigger value="withdrawals">Pul yechish</TabsTrigger>
          </TabsList>
        </motion.div>

        {/* ── TAB 1: Xarajatlar (Expenses) ──────────────────────────────── */}
        <TabsContent value="expenses" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="flex flex-col lg:flex-row items-start lg:items-end gap-4"
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1 w-full">
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

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Boshlanish sana</Label>
                <Input
                  type="date"
                  value={expDateFrom}
                  onChange={(e) => setExpDateFrom(e.target.value)}
                  className="h-9 rounded-xl text-xs"
                />
              </div>

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
                  {expenses.map((expense: any) => {
                    const cancelled = expense.status === 'CANCELLED';
                    return (
                    <TableRow
                      key={expense._id}
                      className={cn(
                        'border-b border-border/30 hover:bg-accent/50 transition-colors',
                        cancelled && 'opacity-60',
                      )}
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
                        <span className={cn('font-medium text-foreground', cancelled && 'line-through')}>
                          {expense.description || '---'}
                        </span>
                        {cancelled && (
                          <Badge variant="destructive" className="ml-2" title={expense.cancelReason}>
                            Bekor qilingan
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className={cn('font-semibold text-red-400', cancelled && 'line-through')}>
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
                        {!cancelled && (
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
                            title="Bekor qilish"
                            onClick={() => openDeleteDialog(expense._id)}
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        )}
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </DataTableWrapper>
        </TabsContent>

        {/* ── TAB 2: Yetkazib beruvchiga to'lovlar (Supplier payments) ─── */}
        <TabsContent value="supplier-payments" className="space-y-6">
          <div className="flex justify-end">
            <Button onClick={openSupplierPaymentDialog} className="gap-2 rounded-xl">
              <Banknote className="h-4 w-4" />
              Yangi to'lov
            </Button>
          </div>

          <DataTableWrapper
            isLoading={supplierPaymentsLoading}
            isEmpty={supplierPayments.length === 0}
            emptyTitle="To'lovlar topilmadi"
            emptyDescription="Hozircha yetkazib beruvchiga hech qanday to'lov qayd etilmagan"
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/50 hover:bg-transparent">
                    <TableHead className="min-w-[180px]">Yetkazib beruvchi</TableHead>
                    <TableHead className="min-w-[130px]">Summa</TableHead>
                    <TableHead className="min-w-[140px]">Sana</TableHead>
                    <TableHead className="min-w-[100px]">To'lov turi</TableHead>
                    <TableHead className="min-w-[160px]">Izoh</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplierPayments.map((p: any) => {
                    const supplier = typeof p.supplier === 'object' ? p.supplier : null;
                    const cancelled = p.status === 'CANCELLED';
                    return (
                      <TableRow
                        key={p._id}
                        className={cn(
                          'border-b border-border/30 hover:bg-accent/50 transition-colors',
                          cancelled && 'opacity-60',
                        )}
                      >
                        <TableCell>
                          <span className={cn('font-medium text-foreground', cancelled && 'line-through')}>
                            {supplier?.name || '---'}
                          </span>
                          {cancelled && (
                            <Badge variant="destructive" className="ml-2">
                              Bekor qilingan
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className={cn('font-semibold text-red-400', cancelled && 'line-through')}>
                          {formatCurrency(p.amount || 0)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {p.createdAt ? format(new Date(p.createdAt), 'dd.MM.yyyy HH:mm') : '---'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {SUPPLIER_PAYMENT_TYPE_LABELS[p.type] || p.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {cancelled && p.cancelReason ? `Sabab: ${p.cancelReason}` : p.notes || '---'}
                        </TableCell>
                        <TableCell>
                          {!cancelled && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="To'lovni bekor qilish"
                              onClick={() => setSupplierPaymentToCancel(p)}
                              className="h-7 w-7 text-muted-foreground hover:text-red-400"
                            >
                              <Ban className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </DataTableWrapper>
        </TabsContent>

        <TabsContent value="withdrawals" className="space-y-6">
          <CashOperationsPanel
            direction="OUT"
            addLabel="Pul yechish"
            emptyTitle="Pul yechishlar topilmadi"
            emptyDescription="Egasi olgan pul, kreditni qaytarish kabi chiqimlar shu yerda ko'rinadi"
          />
        </TabsContent>
      </Tabs>

      <CancelReasonDialog
        open={!!supplierPaymentToCancel}
        onOpenChange={(o) => !o && setSupplierPaymentToCancel(null)}
        title="To'lovni bekor qilish"
        description="To'lov o'chirilmaydi: bekor qilingan deb belgilanadi, yetkazib beruvchi qarzi qaytariladi."
        isPending={cancelSupplierPayment.isPending}
        onConfirm={handleCancelSupplierPayment}
      />

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

            <div className="space-y-2">
              <Label>Sana</Label>
              <Input type="date" className="rounded-xl" {...expenseForm.register('date')} />
              {expenseForm.formState.errors.date && (
                <p className="text-xs text-destructive">
                  {expenseForm.formState.errors.date.message}
                </p>
              )}
            </div>

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

      {/* ── Supplier Payment Dialog ──────────────────────────────────────── */}
      <Dialog open={supplierPaymentDialogOpen} onOpenChange={setSupplierPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Yetkazib beruvchiga to'lov</DialogTitle>
            <DialogDescription>
              To'lov kassadan amalga oshiriladi va yetkazib beruvchi qarzidan ayiriladi
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={supplierPaymentForm.handleSubmit(handleSubmitSupplierPayment)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Yetkazib beruvchi</Label>
              <Select
                value={supplierPaymentForm.watch('supplier')}
                onValueChange={(value) => supplierPaymentForm.setValue('supplier', value)}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Yetkazib beruvchini tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {creditors.map((c: any) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.name} — {formatCurrency(c.totalDebt || 0)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {supplierPaymentForm.formState.errors.supplier && (
                <p className="text-xs text-destructive">
                  {supplierPaymentForm.formState.errors.supplier.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Summa</Label>
              <Input
                type="number"
                min={0.01}
                step="any"
                placeholder="0"
                className="rounded-xl"
                {...supplierPaymentForm.register('amount', { valueAsNumber: true })}
              />
              {selectedCreditor && (
                <p className="text-xs text-muted-foreground">
                  Joriy qarz: {formatCurrency(selectedCreditor.currentDebt || 0)}
                </p>
              )}
              {supplierPaymentForm.formState.errors.amount && (
                <p className="text-xs text-destructive">
                  {supplierPaymentForm.formState.errors.amount.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>To'lov usuli</Label>
              <Select
                value={supplierPaymentForm.watch('type')}
                onValueChange={(value) =>
                  supplierPaymentForm.setValue('type', value as 'CASH' | 'TRANSFER' | 'CARD')
                }
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="To'lov usulini tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPLIER_PAYMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Izoh</Label>
              <Textarea
                placeholder="Qo'shimcha izoh (ixtiyoriy)"
                className="rounded-xl"
                {...supplierPaymentForm.register('notes')}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSupplierPaymentDialogOpen(false)}
                disabled={createSupplierPayment.isPending}
                className="rounded-xl"
              >
                Bekor qilish
              </Button>
              <Button
                type="submit"
                disabled={createSupplierPayment.isPending}
                className="gap-2 rounded-xl"
              >
                {createSupplierPayment.isPending ? (
                  <LoadingSpinner size="sm" className="h-4 w-4" />
                ) : (
                  <Banknote className="h-4 w-4" />
                )}
                To'lovni amalga oshirish
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <CancelReasonDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Xarajatni bekor qilish"
        description="Xarajat o'chirilmaydi: bekor qilingan deb belgilanadi va hisobotlardan chiqariladi."
        isPending={cancelExpense.isPending}
        onConfirm={handleDeleteExpense}
      />
    </div>
  );
}
