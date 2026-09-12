import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import type { BulkCalculatePayrollSkippedItem } from '@plastmassa/shared';
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
  AlertTriangle,
  ArrowRightLeft,
  Package,
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
const DEFAULT_WORKING_DAYS = 26;

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
  initialBaseSalary: number;
  initialBonus: number;
  initialDeductions: number;
  // Computed/existing values (from server)
  existingPayroll: any | null;
}

interface PayrollPreview {
  attendanceEarnings: number;
  overtimeAmount: number;
  productionEarnings: number;
  totalEarned: number;
  payout: number;
  remainingBalance: number;
  previousBalance: number;
  advances: number;
  warnings: string[];
  hasChanges: boolean;
}

const roundAmount = (value: number) => Math.round(Number.isFinite(value) ? value : 0);

// Expandable table row
function PayrollEditRow({
  row,
  index,
  isPieceRate,
  workerProd,
  workerAtt,
  workerAdvance,
  workerPrevBalance,
  preview,
  updateRow,
  formatCurrency: fmt,
}: any) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Main row */}
      <TableRow
        className={cn(
          'border-b border-border/20 hover:bg-muted/10 cursor-pointer',
          open && 'bg-muted/10',
          preview.warnings.length > 0 && 'bg-amber-500/5',
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
        {/* Oldingi qoldiq */}
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
        {/* Hisoblangan */}
        <TableCell className="text-right text-xs font-medium text-foreground">
          {fmt(preview.totalEarned)}
        </TableCell>
        {/* To'lanadigan */}
        <TableCell className="text-right text-xs font-semibold">
          <span className={cn(preview.payout < 0 ? 'text-red-400' : 'text-emerald-400')}>
            {fmt(preview.payout)}
          </span>
        </TableCell>
        {/* Holat */}
        <TableCell className="text-right">
          <div className="flex flex-wrap justify-end gap-1">
            {preview.hasChanges && (
              <Badge variant="info" className="text-[10px] px-1.5 py-0">
                O'zgardi
              </Badge>
            )}
            {preview.warnings.length > 0 ? (
              <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                {preview.warnings.length} ogoh.
              </Badge>
            ) : (
              <Badge variant="success" className="text-[10px] px-1.5 py-0">
                Tayyor
              </Badge>
            )}
          </div>
        </TableCell>
      </TableRow>

      {/* Expanded detail row */}
      {open && (
        <TableRow className="bg-muted/5 hover:bg-muted/5">
          <TableCell colSpan={11} className="p-0">
            <div className="px-6 py-4 ml-6 border-l-2 border-indigo-500/30 space-y-3">
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

              <div className="flex flex-wrap gap-2">
                {!isPieceRate && (
                  <div className="rounded-lg border border-border/30 bg-background/60 px-2.5 py-1 text-[11px] text-muted-foreground">
                    Davomat bo'yicha: <span className="font-medium text-foreground">{fmt(preview.attendanceEarnings)}</span>
                  </div>
                )}
                {isPieceRate && (
                  <div className="rounded-lg border border-border/30 bg-background/60 px-2.5 py-1 text-[11px] text-muted-foreground">
                    Ishbay: <span className="font-medium text-foreground">{fmt(preview.productionEarnings)}</span>
                  </div>
                )}
                {preview.overtimeAmount > 0 && (
                  <div className="rounded-lg border border-border/30 bg-background/60 px-2.5 py-1 text-[11px] text-muted-foreground">
                    Overtime: <span className="font-medium text-foreground">+{fmt(preview.overtimeAmount)}</span>
                  </div>
                )}
                {row.bonus > 0 && (
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-400">
                    Bonus: +{fmt(row.bonus)}
                  </div>
                )}
                {workerPrevBalance > 0 && (
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-400">
                    Oldingi qoldiq: +{fmt(workerPrevBalance)}
                  </div>
                )}
                {workerAdvance > 0 && (
                  <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[11px] text-red-400">
                    Avans: -{fmt(workerAdvance)}
                  </div>
                )}
                {row.deductions > 0 && (
                  <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[11px] text-red-400">
                    Ushlanma: -{fmt(row.deductions)}
                  </div>
                )}
                <div className="rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] text-primary">
                  To'lanadigan: <span className="font-semibold">{fmt(preview.payout)}</span>
                </div>
              </div>

              {preview.warnings.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {preview.warnings.map((warning: string) => (
                    <Badge key={warning} variant="warning" className="text-[10px]">
                      {warning}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

// Read-only expandable row for Ishbay (piece-rate) report
function IshbayRow({
  user,
  workerProd,
  payroll,
  formatCurrency: fmt,
}: any) {
  const [open, setOpen] = useState(false);
  const totalQty = workerProd?.products?.reduce((sum: number, p: any) => sum + (p.qty || 0), 0) || 0;

  return (
    <>
      <TableRow
        className={cn('border-b border-border/20 hover:bg-muted/10 cursor-pointer', open && 'bg-muted/10')}
        onClick={() => setOpen(!open)}
      >
        <TableCell className="sticky left-0 z-10 bg-card/95 border-r border-border/30">
          <div className="flex items-center gap-2">
            <ChevronRight className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform shrink-0', open && 'rotate-90')} />
            <span className="text-xs font-medium text-foreground">{user.fullName}</span>
          </div>
        </TableCell>
        <TableCell className="text-right text-xs text-muted-foreground">
          {totalQty > 0 ? totalQty : '—'}
        </TableCell>
        <TableCell className="text-right text-xs font-semibold text-amber-400">
          {fmt(workerProd?.total || 0)}
        </TableCell>
        <TableCell className="text-right">
          {payroll ? (
            <Badge
              variant={payroll.status === 'PAID' ? 'success' : payroll.status === 'CONFIRMED' ? 'warning' : 'secondary'}
              className="text-[10px] px-1.5 py-0"
            >
              {payroll.status === 'PAID' ? "To'langan" : payroll.status === 'CONFIRMED' ? 'Tasdiqlangan' : 'Qoralama'}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">Hisoblanmagan</Badge>
          )}
        </TableCell>
      </TableRow>

      {open && (
        <TableRow className="bg-muted/5 hover:bg-muted/5">
          <TableCell colSpan={4} className="p-0">
            <div className="px-6 py-4 ml-6 border-l-2 border-indigo-500/30 space-y-3">
              {workerProd && workerProd.products.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {workerProd.products.map((p: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs rounded-lg border border-border/30 px-2.5 py-1.5">
                      <span className="text-foreground font-medium">{p.name}</span>
                      <span className="text-muted-foreground">{p.qty} × {fmt(p.rate)}</span>
                      <span className="text-amber-400 font-medium">= {fmt(p.total)}</span>
                    </div>
                  ))}
                </div>
              ) : (
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
  const [calculateDialogOpen, setCalculateDialogOpen] = useState(false);

  // Inline editing state
  const [editMode, setEditMode] = useState(false);
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [reviewFilter, setReviewFilter] = useState<string>('ALL');

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
  const { data: prodLogsData } = useProductionLogs({
    dateFrom: prodDateFrom,
    dateTo: prodDateTo,
    status: 'APPROVED',
    limit: 99999,
  });

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
    const map: Record<string, {
      present: number;
      absent: number;
      late: number;
      halfDay: number;
      leave: number;
      total: number;
      totalHoursWorked: number;
      totalOvertimeHours: number;
    }> = {};
    for (const rec of allRecords as any[]) {
      const userId = typeof rec.user === 'string' ? rec.user : rec.user?._id;
      if (!userId) continue;
      if (!map[userId]) {
        map[userId] = {
          present: 0,
          absent: 0,
          late: 0,
          halfDay: 0,
          leave: 0,
          total: 0,
          totalHoursWorked: 0,
          totalOvertimeHours: 0,
        };
      }
      map[userId].total++;
      map[userId].totalHoursWorked += rec.hoursWorked || 0;
      map[userId].totalOvertimeHours += rec.overtimeHours || 0;
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

  const previewMap = useMemo(() => {
    const map: Record<string, PayrollPreview> = {};

    for (const row of rows) {
      const workerAtt = attendanceSummary[row.userId];
      const workerProd = prodSummary[row.userId];
      const advances = advanceSummary[row.userId] || 0;
      const previousBalance = prevBalanceMap[row.userId] || 0;
      const isPieceRate = row.salaryType === 'PIECE_RATE';

      let attendanceEarnings = 0;
      let overtimeAmount = 0;
      let productionEarnings = 0;

      if (isPieceRate) {
        productionEarnings = roundAmount(workerProd?.total || 0);
      } else {
        const dailyRate = row.baseSalary > 0 ? row.baseSalary / DEFAULT_WORKING_DAYS : 0;
        const presentDays = workerAtt?.present || 0;
        const lateDays = workerAtt?.late || 0;
        const halfDays = workerAtt?.halfDay || 0;
        const overtimeHours = workerAtt?.totalOvertimeHours || 0;

        attendanceEarnings = roundAmount(
          dailyRate * presentDays +
          dailyRate * 0.5 * lateDays +
          dailyRate * 0.5 * halfDays,
        );

        const overtimeRate = (dailyRate / 8) * 1.5;
        overtimeAmount = roundAmount(overtimeHours * overtimeRate);
      }

      const totalEarned = roundAmount(
        (isPieceRate ? productionEarnings : attendanceEarnings + overtimeAmount) + row.bonus,
      );
      const payout = roundAmount(totalEarned + previousBalance - row.deductions - advances);
      const remainingBalance = roundAmount(
        totalEarned + previousBalance - row.deductions - advances - payout,
      );

      const warnings: string[] = [];
      if (!isPieceRate && !workerAtt?.total) warnings.push("Davomat yo'q");
      if (!isPieceRate && row.baseSalary <= 0) warnings.push("Oylik kiritilmagan");
      if (isPieceRate && !workerProd?.products?.length) warnings.push("Ishlab chiqarish yo'q");
      if (payout < 0) warnings.push('Natija manfiy');

      map[row.userId] = {
        attendanceEarnings,
        overtimeAmount,
        productionEarnings,
        totalEarned,
        payout,
        remainingBalance,
        previousBalance,
        advances,
        warnings,
        hasChanges: (
          row.baseSalary !== row.initialBaseSalary ||
          row.bonus !== row.initialBonus ||
          row.deductions !== row.initialDeductions
        ),
      };
    }

    return map;
  }, [rows, attendanceSummary, prodSummary, advanceSummary, prevBalanceMap]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const preview = previewMap[row.userId];
      if (!preview) return reviewFilter === 'ALL';

      if (reviewFilter === 'ISSUES') return preview.warnings.length > 0;
      if (reviewFilter === 'CHANGED') return preview.hasChanges;
      if (reviewFilter === 'FIXED') return row.salaryType !== 'PIECE_RATE';
      if (reviewFilter === 'PIECE_RATE') return row.salaryType === 'PIECE_RATE';
      if (reviewFilter === 'WITH_ADVANCE') return preview.advances > 0;
      if (reviewFilter === 'WITH_PREV_BALANCE') return preview.previousBalance > 0;

      return true;
    });
  }, [rows, reviewFilter, previewMap]);

  const uncalculableRows = useMemo(() => (
    rows.filter((row) => row.salaryType === 'FIXED' && !(attendanceSummary[row.userId]?.total > 0))
  ), [rows, attendanceSummary]);

  const calculableRows = useMemo(() => {
    const blockedIds = new Set(uncalculableRows.map((row) => row.userId));
    return rows.filter((row) => !blockedIds.has(row.userId));
  }, [rows, uncalculableRows]);

  const summarizeRows = (targetRows: PayrollRow[]) => (
    targetRows.reduce((acc, row) => {
      const preview = previewMap[row.userId];
      if (!preview) return acc;
      acc.count += 1;
      acc.changed += preview.hasChanges ? 1 : 0;
      acc.withWarnings += preview.warnings.length > 0 ? 1 : 0;
      acc.totalEarned += preview.totalEarned;
      acc.totalPayout += preview.payout;
      acc.totalAdvances += preview.advances;
      acc.totalPreviousBalance += preview.previousBalance;
      return acc;
    }, {
      count: 0,
      changed: 0,
      withWarnings: 0,
      totalEarned: 0,
      totalPayout: 0,
      totalAdvances: 0,
      totalPreviousBalance: 0,
    })
  );

  const allRowsSummary = useMemo(() => summarizeRows(rows), [rows, previewMap]);
  const calculableRowsSummary = useMemo(() => summarizeRows(calculableRows), [calculableRows, previewMap]);
  const visibleRowsSummary = useMemo(() => summarizeRows(filteredRows), [filteredRows, previewMap]);
  const hasActiveReviewFilter = reviewFilter !== 'ALL';

  // Stats
  const stats = useMemo(() => {
    const total = users.length;
    const calculated = payrolls.length;
    const confirmed = payrolls.filter((p) => p.status === 'CONFIRMED' || p.status === 'PAID').length;
    const totalPaid = payrolls.reduce((sum, p) => sum + ((p as any).paidAmount || p.netSalary || 0), 0);
    const totalRemaining = payrolls.reduce((sum, p) => sum + ((p as any).remainingBalance || 0), 0);
    return { total, calculated, confirmed, totalPaid, totalRemaining };
  }, [users, payrolls]);

  // Ishbay (piece-rate) worker summary
  const pieceRateUsers = useMemo(
    () => users.filter((u: any) => u.salaryType === 'PIECE_RATE'),
    [users],
  );

  const payrollByUser = useMemo(() => {
    const map: Record<string, any> = {};
    for (const p of payrolls as any[]) {
      const userId = typeof p.user === 'string' ? p.user : p.user?._id;
      if (userId) map[userId] = p;
    }
    return map;
  }, [payrolls]);

  const ishbayStats = useMemo(() => {
    let totalQty = 0;
    let totalAmount = 0;
    let calculated = 0;
    for (const u of pieceRateUsers as any[]) {
      const prod = prodSummary[u._id];
      if (prod) {
        totalAmount += prod.total;
        totalQty += prod.products.reduce((sum: number, p: any) => sum + (p.qty || 0), 0);
      }
      if (payrollByUser[u._id]) calculated++;
    }
    return { workerCount: pieceRateUsers.length, totalQty, totalAmount, calculated };
  }, [pieceRateUsers, prodSummary, payrollByUser]);

  // Month nav
  const goToPrevMonth = useCallback(() => {
    if (selectedMonth === 1) { setSelectedMonth(12); setSelectedYear((y) => y - 1); }
    else setSelectedMonth((m) => m - 1);
    setEditMode(false);
    setCalculateDialogOpen(false);
  }, [selectedMonth]);

  const goToNextMonth = useCallback(() => {
    if (selectedMonth === 12) { setSelectedMonth(1); setSelectedYear((y) => y + 1); }
    else setSelectedMonth((m) => m + 1);
    setEditMode(false);
    setCalculateDialogOpen(false);
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
        initialBaseSalary: u.baseSalary || (existing ? (existing as any).baseSalary || 0 : 0),
        initialBonus: existing ? (existing as any).bonus || 0 : 0,
        initialDeductions: existing ? (existing as any).deductions || 0 : 0,
        existingPayroll: existing || null,
      };
    });
    setRows(newRows);
    setReviewFilter('ALL');
    setCalculateDialogOpen(false);
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
    if (calculableRows.length === 0) {
      toast({
        title: 'Hisoblash uchun tayyor xodim topilmadi',
        description: "Fixed xodimlar uchun avval davomatni saqlang.",
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await bulkCalculate.mutateAsync({
        year: selectedYear,
        month: selectedMonth,
        items: calculableRows.map((row) => ({
          user: row.userId,
          baseSalary: row.baseSalary,
          bonus: row.bonus,
          deductions: row.deductions,
        })),
      });

      const skippedMap = new Map<string, BulkCalculatePayrollSkippedItem>();
      for (const row of uncalculableRows) {
        skippedMap.set(row.userId, {
          user: row.userId,
          fullName: row.fullName,
          reason: "Davomat kiritilmagan",
        });
      }
      for (const item of result.skipped || []) {
        skippedMap.set(item.user, item);
      }

      const skippedItems = Array.from(skippedMap.values());
      const skippedNames = skippedItems
        .map((item) => item.fullName || item.user)
        .filter((name): name is string => Boolean(name));
      const processedCount = result.processed?.length || 0;

      if (processedCount === 0) {
        toast({
          title: 'Hech bir xodim hisoblanmadi',
          description: skippedItems[0]?.reason || "Tayyor xodim topilmadi.",
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: skippedItems.length > 0 ? 'Tayyor xodimlar hisoblandi' : 'Barcha oyliklar hisoblandi',
        description: skippedItems.length > 0
          ? `${processedCount} ta xodim hisoblandi. ${skippedItems.length} ta xodim o'tkazib yuborildi: ${skippedNames.slice(0, 3).join(', ')}${skippedNames.length > 3 ? '...' : ''}`
          : undefined,
        variant: 'success',
      });
      setCalculateDialogOpen(false);
      if (skippedItems.length === 0) {
        setEditMode(false);
      }
    } catch (error: any) {
      toast({
        title: 'Xatolik yuz berdi',
        description: error?.response?.data?.message || 'Payroll hisoblashda xatolik yuz berdi',
        variant: 'destructive',
      });
    }
  }, [bulkCalculate, selectedYear, selectedMonth, calculableRows, uncalculableRows]);

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

  const getWorkBasedPayrollAmount = (payroll: any) => (
    payroll.salaryType === 'PIECE_RATE'
      ? payroll.productionEarnings || 0
      : Math.max((payroll.totalEarned || 0) - (payroll.overtimeAmount || 0) - (payroll.bonus || 0), 0)
  );

  const getFinalPayrollAmount = (payroll: any) => payroll.paidAmount || payroll.netSalary || 0;

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
          <TabsTrigger value="ishbay">Ishbay</TabsTrigger>
          <TabsTrigger value="payroll">Oylik hisoblash</TabsTrigger>
          <TabsTrigger value="advances">Avanslar</TabsTrigger>
        </TabsList>

        {/* TAB 0: Ishbay (piece-rate report) */}
        <TabsContent value="ishbay" className="space-y-5">
          {!isLoading && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard title="Ishbay xodimlar" value={ishbayStats.workerCount} icon={Users} iconColor="text-indigo-400" iconBg="bg-indigo-500/20" index={0} />
              <StatCard title="Jami ishlab chiqarilgan" value={ishbayStats.totalQty} icon={Package} iconColor="text-blue-400" iconBg="bg-blue-500/20" index={1} />
              <StatCard title="Jami ishbay summa" value={formatCurrency(ishbayStats.totalAmount)} icon={Banknote} iconColor="text-amber-400" iconBg="bg-amber-500/20" index={2} />
              <StatCard title="Hisoblangan" value={ishbayStats.calculated} icon={CheckCircle2} iconColor="text-green-400" iconBg="bg-green-500/20" index={3} />
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-20"><LoadingSpinner size="lg" /></div>
          ) : pieceRateUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Package className="h-10 w-10 text-muted-foreground mb-3" />
              <h3 className="text-lg font-semibold">Ishbay xodimlar topilmadi</h3>
              <p className="text-sm text-muted-foreground mt-1">Ishbay turidagi xodimlar mavjud emas</p>
            </div>
          ) : (
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
                      <TableHead className="min-w-[90px] text-right">Jami miqdor</TableHead>
                      <TableHead className="min-w-[110px] text-right">Jami summa</TableHead>
                      <TableHead className="min-w-[110px] text-right">Holat</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pieceRateUsers.map((u: any) => (
                      <IshbayRow
                        key={u._id}
                        user={u}
                        workerProd={prodSummary[u._id]}
                        payroll={payrollByUser[u._id]}
                        formatCurrency={formatCurrency}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </motion.div>
          )}
        </TabsContent>

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
            <div className={cn('flex items-center justify-between gap-3', editMode && 'block')}>
              {!editMode ? (
                <Button onClick={enterEditMode} className="gap-1.5 rounded-xl h-9" size="sm">
                  <Calculator className="h-3.5 w-3.5" />
                  Oylik hisoblash
                </Button>
              ) : (
                <div className="sticky top-4 z-20 space-y-3 rounded-2xl border border-border/50 bg-card/85 p-3 backdrop-blur-2xl">
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
                    <div className="rounded-xl border border-border/40 bg-background/70 px-3 py-2.5">
                      <p className="text-[11px] text-muted-foreground">Ko'rinayotgan</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {visibleRowsSummary.count} / {rows.length}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/40 bg-background/70 px-3 py-2.5">
                      <p className="text-[11px] text-muted-foreground">O'zgargan</p>
                      <p className="mt-1 text-sm font-semibold text-blue-400">{visibleRowsSummary.changed}</p>
                    </div>
                    <div className="rounded-xl border border-border/40 bg-background/70 px-3 py-2.5">
                      <p className="text-[11px] text-muted-foreground">Ogohlantirish</p>
                      <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-amber-400">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {visibleRowsSummary.withWarnings}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/40 bg-background/70 px-3 py-2.5">
                      <p className="text-[11px] text-muted-foreground">Jami hisoblangan</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {formatCurrency(visibleRowsSummary.totalEarned)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/40 bg-background/70 px-3 py-2.5">
                      <p className="text-[11px] text-muted-foreground">Jami to'lanadigan</p>
                      <p className="mt-1 text-sm font-semibold text-emerald-400">
                        {formatCurrency(visibleRowsSummary.totalPayout)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-background/70 px-3 py-2">
                        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Ko'rish</span>
                        <Select value={reviewFilter} onValueChange={setReviewFilter}>
                          <SelectTrigger className="h-8 w-[180px] rounded-lg border-0 bg-transparent px-0 shadow-none focus:ring-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ALL">Hammasi</SelectItem>
                            <SelectItem value="ISSUES">Muammolilar</SelectItem>
                            <SelectItem value="CHANGED">O'zgarganlar</SelectItem>
                            <SelectItem value="FIXED">Faqat oylikchilar</SelectItem>
                            <SelectItem value="PIECE_RATE">Faqat ishbaychilar</SelectItem>
                            <SelectItem value="WITH_ADVANCE">Avansi borlar</SelectItem>
                            <SelectItem value="WITH_PREV_BALANCE">Oldingi qoldiq borlar</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {hasActiveReviewFilter && (
                        <Badge variant="secondary" className="text-[11px]">
                          Filter: {filteredRows.length} ta satr
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        onClick={() => setCalculateDialogOpen(true)}
                        disabled={bulkCalculate.isPending || rows.length === 0}
                        className="gap-1.5 rounded-xl h-9"
                        size="sm"
                      >
                        {bulkCalculate.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        Barchasini hisoblash
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl h-9"
                        onClick={() => {
                          setCalculateDialogOpen(false);
                          setEditMode(false);
                        }}
                      >
                        Bekor qilish
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>Avans: {formatCurrency(visibleRowsSummary.totalAdvances)}</span>
                    <span>Oldingi qoldiq: {formatCurrency(visibleRowsSummary.totalPreviousBalance)}</span>
                    <span>Hisoblanadi: {calculableRows.length} ta</span>
                    {uncalculableRows.length > 0 && (
                      <span className="text-amber-400">Davomati yo'q, skip: {uncalculableRows.length} ta</span>
                    )}
                  </div>
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
                      <TableHead className="min-w-[80px] text-right">Oldingi</TableHead>
                      <TableHead className="min-w-[90px]">Bonus</TableHead>
                      <TableHead className="min-w-[90px]">Ushlanma</TableHead>
                      <TableHead className="min-w-[110px] text-right">Hisoblangan</TableHead>
                      <TableHead className="min-w-[110px] text-right">To'lanadigan</TableHead>
                      <TableHead className="min-w-[120px] text-right">Holat</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="py-12 text-center text-sm text-muted-foreground">
                          Tanlangan filter bo'yicha satr topilmadi.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRows.map((row) => (
                        <PayrollEditRow
                          key={row.userId}
                          row={row}
                          index={rows.findIndex((item) => item.userId === row.userId)}
                          isPieceRate={row.salaryType === 'PIECE_RATE'}
                          workerProd={row.salaryType === 'PIECE_RATE' ? prodSummary[row.userId] : null}
                          workerAtt={attendanceSummary[row.userId]}
                          workerAdvance={advanceSummary[row.userId] || 0}
                          workerPrevBalance={prevBalanceMap[row.userId] || 0}
                          preview={previewMap[row.userId]}
                          updateRow={updateRow}
                          formatCurrency={formatCurrency}
                        />
                      ))
                    )}
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
                      <TableHead className="min-w-[110px] text-center">Davomat</TableHead>
                      <TableHead className="min-w-[70px] text-right">Bonus</TableHead>
                      <TableHead className="min-w-[70px] text-right">Ushlan.</TableHead>
                      <TableHead className="min-w-[70px] text-right">Avans</TableHead>
                      <TableHead className="min-w-[80px] text-right">Oldingi</TableHead>
                      <TableHead className="min-w-[140px] text-right font-bold">Oldin - yakun</TableHead>
                      <TableHead className="min-w-[80px] text-right">Qoldiq</TableHead>
                      <TableHead className="min-w-[70px] text-center">Holat</TableHead>
                      <TableHead className="w-[70px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrolls.map((payroll: any) => {
                      const isPieceRate = payroll.salaryType === 'PIECE_RATE';
                      const remaining = payroll.remainingBalance || 0;
                      const payrollUserId = typeof payroll.user === 'string' ? payroll.user : payroll.user?._id;
                      const liveAttendance = payrollUserId ? attendanceSummary[payrollUserId] : undefined;
                      const attendedDays = liveAttendance
                        ? (liveAttendance.present || 0) + (liveAttendance.late || 0) + (liveAttendance.halfDay || 0)
                        : (payroll.presentDays || 0) + (payroll.lateDays || 0);
                      const absentDays = liveAttendance ? (liveAttendance.absent || 0) : (payroll.absentDays || 0);
                      const lateDays = liveAttendance ? (liveAttendance.late || 0) : (payroll.lateDays || 0);
                      const halfDays = liveAttendance ? (liveAttendance.halfDay || 0) : 0;
                      const workBasedAmount = getWorkBasedPayrollAmount(payroll);
                      const calculatedAmount = payroll.totalEarned || 0;
                      const finalAmount = getFinalPayrollAmount(payroll);
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
                            {!isPieceRate && (
                              <p className="text-[10px] text-muted-foreground">
                                Kelgan: {attendedDays}/{payroll.workingDays || 0} kun
                              </p>
                            )}
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
                          <TableCell className="text-center">
                            {isPieceRate ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <div className="space-y-0.5">
                                <p className="font-medium text-foreground">
                                  {attendedDays}/{payroll.workingDays || 0} kun
                                </p>
                                {halfDays > 0 && (
                                  <p className="text-[10px] text-blue-400">
                                    Yarim kun: {halfDays}
                                  </p>
                                )}
                                {absentDays > 0 && (
                                  <p className="text-[10px] text-red-400">
                                    Kelmadi: {absentDays} kun
                                  </p>
                                )}
                                {lateDays > 0 && (
                                  <p className="text-[10px] text-amber-400">
                                    Kechikdi: {lateDays} kun
                                  </p>
                                )}
                              </div>
                            )}
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
                          <TableCell className="text-right">
                            <div className="space-y-0.5">
                              <p className="text-[10px] text-muted-foreground">
                                {isPieceRate
                                  ? `Ishbay: ${formatCurrency(workBasedAmount)}`
                                  : `Davomat: ${formatCurrency(workBasedAmount)}`}
                              </p>
                              {!isPieceRate && (
                                <p className="text-[10px] text-muted-foreground/80">
                                  {payroll.presentDays || 0}/{payroll.workingDays || 0} kun
                                </p>
                              )}
                              <p className="text-[10px] text-blue-400">
                                Hisob: {formatCurrency(calculatedAmount)}
                              </p>
                              <p className="font-bold text-foreground">
                                {formatCurrency(finalAmount)}
                              </p>
                            </div>
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

      <Dialog open={calculateDialogOpen} onOpenChange={setCalculateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Oylik hisoblashni tasdiqlang</DialogTitle>
            <DialogDescription>
              {MONTH_NAMES[selectedMonth - 1]} {selectedYear} uchun oyliklar yangilanadi va qoralama holatda saqlanadi.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border/40 bg-muted/20 px-3 py-2.5">
              <p className="text-xs text-muted-foreground">Jami xodimlar</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{allRowsSummary.count}</p>
            </div>
            <div className="rounded-xl border border-border/40 bg-muted/20 px-3 py-2.5">
              <p className="text-xs text-muted-foreground">Hisoblanadi</p>
              <p className="mt-1 text-sm font-semibold text-emerald-400">{calculableRows.length}</p>
            </div>
            <div className="rounded-xl border border-border/40 bg-muted/20 px-3 py-2.5">
              <p className="text-xs text-muted-foreground">Jami hisoblangan</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{formatCurrency(calculableRowsSummary.totalEarned)}</p>
            </div>
            <div className="rounded-xl border border-border/40 bg-muted/20 px-3 py-2.5">
              <p className="text-xs text-muted-foreground">Jami to'lanadigan</p>
              <p className="mt-1 text-sm font-semibold text-emerald-400">{formatCurrency(calculableRowsSummary.totalPayout)}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="secondary">Avans: {formatCurrency(calculableRowsSummary.totalAdvances)}</Badge>
            <Badge variant="secondary">Oldingi qoldiq: {formatCurrency(calculableRowsSummary.totalPreviousBalance)}</Badge>
            {uncalculableRows.length > 0 && (
              <Badge variant="warning">Skip: {uncalculableRows.length} ta</Badge>
            )}
          </div>

          {uncalculableRows.length > 0 && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-400">
              {uncalculableRows.length} ta fixed xodimda davomat yo'q, shuning uchun ular hozircha hisoblanmaydi.
              <p className="mt-1 text-xs text-amber-300">
                {uncalculableRows.slice(0, 4).map((row) => row.fullName).join(', ')}
                {uncalculableRows.length > 4 ? '...' : ''}
              </p>
            </div>
          )}

          {hasActiveReviewFilter && (
            <p className="text-xs text-muted-foreground">
              Hozir jadvalda filter yoqilgan, lekin hisoblash tayyor bo'lgan barcha {calculableRows.length} xodim bo'yicha amalga oshiriladi.
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCalculateDialogOpen(false)}
              className="rounded-xl"
              disabled={bulkCalculate.isPending}
            >
              Bekor qilish
            </Button>
            <Button
              type="button"
              onClick={handleCalculateAll}
              className="gap-1.5 rounded-xl"
              disabled={bulkCalculate.isPending}
            >
              {bulkCalculate.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Hisoblashni tasdiqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
