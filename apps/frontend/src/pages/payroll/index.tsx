import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Users,
  Calculator,
  CheckCircle2,
  Banknote,
  Plus,
  FileText,
  Check,
  X,
  Filter,
  Save,
  Loader2,
  TrendingUp,
  Minus,
  ArrowRightLeft,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import {
  usePayrollByMonth,
  useUpdatePayrollStatus,
  useBulkCalculatePayroll,
  useAdvances,
  useCreateAdvance,
  useUpdateAdvanceStatus,
} from '@/hooks/use-payroll';
import { useUsers } from '@/hooks/use-users';
import { useProductionLogs } from '@/hooks/use-production';
import { useAttendance } from '@/hooks/use-attendance';
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
import { LoadingSpinner } from '@/components/shared/loading-spinner';

const MONTH_NAMES = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr',
];

const advanceSchema = z.object({
  user: z.string().min(1, 'Xodimni tanlang'),
  amount: z.coerce.number().min(1, 'Summani kiriting'),
  date: z.string().min(1, 'Sanani tanlang'),
  notes: z.string().optional(),
});
type AdvanceFormData = z.infer<typeof advanceSchema>;

// Inline row for payroll calculation
interface PayrollRow {
  userId: string;
  fullName: string;
  role: any;
  salaryType: string;
  baseSalary: number;
  bonus: number;
  deductions: number;
  // Computed/existing values (from server)
  existingPayroll: any | null;
}

// Expandable table row
function PayrollEditRow({ row, index, isPieceRate, workerProd, workerAtt, workerAdvance, workerPrevBalance, updateRow, formatCurrency: fmt }: any) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Main row */}
      <TableRow
        className={cn(
          'border-b border-border/20 hover:bg-muted/10 cursor-pointer',
          open && 'bg-muted/10',
        )}
        onClick={() => setOpen(!open)}
      >
        {/* Xodim */}
        <TableCell className="sticky left-0 z-10 bg-card/95 border-r border-border/30">
          <div className="flex items-center gap-2">
            <ChevronRight className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform shrink-0', open && 'rotate-90')} />
            <span className="text-xs font-medium text-foreground">{row.fullName}</span>
          </div>
        </TableCell>
        {/* Turi */}
        <TableCell className="text-center">
          <Badge variant={isPieceRate ? 'outline' : 'secondary'} className="text-[10px] px-1.5 py-0">
            {isPieceRate ? 'Ishbay' : 'Oylik'}
          </Badge>
        </TableCell>
        {/* Davomat / Ishbay */}
        <TableCell>
          {isPieceRate ? (
            <span className="text-xs text-amber-400 font-bold">{fmt(workerProd?.total || 0)}</span>
          ) : (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-green-400 font-medium">{workerAtt?.present || 0}</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-muted-foreground">26</span>
              {(workerAtt?.late || 0) > 0 && <span className="text-yellow-400">{workerAtt.late}c</span>}
              {(workerAtt?.absent || 0) > 0 && <span className="text-red-400">{workerAtt.absent}y</span>}
            </div>
          )}
        </TableCell>
        {/* Oylik */}
        <TableCell className="text-right text-xs text-muted-foreground">
          {!isPieceRate && row.baseSalary > 0 ? fmt(row.baseSalary) : '—'}
        </TableCell>
        {/* Avans */}
        <TableCell className="text-right text-xs">
          {workerAdvance > 0 ? <span className="text-red-400">{fmt(workerAdvance)}</span> : '—'}
        </TableCell>
        {/* Qoldiq */}
        <TableCell className="text-right text-xs">
          {workerPrevBalance > 0 ? <span className="text-amber-400">{fmt(workerPrevBalance)}</span> : '—'}
        </TableCell>
        {/* Bonus */}
        <TableCell onClick={(e: any) => e.stopPropagation()}>
          <Input
            type="number"
            min={0}
            value={row.bonus}
            onChange={(e: any) => updateRow(index, 'bonus', Number(e.target.value) || 0)}
            className="h-7 w-[80px] rounded-lg text-xs"
          />
        </TableCell>
        {/* Ushlanma */}
        <TableCell onClick={(e: any) => e.stopPropagation()}>
          <Input
            type="number"
            min={0}
            value={row.deductions}
            onChange={(e: any) => updateRow(index, 'deductions', Number(e.target.value) || 0)}
            className="h-7 w-[80px] rounded-lg text-xs"
          />
        </TableCell>
      </TableRow>

      {/* Expanded detail row */}
      {open && (
        <TableRow className="bg-muted/5 hover:bg-muted/5">
          <TableCell colSpan={8} className="p-0">
            <div className="px-6 py-3 ml-6 border-l-2 border-indigo-500/30">
              {/* Oylikchi — davomat */}
              {!isPieceRate && workerAtt && (
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-muted-foreground">Keldi:</span>
                    <span className="font-medium text-foreground">{workerAtt.present} kun</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-yellow-500" />
                    <span className="text-muted-foreground">Kechikdi:</span>
                    <span className="font-medium text-foreground">{workerAtt.late} kun</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    <span className="text-muted-foreground">Yarim kun:</span>
                    <span className="font-medium text-foreground">{workerAtt.halfDay}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-red-500" />
                    <span className="text-muted-foreground">Kelmadi:</span>
                    <span className="font-medium text-foreground">{workerAtt.absent} kun</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-gray-500" />
                    <span className="text-muted-foreground">Ta'til:</span>
                    <span className="font-medium text-foreground">{workerAtt.leave} kun</span>
                  </div>
                </div>
              )}

              {/* Ishbaychi — production */}
              {isPieceRate && workerProd && workerProd.products.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {workerProd.products.map((p: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs rounded-lg border border-border/30 px-2.5 py-1.5">
                      <span className="text-foreground font-medium">{p.name}</span>
                      <span className="text-muted-foreground">{p.qty} × {fmt(p.rate)}</span>
                      <span className="text-amber-400 font-medium">= {fmt(p.total)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Bo'sh holat */}
              {!isPieceRate && !workerAtt && (
                <p className="text-xs text-muted-foreground italic">Davomat ma'lumoti yo'q</p>
              )}
              {isPieceRate && (!workerProd || workerProd.products.length === 0) && (
                <p className="text-xs text-muted-foreground italic">Ishlab chiqarish yozuvi yo'q</p>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export default function PayrollPage() {
  const navigate = useNavigate();
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [advanceDialogOpen, setAdvanceDialogOpen] = useState(false);

  // Inline editing state
  const [editMode, setEditMode] = useState(false);
  const [rows, setRows] = useState<PayrollRow[]>([]);

  // Advance filters
  const [advUserFilter, setAdvUserFilter] = useState<string>('ALL');
  const [advStatusFilter, setAdvStatusFilter] = useState<string>('ALL');

  // Queries
  const { data: payrollData, isLoading: payrollLoading } = usePayrollByMonth(selectedYear, selectedMonth);
  const { data: usersData, isLoading: usersLoading } = useUsers({ limit: 9999, isActive: true });

  // Production logs for selected month (ishbaychilar uchun)
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const prodDateFrom = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
  const prodDateTo = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
  const { data: prodLogsData } = useProductionLogs({ dateFrom: prodDateFrom, dateTo: prodDateTo, limit: 99999 });

  // Attendance for selected month (oylikchilar uchun)
  const { data: attendanceData } = useAttendance({ dateFrom: prodDateFrom, dateTo: prodDateTo, limit: 99999 });

  // Advances for selected month
  const monthAdvanceParams = useMemo(() => ({
    limit: 9999,
    status: 'APPROVED',
    dateFrom: prodDateFrom,
    dateTo: prodDateTo,
  }), [prodDateFrom, prodDateTo]);
  const { data: monthAdvancesData } = useAdvances(monthAdvanceParams);

  // Previous month payrolls (for remainingBalance)
  const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
  const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
  const { data: prevPayrollData } = usePayrollByMonth(prevYear, prevMonth);

  const advanceParams = useMemo(() => {
    const params: any = { limit: 9999 };
    if (advUserFilter !== 'ALL') params.user = advUserFilter;
    if (advStatusFilter !== 'ALL') params.status = advStatusFilter;
    return params;
  }, [advUserFilter, advStatusFilter]);

  const { data: advancesData, isLoading: advancesLoading } = useAdvances(advanceParams);

  const updatePayrollStatus = useUpdatePayrollStatus();
  const bulkCalculate = useBulkCalculatePayroll();
  const createAdvance = useCreateAdvance();
  const updateAdvanceStatus = useUpdateAdvanceStatus();

  const users = usersData?.items || [];
  const payrolls = Array.isArray(payrollData) ? payrollData : [];
  const advances = advancesData?.items || [];
  const prodLogs = prodLogsData?.items || [];

  // Production summary per worker: { userId: { totalPieceRate, products: [{ name, qty, rate, total }] } }
  const prodSummary = useMemo(() => {
    const map: Record<string, { total: number; products: { name: string; qty: number; rate: number; total: number }[] }> = {};
    for (const log of prodLogs as any[]) {
      const workerId = typeof log.worker === 'string' ? log.worker : log.worker?._id;
      if (!workerId) continue;
      if (!map[workerId]) map[workerId] = { total: 0, products: [] };
      const pieceRateAmount = log.pieceRateAmount || 0;
      map[workerId].total += pieceRateAmount;

      // Group by product
      const productName = log.productName || 'Noma\'lum';
      const existing = map[workerId].products.find((p) => p.name === productName);
      if (existing) {
        existing.qty += log.quantityProduced;
        existing.total += pieceRateAmount;
      } else {
        const rate = log.quantityProduced > 0 ? pieceRateAmount / log.quantityProduced : 0;
        map[workerId].products.push({ name: productName, qty: log.quantityProduced, rate, total: pieceRateAmount });
      }
    }
    return map;
  }, [prodLogs]);

  // Attendance summary per worker
  const attendanceSummary = useMemo(() => {
    const allRecords = attendanceData?.items || [];
    const map: Record<string, { present: number; absent: number; late: number; halfDay: number; leave: number; total: number }> = {};
    for (const rec of allRecords as any[]) {
      const userId = typeof rec.user === 'string' ? rec.user : rec.user?._id;
      if (!userId) continue;
      if (!map[userId]) map[userId] = { present: 0, absent: 0, late: 0, halfDay: 0, leave: 0, total: 0 };
      map[userId].total++;
      if (rec.status === 'PRESENT') map[userId].present++;
      else if (rec.status === 'ABSENT') map[userId].absent++;
      else if (rec.status === 'LATE') map[userId].late++;
      else if (rec.status === 'HALF_DAY') map[userId].halfDay++;
      else if (rec.status === 'LEAVE') map[userId].leave++;
    }
    return map;
  }, [attendanceData]);

  // Advances summary per worker (this month approved)
  const advanceSummary = useMemo(() => {
    const allAdv = monthAdvancesData?.items || [];
    const map: Record<string, number> = {};
    for (const adv of allAdv as any[]) {
      const userId = typeof adv.user === 'string' ? adv.user : adv.user?._id;
      if (!userId) continue;
      map[userId] = (map[userId] || 0) + adv.amount;
    }
    return map;
  }, [monthAdvancesData]);

  // Previous balance per worker (from last month payroll)
  const prevBalanceMap = useMemo(() => {
    const prevPayrolls = Array.isArray(prevPayrollData) ? prevPayrollData : [];
    const map: Record<string, number> = {};
    for (const p of prevPayrolls as any[]) {
      const userId = typeof p.user === 'string' ? p.user : p.user?._id;
      if (userId && p.remainingBalance) map[userId] = p.remainingBalance;
    }
    return map;
  }, [prevPayrollData]);

  // Stats
  const stats = useMemo(() => {
    const total = users.length;
    const calculated = payrolls.length;
    const confirmed = payrolls.filter((p) => p.status === 'CONFIRMED' || p.status === 'PAID').length;
    const totalPaid = payrolls.reduce((sum, p) => sum + ((p as any).paidAmount || p.netSalary || 0), 0);
    const totalRemaining = payrolls.reduce((sum, p) => sum + ((p as any).remainingBalance || 0), 0);
    return { total, calculated, confirmed, totalPaid, totalRemaining };
  }, [users, payrolls]);

  // Month nav
  const goToPrevMonth = useCallback(() => {
    if (selectedMonth === 1) { setSelectedMonth(12); setSelectedYear((y) => y - 1); }
    else setSelectedMonth((m) => m - 1);
    setEditMode(false);
  }, [selectedMonth]);

  const goToNextMonth = useCallback(() => {
    if (selectedMonth === 12) { setSelectedMonth(1); setSelectedYear((y) => y + 1); }
    else setSelectedMonth((m) => m + 1);
    setEditMode(false);
  }, [selectedMonth]);

  // Enter edit/calculate mode
  const enterEditMode = useCallback(() => {
    const newRows: PayrollRow[] = users.map((u: any) => {
      const existing = payrolls.find((p: any) => {
        const pUserId = typeof p.user === 'string' ? p.user : p.user?._id;
        return pUserId === u._id;
      });
      return {
        userId: u._id,
        fullName: u.fullName,
        role: u.role,
        salaryType: u.salaryType || 'FIXED',
        baseSalary: u.baseSalary || (existing ? (existing as any).baseSalary || 0 : 0),
        bonus: existing ? (existing as any).bonus || 0 : 0,
        deductions: existing ? (existing as any).deductions || 0 : 0,
        existingPayroll: existing || null,
      };
    });
    setRows(newRows);
    setEditMode(true);
  }, [users, payrolls]);

  const updateRow = useCallback((index: number, field: 'baseSalary' | 'bonus' | 'deductions', value: number) => {
    setRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const handleCalculateAll = useCallback(async () => {
    try {
      await bulkCalculate.mutateAsync({
        year: selectedYear,
        month: selectedMonth,
        employees: rows.map((row) => ({
          user: row.userId,
          baseSalary: row.baseSalary,
          bonus: row.bonus,
          deductions: row.deductions,
        })),
      });
      toast({ title: 'Barcha oyliklar hisoblandi', variant: 'success' });
      setEditMode(false);
    } catch {
      toast({ title: 'Xatolik yuz berdi', variant: 'destructive' });
    }
  }, [bulkCalculate, selectedYear, selectedMonth, rows]);

  // Status actions
  const handleConfirm = useCallback(async (id: string) => {
    try {
      await updatePayrollStatus.mutateAsync({ id, status: 'CONFIRMED' });
      toast({ title: 'Tasdiqlandi', variant: 'success' });
    } catch {
      toast({ title: 'Xatolik', variant: 'destructive' });
    }
  }, [updatePayrollStatus]);

  const handleMarkPaid = useCallback(async (id: string) => {
    try {
      await updatePayrollStatus.mutateAsync({ id, status: 'PAID' });
      toast({ title: "To'landi", variant: 'success' });
    } catch {
      toast({ title: 'Xatolik', variant: 'destructive' });
    }
  }, [updatePayrollStatus]);

  // Advance form
  const advanceForm = useForm<AdvanceFormData>({
    resolver: zodResolver(advanceSchema),
    defaultValues: { user: '', amount: 0, date: format(new Date(), 'yyyy-MM-dd'), notes: '' },
  });

  const handleCreateAdvance = useCallback(async (data: AdvanceFormData) => {
    try {
      await createAdvance.mutateAsync(data);
      toast({ title: 'Avans yaratildi', variant: 'success' });
      setAdvanceDialogOpen(false);
      advanceForm.reset({ user: '', amount: 0, date: format(new Date(), 'yyyy-MM-dd'), notes: '' });
    } catch {
      toast({ title: 'Xatolik', variant: 'destructive' });
    }
  }, [createAdvance, advanceForm]);

  // Helpers
  const getUserName = (user: any) => {
    if (!user) return '—';
    return typeof user === 'string' ? user : user.fullName || '—';
  };

  const getRoleName = (user: any) => {
    if (!user) return '';
    const u = typeof user === 'string' ? null : user;
    if (!u) return '';
    return typeof u.role === 'object' ? u.role?.name : u.role || '';
  };

  const getStatusBadge = (status: string) => {
    if (status === 'DRAFT') return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Qoralama</Badge>;
    if (status === 'CONFIRMED') return <Badge variant="warning" className="text-[10px] px-1.5 py-0">Tasdiqlangan</Badge>;
    if (status === 'PAID') return <Badge variant="success" className="text-[10px] px-1.5 py-0">To'langan</Badge>;
    return <Badge variant="outline" className="text-[10px] px-1.5 py-0">{status}</Badge>;
  };

  const isLoading = payrollLoading || usersLoading;

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
      >
        <h1 className="text-2xl font-bold text-foreground">Oylik maosh</h1>

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={String(selectedYear)} onValueChange={(v) => { setSelectedYear(Number(v)); setEditMode(false); }}>
            <SelectTrigger className="w-[100px] h-9 rounded-xl text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[selectedYear - 1, selectedYear, selectedYear + 1].map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl" onClick={goToPrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Select value={String(selectedMonth)} onValueChange={(v) => { setSelectedMonth(Number(v)); setEditMode(false); }}>
              <SelectTrigger className="w-[130px] h-9 rounded-xl text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTH_NAMES.map((name, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl" onClick={goToNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="payroll" className="space-y-5">
        <TabsList>
          <TabsTrigger value="payroll">Oylik hisoblash</TabsTrigger>
          <TabsTrigger value="advances">Avanslar</TabsTrigger>
        </TabsList>

        {/* TAB 1: Payroll */}
        <TabsContent value="payroll" className="space-y-5">
          {/* Stats */}
          {!isLoading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <StatCard title="Xodimlar" value={stats.total} icon={Users} iconColor="text-indigo-400" iconBg="bg-indigo-500/20" index={0} />
              <StatCard title="Hisoblangan" value={stats.calculated} icon={Calculator} iconColor="text-blue-400" iconBg="bg-blue-500/20" index={1} />
              <StatCard title="Tasdiqlangan" value={stats.confirmed} icon={CheckCircle2} iconColor="text-green-400" iconBg="bg-green-500/20" index={2} />
              <StatCard title="To'langan" value={formatCurrency(stats.totalPaid)} icon={Banknote} iconColor="text-emerald-400" iconBg="bg-emerald-500/20" index={3} />
              <StatCard title="Qoldiq" value={formatCurrency(stats.totalRemaining)} icon={ArrowRightLeft} iconColor="text-amber-400" iconBg="bg-amber-500/20" index={4} />
            </div>
          )}

          {/* Actions */}
          {!isLoading && (
            <div className="flex items-center justify-between gap-3">
              {!editMode ? (
                <Button onClick={enterEditMode} className="gap-1.5 rounded-xl h-9" size="sm">
                  <Calculator className="h-3.5 w-3.5" />
                  Oylik hisoblash
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button onClick={handleCalculateAll} disabled={bulkCalculate.isPending} className="gap-1.5 rounded-xl h-9" size="sm">
                    {bulkCalculate.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Barchasini hisoblash
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-xl h-9" onClick={() => setEditMode(false)}>
                    Bekor qilish
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Main Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20"><LoadingSpinner size="lg" /></div>
          ) : editMode ? (
            /* ── EDIT MODE: Table with expandable rows ── */
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-xl overflow-hidden"
            >
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border/50 hover:bg-transparent text-[11px]">
                      <TableHead className="sticky left-0 z-10 bg-card/95 min-w-[160px] border-r border-border/30">Xodim</TableHead>
                      <TableHead className="min-w-[70px] text-center">Ish haqi</TableHead>
                      <TableHead className="min-w-[110px]">Davomat / Ishbay</TableHead>
                      <TableHead className="min-w-[90px] text-right">Oylik</TableHead>
                      <TableHead className="min-w-[80px] text-right">Avans</TableHead>
                      <TableHead className="min-w-[80px] text-right">Qoldiq</TableHead>
                      <TableHead className="min-w-[90px]">Bonus</TableHead>
                      <TableHead className="min-w-[90px]">Ushlanma</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, index) => (
                      <PayrollEditRow
                        key={row.userId}
                        row={row}
                        index={index}
                        isPieceRate={row.salaryType === 'PIECE_RATE'}
                        workerProd={row.salaryType === 'PIECE_RATE' ? prodSummary[row.userId] : null}
                        workerAtt={attendanceSummary[row.userId]}
                        workerAdvance={advanceSummary[row.userId] || 0}
                        workerPrevBalance={prevBalanceMap[row.userId] || 0}
                        updateRow={updateRow}
                        formatCurrency={formatCurrency}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </motion.div>
          ) : payrolls.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Calculator className="h-10 w-10 text-muted-foreground mb-3" />
              <h3 className="text-lg font-semibold">Hisob-kitob topilmadi</h3>
              <p className="text-sm text-muted-foreground mt-1">Bu oy uchun hali oylik hisoblash amalga oshirilmagan</p>
            </div>
          ) : (
            /* ── VIEW MODE: Payroll results ── */
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-xl overflow-hidden"
            >
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border/50 hover:bg-transparent text-[11px]">
                      <TableHead className="sticky left-0 z-10 bg-card/95 min-w-[150px] border-r border-border/30">Xodim</TableHead>
                      <TableHead className="min-w-[60px] text-center">Ish haqi</TableHead>
                      <TableHead className="min-w-[80px] text-right">Asosiy</TableHead>
                      <TableHead className="min-w-[70px] text-right">Ishbay</TableHead>
                      <TableHead className="min-w-[60px] text-center">Kun</TableHead>
                      <TableHead className="min-w-[70px] text-right">Bonus</TableHead>
                      <TableHead className="min-w-[70px] text-right">Ushlan.</TableHead>
                      <TableHead className="min-w-[70px] text-right">Avans</TableHead>
                      <TableHead className="min-w-[80px] text-right">Oldingi</TableHead>
                      <TableHead className="min-w-[90px] text-right font-bold">To'lan.</TableHead>
                      <TableHead className="min-w-[80px] text-right">Qoldiq</TableHead>
                      <TableHead className="min-w-[70px] text-center">Holat</TableHead>
                      <TableHead className="w-[70px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrolls.map((payroll: any) => {
                      const isPieceRate = payroll.salaryType === 'PIECE_RATE';
                      const remaining = payroll.remainingBalance || 0;
                      return (
                        <TableRow
                          key={payroll._id}
                          className={cn(
                            'border-b border-border/20 cursor-pointer hover:bg-muted/10 transition-colors text-xs',
                            remaining > 0 && 'bg-amber-500/5',
                          )}
                          onClick={() => navigate(`/payroll/${payroll._id}/slip`)}
                        >
                          <TableCell className="sticky left-0 z-10 bg-card/95 border-r border-border/30">
                            <p className="text-xs font-medium text-foreground">{getUserName(payroll.user)}</p>
                            <p className="text-[10px] text-muted-foreground">{getRoleName(payroll.user)}</p>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={isPieceRate ? 'outline' : 'secondary'} className="text-[10px] px-1.5 py-0">
                              {isPieceRate ? 'Ishbay' : 'Oylik'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {payroll.baseSalary > 0 ? formatCurrency(payroll.baseSalary) : '—'}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {payroll.productionEarnings > 0 ? formatCurrency(payroll.productionEarnings) : '—'}
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground">
                            {isPieceRate ? '—' : `${payroll.presentDays}/${payroll.workingDays}`}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {payroll.bonus > 0 ? formatCurrency(payroll.bonus) : '—'}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {payroll.deductions > 0 ? formatCurrency(payroll.deductions) : '—'}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {payroll.advancesTotal > 0 ? formatCurrency(payroll.advancesTotal) : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            {payroll.previousBalance > 0 ? (
                              <span className="text-amber-400">{formatCurrency(payroll.previousBalance)}</span>
                            ) : '—'}
                          </TableCell>
                          <TableCell className="text-right font-bold text-foreground">
                            {formatCurrency(payroll.paidAmount || payroll.netSalary)}
                          </TableCell>
                          <TableCell className="text-right">
                            {remaining !== 0 ? (
                              <span className={remaining > 0 ? 'text-amber-400 font-medium' : 'text-green-400'}>
                                {formatCurrency(remaining)}
                              </span>
                            ) : '—'}
                          </TableCell>
                          <TableCell className="text-center">
                            {getStatusBadge(payroll.status)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                              {payroll.status === 'DRAFT' && (
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-green-400 hover:text-green-300" onClick={() => handleConfirm(payroll._id)}>
                                  <Check className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {payroll.status === 'CONFIRMED' && (
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-400 hover:text-emerald-300" onClick={() => handleMarkPaid(payroll._id)}>
                                  <Banknote className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => navigate(`/payroll/${payroll._id}/slip`)}>
                                <FileText className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </motion.div>
          )}
        </TabsContent>

        {/* TAB 2: Advances */}
        <TabsContent value="advances" className="space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={advUserFilter} onValueChange={setAdvUserFilter}>
                <SelectTrigger className="h-9 w-[160px] rounded-xl text-xs">
                  <SelectValue placeholder="Xodim" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Hammasi</SelectItem>
                  {users.map((u: any) => (
                    <SelectItem key={u._id} value={u._id}>{u.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={advStatusFilter} onValueChange={setAdvStatusFilter}>
                <SelectTrigger className="h-9 w-[140px] rounded-xl text-xs">
                  <SelectValue placeholder="Holat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Hammasi</SelectItem>
                  <SelectItem value="PENDING">Kutilmoqda</SelectItem>
                  <SelectItem value="APPROVED">Tasdiqlangan</SelectItem>
                  <SelectItem value="REJECTED">Rad etilgan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              size="sm"
              className="gap-1.5 rounded-xl h-9 ml-auto"
              onClick={() => {
                advanceForm.reset({ user: '', amount: 0, date: format(new Date(), 'yyyy-MM-dd'), notes: '' });
                setAdvanceDialogOpen(true);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Yangi avans
            </Button>
          </div>

          {advancesLoading ? (
            <div className="flex items-center justify-center py-20"><LoadingSpinner size="lg" /></div>
          ) : advances.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Banknote className="h-10 w-10 text-muted-foreground mb-3" />
              <h3 className="text-lg font-semibold">Avanslar topilmadi</h3>
            </div>
          ) : (
            <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-xl overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border/50 hover:bg-transparent">
                      <TableHead>Xodim</TableHead>
                      <TableHead>Summa</TableHead>
                      <TableHead>Sana</TableHead>
                      <TableHead>Holat</TableHead>
                      <TableHead>Izoh</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {advances.map((adv: any) => (
                      <TableRow key={adv._id} className="border-b border-border/20">
                        <TableCell className="font-medium text-foreground text-sm">{getUserName(adv.user)}</TableCell>
                        <TableCell className="font-semibold text-foreground">{formatCurrency(adv.amount)}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {adv.date ? format(new Date(adv.date), 'dd.MM.yyyy') : '—'}
                        </TableCell>
                        <TableCell>
                          {adv.status === 'PENDING' && <Badge variant="warning" className="text-[10px]">Kutilmoqda</Badge>}
                          {adv.status === 'APPROVED' && <Badge variant="success" className="text-[10px]">Tasdiqlangan</Badge>}
                          {adv.status === 'REJECTED' && <Badge variant="destructive" className="text-[10px]">Rad etilgan</Badge>}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{adv.notes || '—'}</TableCell>
                        <TableCell>
                          {adv.status === 'PENDING' && (
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-green-400 hover:bg-green-500/10"
                                onClick={() => updateAdvanceStatus.mutateAsync({ id: adv._id, status: 'APPROVED' }).then(() => toast({ title: 'Tasdiqlandi' }))}
                              >
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:bg-red-500/10"
                                onClick={() => updateAdvanceStatus.mutateAsync({ id: adv._id, status: 'REJECTED' }).then(() => toast({ title: 'Rad etildi' }))}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Advance Dialog */}
      <Dialog open={advanceDialogOpen} onOpenChange={setAdvanceDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Yangi avans</DialogTitle>
          </DialogHeader>
          <form onSubmit={advanceForm.handleSubmit(handleCreateAdvance)} className="space-y-4">
            <div className="space-y-2">
              <Label>Xodim</Label>
              <Select value={advanceForm.watch('user')} onValueChange={(v) => advanceForm.setValue('user', v)}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Tanlang" /></SelectTrigger>
                <SelectContent>
                  {users.map((u: any) => (
                    <SelectItem key={u._id} value={u._id}>{u.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Summa</Label>
                <Input type="number" min={1} className="rounded-xl" {...advanceForm.register('amount', { valueAsNumber: true })} />
              </div>
              <div className="space-y-2">
                <Label>Sana</Label>
                <Input type="date" className="rounded-xl" {...advanceForm.register('date')} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Izoh</Label>
              <Textarea placeholder="Ixtiyoriy" className="rounded-xl" {...advanceForm.register('notes')} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAdvanceDialogOpen(false)} className="rounded-xl">Bekor</Button>
              <Button type="submit" disabled={createAdvance.isPending} className="gap-1.5 rounded-xl">
                {createAdvance.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Yaratish
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
