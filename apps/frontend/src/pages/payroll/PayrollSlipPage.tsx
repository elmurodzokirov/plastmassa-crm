import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Printer, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { usePayrollSlip } from '@/hooks/use-payroll';

import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

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

export default function PayrollSlipPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: payroll, isLoading, isError } = usePayrollSlip(id || '');

  const handlePrint = () => {
    window.print();
  };

  const getUserName = (user: any): string => {
    if (!user) return '—';
    if (typeof user === 'string') return user;
    return user.fullName || '—';
  };

  const getUserRole = (user: any): string => {
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

  return (
    <>
      {/* Print Styles */}
      <style>{`
        @media print {
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
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            padding: 20px;
            margin: 0;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }
          .print-area * {
            color: black !important;
            background: transparent !important;
            border-color: #333 !important;
          }
        }
      `}</style>

      {/* Action Buttons (hidden on print) */}
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

      {/* Slip Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="print-area max-w-2xl mx-auto bg-white text-black rounded-2xl border border-border/50 p-8"
      >
        {/* Company Header */}
        <div className="text-center mb-6 pb-4 border-b-2 border-dashed border-gray-300">
          <h1 className="text-2xl font-bold text-black tracking-wider">
            SAIDBARAKA MChJ
          </h1>
          <p className="text-sm text-gray-500 mt-1">Oylik maosh varaqasi</p>
          <p className="text-sm text-gray-500 mt-0.5">{periodLabel}</p>
        </div>

        {/* Employee Info */}
        <div className="mb-6 p-3 bg-gray-50 rounded-lg space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Xodim:</span>
            <span className="font-semibold text-black">
              {getUserName(payroll.user)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Lavozim:</span>
            <span className="text-black">{getUserRole(payroll.user)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Davr:</span>
            <span className="text-black">{periodLabel}</span>
          </div>
        </div>

        {/* Attendance Info */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wider">
            Davomat
          </h3>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-gray-200">
                <td className="py-2 text-gray-600">Ish kunlari</td>
                <td className="py-2 text-right text-black font-medium">
                  {payroll.workingDays} kun
                </td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="py-2 text-gray-600">Kelgan kunlar</td>
                <td className="py-2 text-right text-black font-medium">
                  {payroll.presentDays} kun
                </td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="py-2 text-gray-600">Kelmagan kunlar</td>
                <td className="py-2 text-right text-black font-medium">
                  {payroll.absentDays} kun
                </td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="py-2 text-gray-600">Kechikkan kunlar</td>
                <td className="py-2 text-right text-black font-medium">
                  {payroll.lateDays} kun
                </td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="py-2 text-gray-600">Jami ishlagan soat</td>
                <td className="py-2 text-right text-black font-medium">
                  {payroll.totalHoursWorked} soat
                </td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="py-2 text-gray-600">Ortiqcha ish soatlari</td>
                <td className="py-2 text-right text-black font-medium">
                  {payroll.overtimeHours} soat
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Salary Breakdown */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wider">
            Oylik tafsilotlari
          </h3>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-gray-200">
                <td className="py-2 text-gray-600">Asosiy maosh</td>
                <td className="py-2 text-right text-black font-medium">
                  {formatCurrency(payroll.baseSalary)}
                </td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="py-2 text-gray-600">Ortiqcha ish haqi</td>
                <td className="py-2 text-right text-black font-medium">
                  {formatCurrency(payroll.overtimeAmount)}
                </td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="py-2 text-gray-600">Bonus</td>
                <td className="py-2 text-right text-black font-medium">
                  {formatCurrency(payroll.bonus)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Deductions */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wider">
            Ushlanmalar
          </h3>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-gray-200">
                <td className="py-2 text-gray-600">Ushlab qolishlar</td>
                <td className="py-2 text-right text-red-600 font-medium">
                  -{formatCurrency(payroll.deductions)}
                </td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="py-2 text-gray-600">Avanslar</td>
                <td className="py-2 text-right text-red-600 font-medium">
                  -{formatCurrency(payroll.advancesTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Net Salary */}
        <div className="border-t-2 border-dashed border-gray-300 pt-4">
          <div className="flex justify-between items-center">
            <span className="text-base font-semibold text-gray-700">
              Sof maosh:
            </span>
            <span className="text-xl font-bold text-black">
              {formatCurrency(payroll.netSalary)}
            </span>
          </div>
        </div>

        {/* Notes */}
        {payroll.notes && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Izoh:</p>
            <p className="text-sm text-black">{payroll.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-4 border-t-2 border-dashed border-gray-300">
          <div className="grid grid-cols-2 gap-8 mt-6">
            <div className="text-center">
              <div className="border-b border-gray-400 mb-1 pb-6" />
              <p className="text-xs text-gray-500">Hisobchi imzosi</p>
            </div>
            <div className="text-center">
              <div className="border-b border-gray-400 mb-1 pb-6" />
              <p className="text-xs text-gray-500">Xodim imzosi</p>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
