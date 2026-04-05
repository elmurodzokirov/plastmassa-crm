import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { ArrowLeft, Printer, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { usePayrollSlip } from '@/hooks/use-payroll';
import { useProductionLogsEnabled } from '@/hooks/use-production';

import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

const COMPANY_NAME = 'SAIDBARAKA MChJ';
const COMPANY_SUBTITLE = 'Oylik maosh varaqasi';
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

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Qoralama',
  CONFIRMED: 'Tasdiqlangan',
  PAID: "To'langan",
};

const SALARY_TYPE_LABELS: Record<string, string> = {
  FIXED: 'Oylik',
  PIECE_RATE: 'Ishbay',
};

export default function PayrollSlipPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: payroll, isLoading, isError } = usePayrollSlip(id || '');

  const pieceRateLogParams = useMemo(() => {
    if (!payroll || payroll.salaryType !== 'PIECE_RATE') return undefined;

    const workerId = typeof payroll.user === 'string' ? payroll.user : payroll.user?._id;
    if (!workerId) return undefined;

    const daysInMonth = new Date(payroll.year, payroll.month, 0).getDate();

    return {
      worker: workerId,
      status: 'APPROVED',
      dateFrom: `${payroll.year}-${String(payroll.month).padStart(2, '0')}-01`,
      dateTo: `${payroll.year}-${String(payroll.month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`,
      sortBy: 'date',
      sortOrder: 'asc' as const,
      limit: 999,
    };
  }, [payroll]);

  const {
    data: pieceRateLogsData,
    isLoading: pieceRateLogsLoading,
  } = useProductionLogsEnabled(pieceRateLogParams, Boolean(pieceRateLogParams));

  const handlePrint = () => {
    window.print();
  };

  const getUserName = (user: any): string => {
    if (!user) return '-';
    if (typeof user === 'string') return user;
    return user.fullName || '-';
  };

  const getUserRole = (user: any): string => {
    if (!user || typeof user === 'string') return '-';
    return (typeof user.role === 'object' ? user.role?.name : user.role) || '-';
  };

  const getUserPhone = (user: any): string => {
    if (!user || typeof user === 'string') return '-';
    return user.phone || '-';
  };

  const getActorName = (user: any): string => {
    if (!user) return '-';
    if (typeof user === 'string') return user;
    return user.fullName || user.username || '-';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isError || !payroll) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 mb-4">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">
          Oylik hisob-kitob topilmadi
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          So'ralgan oylik ma'lumotlari mavjud emas
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate('/payroll')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Oylik maoshga qaytish
        </Button>
      </div>
    );
  }

  const monthName = MONTH_NAMES[(payroll.month || 1) - 1] || '';
  const periodLabel = `${payroll.year}-yil, ${monthName}`;
  const salaryTypeLabel = SALARY_TYPE_LABELS[payroll.salaryType] || payroll.salaryType || '-';
  const statusLabel = STATUS_LABELS[payroll.status] || payroll.status || '-';
  const calculatedAt = payroll.updatedAt || payroll.createdAt;
  const printDate = format(new Date(), 'dd.MM.yyyy HH:mm');
  const earningsLabel = payroll.salaryType === 'PIECE_RATE' ? 'Ishbay daromad' : "Davomat bo'yicha maosh";
  const workBasedAmount = payroll.salaryType === 'PIECE_RATE'
    ? payroll.productionEarnings || 0
    : Math.max((payroll.totalEarned || 0) - (payroll.overtimeAmount || 0) - (payroll.bonus || 0), 0);
  const calculatedAmount = payroll.totalEarned || 0;
  const finalAmount = payroll.paidAmount || payroll.netSalary || 0;
  const deltaAmount = finalAmount - workBasedAmount;
  const dailyRate = payroll.workingDays > 0 ? Math.round((payroll.baseSalary || 0) / payroll.workingDays) : 0;
  const workBasedLabel = payroll.salaryType === 'PIECE_RATE' ? "Ishbay bo'yicha" : "Davomat bo'yicha";
  const pieceRateLogs = pieceRateLogsData?.items || [];
  const attendanceSummary = payroll.liveAttendanceSummary;
  const attendedDays = attendanceSummary
    ? (attendanceSummary.presentDays || 0) + (attendanceSummary.lateDays || 0) + (attendanceSummary.halfDays || 0)
    : (payroll.presentDays || 0) + (payroll.lateDays || 0);
  const absentDays = attendanceSummary?.absentDays ?? payroll.absentDays ?? 0;
  const lateDays = attendanceSummary?.lateDays ?? payroll.lateDays ?? 0;
  const halfDays = attendanceSummary?.halfDays ?? 0;
  const totalHoursWorked = attendanceSummary?.totalHoursWorked ?? payroll.totalHoursWorked ?? 0;
  const overtimeHours = attendanceSummary?.totalOvertimeHours ?? payroll.overtimeHours ?? 0;
  const pieceRateSummary = pieceRateLogs.reduce((acc, log) => {
    acc.totalQuantity += log.quantityProduced || 0;
    acc.totalAmount += log.pieceRateAmount || log.earnedAmount || 0;
    return acc;
  }, { totalQuantity: 0, totalAmount: 0 });

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }

          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .no-print {
            display: none !important;
          }

          .print-area {
            max-width: none !important;
            margin: 0 !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            padding: 0 !important;
          }

          .print-area * {
            color: black !important;
            border-color: #d1d5db !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      <div className="no-print space-y-4 mb-6">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between"
        >
          <Button
            variant="ghost"
            onClick={() => navigate('/payroll')}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Oylik maoshga qaytish
          </Button>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Chop etish
          </Button>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="print-area max-w-4xl mx-auto bg-white text-black rounded-2xl border border-border/50 p-8 space-y-6"
      >
        <div className="flex items-start justify-between gap-6 border-b border-gray-300 pb-5">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Payroll Slip</p>
            <h1 className="mt-2 text-2xl font-bold tracking-wide text-black">{COMPANY_NAME}</h1>
            <p className="mt-1 text-sm text-gray-500">{COMPANY_SUBTITLE}</p>
          </div>
          <div className="text-right space-y-1">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Holat</p>
            <p className="text-lg font-semibold text-black">{statusLabel}</p>
            <p className="text-sm text-gray-500">{periodLabel}</p>
            <p className="text-xs text-gray-500">
              Chop etilgan: {printDate}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-xs text-gray-500">Xodim</p>
            <p className="mt-1 text-sm font-semibold text-black">{getUserName(payroll.user)}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-xs text-gray-500">Lavozim</p>
            <p className="mt-1 text-sm font-semibold text-black">{getUserRole(payroll.user)}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-xs text-gray-500">Ish haqi turi</p>
            <p className="mt-1 text-sm font-semibold text-black">{salaryTypeLabel}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-xs text-gray-500">Hisoblagan</p>
            <p className="mt-1 text-sm font-semibold text-black">{getActorName(payroll.calculatedBy)}</p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">{workBasedLabel}</p>
            <p className="mt-2 text-2xl font-bold text-black">{formatCurrency(workBasedAmount)}</p>
            <p className="mt-1 text-xs text-gray-500">
              {payroll.salaryType === 'PIECE_RATE'
                ? "Ishbay yozuvlari bo'yicha yig'ilgan summa"
                : `${attendedDays}/${payroll.workingDays || 0} kun bo'yicha avtomatik hisoblangan`}
            </p>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-blue-600">Hisoblangan</p>
            <p className="mt-2 text-2xl font-bold text-black">{formatCurrency(calculatedAmount)}</p>
            <p className="mt-1 text-xs text-blue-700">
              Bonus va hisob-kitobdan keyingi jami summa
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-600">Yakuniy</p>
            <p className="mt-2 text-2xl font-bold text-black">{formatCurrency(finalAmount)}</p>
            <p className="mt-1 text-xs text-emerald-700">
              Xodimga chiqadigan yakuniy summa
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-dashed border-gray-300 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Oldin - keyin</p>
              <p className="mt-1 text-sm text-gray-600">
                {formatCurrency(workBasedAmount)} {'->'} {formatCurrency(calculatedAmount)} {'->'} {formatCurrency(finalAmount)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Umumiy o'zgarish</p>
              <p className={`mt-1 text-lg font-semibold ${deltaAmount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {deltaAmount >= 0 ? '+' : ''}{formatCurrency(deltaAmount)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-600">
                Xodim ma'lumotlari
              </h2>
              <p className="text-xs text-gray-500">
                Hisoblangan sana: {calculatedAt ? format(new Date(calculatedAt), 'dd.MM.yyyy HH:mm') : '-'}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <div className="rounded-xl bg-gray-50 px-4 py-3">
                <p className="text-xs text-gray-500">Telefon</p>
                <p className="mt-1 font-medium text-black">{getUserPhone(payroll.user)}</p>
              </div>
              <div className="rounded-xl bg-gray-50 px-4 py-3">
                <p className="text-xs text-gray-500">Davr</p>
                <p className="mt-1 font-medium text-black">{periodLabel}</p>
              </div>
              <div className="rounded-xl bg-gray-50 px-4 py-3">
                <p className="text-xs text-gray-500">To'lanadigan summa</p>
                <p className="mt-1 font-semibold text-black">{formatCurrency(payroll.paidAmount || payroll.netSalary)}</p>
              </div>
              <div className="rounded-xl bg-gray-50 px-4 py-3">
                <p className="text-xs text-gray-500">Qolgan balans</p>
                <p className="mt-1 font-semibold text-black">{formatCurrency(payroll.remainingBalance || 0)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-600 mb-4">
              Qisqa xulosa
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Jami hisoblangan</span>
                <span className="font-semibold text-black">{formatCurrency(payroll.totalEarned || 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">{workBasedLabel}</span>
                <span className="font-medium text-black">{formatCurrency(workBasedAmount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Avans</span>
                <span className="font-medium text-red-600">-{formatCurrency(payroll.advancesTotal || 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Ushlanma</span>
                <span className="font-medium text-red-600">-{formatCurrency(payroll.deductions || 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Oldingi qoldiq</span>
                <span className="font-medium text-black">{formatCurrency(payroll.previousBalance || 0)}</span>
              </div>
              <div className="border-t border-dashed border-gray-300 pt-3 flex items-center justify-between">
                <span className="text-base font-semibold text-black">Natija</span>
                <span className="text-xl font-bold text-black">{formatCurrency(finalAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-600 mb-4">
              Ish ko'rsatkichi
            </h2>
            {payroll.salaryType === 'PIECE_RATE' ? (
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="py-2 text-gray-600">Ish haqi turi</td>
                    <td className="py-2 text-right font-medium text-black">{salaryTypeLabel}</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-2 text-gray-600">Ishbay daromad</td>
                    <td className="py-2 text-right font-medium text-black">{formatCurrency(payroll.productionEarnings || 0)}</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-2 text-gray-600">Jami ishlagan soat</td>
                    <td className="py-2 text-right font-medium text-black">{totalHoursWorked} soat</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-gray-600">Ortiqcha ish soati</td>
                    <td className="py-2 text-right font-medium text-black">{overtimeHours} soat</td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="py-2 text-gray-600">Ish kunlari</td>
                    <td className="py-2 text-right font-medium text-black">{payroll.workingDays || 0} kun</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-2 text-gray-600">Kelgan kunlar</td>
                    <td className="py-2 text-right font-medium text-black">{attendedDays} kun</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-2 text-gray-600">To'liq kelgan kunlar</td>
                    <td className="py-2 text-right font-medium text-black">{attendanceSummary?.presentDays ?? payroll.presentDays ?? 0} kun</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-2 text-gray-600">Kechikkan kunlar</td>
                    <td className="py-2 text-right font-medium text-black">{lateDays} kun</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-2 text-gray-600">Yarim kunlar</td>
                    <td className="py-2 text-right font-medium text-black">{halfDays} kun</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-2 text-gray-600">1 kunlik stavka</td>
                    <td className="py-2 text-right font-medium text-black">{formatCurrency(dailyRate)}</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-2 text-gray-600">Davomat bo'yicha hisoblangan</td>
                    <td className="py-2 text-right font-semibold text-black">{formatCurrency(workBasedAmount)}</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-2 text-gray-600">Kelmagan kunlar</td>
                    <td className="py-2 text-right font-medium text-black">{absentDays} kun</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-2 text-gray-600">Kechikkan kunlar</td>
                    <td className="py-2 text-right font-medium text-black">{lateDays} kun</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-2 text-gray-600">Jami ishlagan soat</td>
                    <td className="py-2 text-right font-medium text-black">{totalHoursWorked} soat</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-gray-600">Ortiqcha ish soati</td>
                    <td className="py-2 text-right font-medium text-black">{overtimeHours} soat</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-600 mb-4">
              Hisob-kitob tafsiloti
            </h2>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="py-2 text-gray-600">{earningsLabel}</td>
                  <td className="py-2 text-right font-medium text-black">
                    {formatCurrency(workBasedAmount)}
                  </td>
                </tr>
                {payroll.salaryType === 'FIXED' && (
                  <tr className="border-b border-gray-200">
                    <td className="py-2 text-gray-600">Overtime haqi</td>
                    <td className="py-2 text-right font-medium text-black">{formatCurrency(payroll.overtimeAmount || 0)}</td>
                  </tr>
                )}
                <tr className="border-b border-gray-200">
                  <td className="py-2 text-gray-600">Bonus</td>
                  <td className="py-2 text-right font-medium text-black">+{formatCurrency(payroll.bonus || 0)}</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-2 text-gray-600">Oldingi qoldiq</td>
                  <td className="py-2 text-right font-medium text-black">+{formatCurrency(payroll.previousBalance || 0)}</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-2 text-gray-600">Jami hisoblangan</td>
                  <td className="py-2 text-right font-semibold text-black">{formatCurrency(payroll.totalEarned || 0)}</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-2 text-gray-600">Ushlanma</td>
                  <td className="py-2 text-right font-medium text-red-600">-{formatCurrency(payroll.deductions || 0)}</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-2 text-gray-600">Avans</td>
                  <td className="py-2 text-right font-medium text-red-600">-{formatCurrency(payroll.advancesTotal || 0)}</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-2 text-gray-600">To'lanadigan</td>
                  <td className="py-2 text-right font-semibold text-black">{formatCurrency(payroll.paidAmount || payroll.netSalary || 0)}</td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-600">Qolgan balans</td>
                  <td className="py-2 text-right font-semibold text-black">{formatCurrency(payroll.remainingBalance || 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {payroll.salaryType === 'PIECE_RATE' && (
          <div className="rounded-2xl border border-gray-200 p-5">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-600">
                  Ishbay ishlab chiqarish tafsiloti
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                  Slip ichida xodim shu oyda nima chiqargani, qachon chiqargani va har bir yozuv bo'yicha qancha ish haqi tushgani ko'rsatiladi.
                </p>
              </div>
              <div className="text-right text-sm">
                <p className="text-gray-500">Jami miqdor</p>
                <p className="font-semibold text-black">
                  {pieceRateSummary.totalQuantity} {pieceRateLogs[0]?.unitName || 'dona'}
                </p>
                <p className="mt-2 text-gray-500">Jami ishbay</p>
                <p className="font-semibold text-black">{formatCurrency(pieceRateSummary.totalAmount)}</p>
              </div>
            </div>

            {pieceRateLogsLoading ? (
              <div className="flex items-center justify-center py-10">
                <LoadingSpinner size="sm" />
              </div>
            ) : pieceRateLogs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
                Bu davr uchun tasdiqlangan ishlab chiqarish yozuvlari topilmadi.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="border-b border-gray-200">
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Sana</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Mahsulot</th>
                      <th className="px-3 py-2.5 text-right font-semibold text-gray-600">Miqdor</th>
                      <th className="px-3 py-2.5 text-right font-semibold text-gray-600">1 dona narx</th>
                      <th className="px-3 py-2.5 text-right font-semibold text-gray-600">Jami ishbay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pieceRateLogs.map((log) => {
                      const amount = log.pieceRateAmount || log.earnedAmount || 0;
                      const ratePerUnit = log.quantityProduced > 0 ? Math.round(amount / log.quantityProduced) : 0;

                      return (
                        <tr key={log._id} className="border-b border-gray-200 last:border-b-0">
                          <td className="px-3 py-2.5 text-gray-600">{format(new Date(log.date), 'dd.MM.yyyy')}</td>
                          <td className="px-3 py-2.5 font-medium text-black">
                            {log.productName}
                            {log.notes && (
                              <p className="mt-0.5 text-xs font-normal text-gray-500">{log.notes}</p>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right text-black">
                            {log.quantityProduced} {log.unitName}
                          </td>
                          <td className="px-3 py-2.5 text-right text-gray-600">{formatCurrency(ratePerUnit)}</td>
                          <td className="px-3 py-2.5 text-right font-semibold text-black">{formatCurrency(amount)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {payroll.notes && (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Izoh</p>
            <p className="mt-2 text-sm text-black">{payroll.notes}</p>
          </div>
        )}

        <div className="rounded-2xl border border-dashed border-gray-300 p-5">
          <div className="flex items-end justify-between gap-8">
            <div className="flex-1 text-center">
              <div className="border-b border-gray-400 pb-8" />
              <p className="mt-2 text-xs text-gray-500">Hisobchi imzosi</p>
            </div>
            <div className="flex-1 text-center">
              <div className="border-b border-gray-400 pb-8" />
              <p className="mt-2 text-xs text-gray-500">Xodim imzosi</p>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
