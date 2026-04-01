import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Printer } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { usePayrollSlip } from '@/hooks/use-payroll';
import { Button } from '@/components/ui/button';
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

// ── Component ─────────────────────────────────────────────────────────

export default function PayrollSlipPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: payroll, isLoading } = usePayrollSlip(id || '');

  const handlePrint = () => {
    window.print();
  };

  const getUserName = (user: any) => {
    if (!user) return '—';
    if (typeof user === 'string') return user;
    return user.fullName || '—';
  };

  const getUserRole = (user: any) => {
    if (!user) return '—';
    if (typeof user === 'string') return '—';
    return (typeof user.role === 'object' ? user.role?.name : user.role) || '—';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!payroll) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h2 className="text-lg font-semibold text-foreground">Ma'lumot topilmadi</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Oylik maosh varaqasi topilmadi
        </p>
        <Button
          variant="outline"
          onClick={() => navigate('/payroll')}
          className="mt-4 gap-2 rounded-xl"
        >
          <ArrowLeft className="h-4 w-4" />
          Orqaga
        </Button>
      </div>
    );
  }

  const totalCalculated =
    (payroll.baseSalary || 0) + (payroll.overtimeAmount || 0) + (payroll.bonus || 0);
  const totalDeductions = (payroll.deductions || 0) + (payroll.advancesTotal || 0);

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #payroll-slip,
          #payroll-slip * {
            visibility: visible;
          }
          #payroll-slip {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            padding: 2rem;
          }
          .no-print {
            display: none !important;
          }
          #payroll-slip .print-border {
            border-color: #333 !important;
          }
          #payroll-slip .print-text {
            color: #000 !important;
          }
          #payroll-slip .print-muted {
            color: #555 !important;
          }
          #payroll-slip .print-bg {
            background-color: #f5f5f5 !important;
          }
        }
      `}</style>

      {/* Action buttons - hidden in print */}
      <div className="no-print mb-6 flex items-center gap-3">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Button
            variant="outline"
            onClick={() => navigate('/payroll')}
            className="gap-2 rounded-xl"
          >
            <ArrowLeft className="h-4 w-4" />
            Orqaga
          </Button>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          <Button onClick={handlePrint} className="gap-2 rounded-xl">
            <Printer className="h-4 w-4" />
            Chop etish
          </Button>
        </motion.div>
      </div>

      {/* Slip content */}
      <motion.div
        id="payroll-slip"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-8 max-w-2xl mx-auto"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground print-text tracking-wider">
            SAIDBARAKA
          </h1>
          <div className="mt-1 h-0.5 w-20 bg-indigo-500 mx-auto print-border" />
          <h2 className="mt-4 text-lg font-semibold text-foreground print-text">
            OYLIK MAOSH VARAQASI
          </h2>
          <p className="mt-1 text-sm text-muted-foreground print-muted">
            {payroll.year}-yil, {MONTH_NAMES[(payroll.month || 1) - 1]}
          </p>
        </div>

        {/* Employee Info */}
        <div className="border border-border/50 rounded-xl p-4 mb-6 print-border">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground print-muted">Xodim</p>
              <p className="text-sm font-semibold text-foreground print-text">
                {getUserName(payroll.user)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground print-muted">Lavozim</p>
              <p className="text-sm font-semibold text-foreground print-text">
                {getUserRole(payroll.user)}
              </p>
            </div>
          </div>
        </div>

        {/* Attendance Section */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-foreground print-text mb-3 uppercase tracking-wider">
            Davomat
          </h3>
          <div className="border border-border/50 rounded-xl overflow-hidden print-border">
            <div className="grid grid-cols-2">
              <div className="p-3 border-b border-r border-border/50 print-border">
                <p className="text-xs text-muted-foreground print-muted">Ish kunlari</p>
                <p className="text-sm font-semibold text-foreground print-text">
                  {payroll.workingDays}
                </p>
              </div>
              <div className="p-3 border-b border-border/50 print-border">
                <p className="text-xs text-muted-foreground print-muted">Kelgan kunlari</p>
                <p className="text-sm font-semibold text-foreground print-text">
                  {payroll.presentDays}
                </p>
              </div>
              <div className="p-3 border-b border-r border-border/50 print-border">
                <p className="text-xs text-muted-foreground print-muted">Kelmagan</p>
                <p className="text-sm font-semibold text-foreground print-text">
                  {payroll.absentDays}
                </p>
              </div>
              <div className="p-3 border-b border-border/50 print-border">
                <p className="text-xs text-muted-foreground print-muted">Kechikkan</p>
                <p className="text-sm font-semibold text-foreground print-text">
                  {payroll.lateDays}
                </p>
              </div>
              <div className="p-3 border-r border-border/50 print-border">
                <p className="text-xs text-muted-foreground print-muted">Jami soatlar</p>
                <p className="text-sm font-semibold text-foreground print-text">
                  {payroll.totalHoursWorked}
                </p>
              </div>
              <div className="p-3">
                <p className="text-xs text-muted-foreground print-muted">Qo'shimcha soatlar</p>
                <p className="text-sm font-semibold text-foreground print-text">
                  {payroll.overtimeHours}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Salary Calculation Section */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-foreground print-text mb-3 uppercase tracking-wider">
            Oylik hisob-kitob
          </h3>
          <div className="border border-border/50 rounded-xl overflow-hidden print-border">
            {/* Base salary */}
            <div className="flex items-center justify-between p-3 border-b border-border/50 print-border">
              <span className="text-sm text-muted-foreground print-muted">Asosiy oylik</span>
              <span className="text-sm font-medium text-foreground print-text">
                {formatCurrency(payroll.baseSalary)}
              </span>
            </div>
            {/* Overtime */}
            <div className="flex items-center justify-between p-3 border-b border-border/50 print-border">
              <span className="text-sm text-muted-foreground print-muted">
                Qo'shimcha ish haqi
              </span>
              <span className="text-sm font-medium text-foreground print-text">
                {formatCurrency(payroll.overtimeAmount || 0)}
              </span>
            </div>
            {/* Bonus */}
            <div className="flex items-center justify-between p-3 border-b border-border/50 print-border">
              <span className="text-sm text-muted-foreground print-muted">Bonus</span>
              <span className="text-sm font-medium text-foreground print-text">
                {formatCurrency(payroll.bonus || 0)}
              </span>
            </div>
            {/* Total calculated */}
            <div className="flex items-center justify-between p-3 border-b border-border/50 bg-muted/30 print-bg print-border">
              <span className="text-sm font-semibold text-foreground print-text">
                JAMI HISOBLANGAN
              </span>
              <span className="text-sm font-bold text-foreground print-text">
                {formatCurrency(totalCalculated)}
              </span>
            </div>
            {/* Deductions */}
            <div className="flex items-center justify-between p-3 border-b border-border/50 print-border">
              <span className="text-sm text-muted-foreground print-muted">Ushlab qolishlar</span>
              <span className="text-sm font-medium text-red-400 print-text">
                -{formatCurrency(payroll.deductions || 0)}
              </span>
            </div>
            {/* Advances */}
            <div className="flex items-center justify-between p-3 border-b border-border/50 print-border">
              <span className="text-sm text-muted-foreground print-muted">Avanslar</span>
              <span className="text-sm font-medium text-red-400 print-text">
                -{formatCurrency(payroll.advancesTotal || 0)}
              </span>
            </div>
            {/* Net salary */}
            <div className="flex items-center justify-between p-4 bg-indigo-500/10 print-bg">
              <span className="text-base font-bold text-foreground print-text">SOF OYLIK</span>
              <span className="text-xl font-bold text-indigo-400 print-text">
                {formatCurrency(payroll.netSalary)}
              </span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {payroll.notes && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-foreground print-text mb-2 uppercase tracking-wider">
              Izoh
            </h3>
            <p className="text-sm text-muted-foreground print-muted border border-border/50 rounded-xl p-3 print-border">
              {payroll.notes}
            </p>
          </div>
        )}

        {/* Signatures */}
        <div className="mt-10 pt-6 border-t border-border/50 print-border">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-sm text-muted-foreground print-muted mb-8">Hisobladi:</p>
              <div className="border-b border-border/50 print-border" />
              <p className="mt-1 text-xs text-muted-foreground print-muted text-center">
                (imzo)
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground print-muted mb-8">Qabul qildi:</p>
              <div className="border-b border-border/50 print-border" />
              <p className="mt-1 text-xs text-muted-foreground print-muted text-center">
                (imzo)
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
