import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Phone,
  MapPin,
  FileText,
  Calendar,
  Pencil,
  CreditCard,
  AlertTriangle,
  ShoppingCart,
  PackageOpen,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useCustomer } from '@/hooks/use-customers';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: customer, isLoading, isError } = useCustomer(id || '');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isError || !customer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 mb-4">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Mijoz topilmadi</h2>
        <p className="text-sm text-muted-foreground mt-1">
          So'ralgan mijoz mavjud emas yoki o'chirilgan
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate('/customers')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Mijozlarga qaytish
        </Button>
      </div>
    );
  }

  const debtPercentage =
    customer.debtLimit > 0
      ? Math.min((customer.currentDebt / customer.debtLimit) * 100, 100)
      : 0;

  const getDebtProgressColor = () => {
    if (debtPercentage >= 80) return 'bg-red-500';
    if (debtPercentage >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getDebtTextColor = () => {
    if (customer.currentDebt > 0) return 'text-red-400';
    return 'text-green-400';
  };

  const availableCredit = Math.max(customer.debtLimit - customer.currentDebt, 0);

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Button
          variant="ghost"
          onClick={() => navigate('/customers')}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Mijozlar
        </Button>
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="lg:col-span-2 bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6"
        >
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{customer.name}</h1>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={customer.isActive ? 'success' : 'secondary'}>
                  {customer.isActive ? 'Faol' : 'Nofaol'}
                </Badge>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/customers', { state: { edit: customer._id } })}
              className="gap-2"
            >
              <Pencil className="h-3.5 w-3.5" />
              Tahrirlash
            </Button>
          </div>

          <div className="space-y-4">
            {customer.phone && (
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20">
                  <Phone className="h-4 w-4 text-indigo-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Telefon</p>
                  <p className="text-sm font-medium text-foreground">{customer.phone}</p>
                </div>
              </div>
            )}

            {customer.address && (
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-500/20">
                  <MapPin className="h-4 w-4 text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Manzil</p>
                  <p className="text-sm font-medium text-foreground">{customer.address}</p>
                </div>
              </div>
            )}

            {customer.notes && (
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20">
                  <FileText className="h-4 w-4 text-cyan-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Izoh</p>
                  <p className="text-sm font-medium text-foreground">{customer.notes}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-500/20">
                <Calendar className="h-4 w-4 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Yaratilgan sana</p>
                <p className="text-sm font-medium text-foreground">
                  {format(new Date(customer.createdAt), 'dd.MM.yyyy HH:mm')}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Financial Block */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6"
        >
          <h2 className="text-lg font-semibold text-foreground mb-6">
            Moliyaviy ma'lumotlar
          </h2>

          <div className="space-y-6">
            {/* Current Debt */}
            <div>
              <p className="text-sm text-muted-foreground mb-1">Joriy qarz</p>
              <p className={cn('text-3xl font-bold', getDebtTextColor())}>
                {formatCurrency(customer.currentDebt)}
              </p>
            </div>

            {/* Debt Limit */}
            <div>
              <p className="text-sm text-muted-foreground mb-1">Qarz limiti</p>
              <p className="text-lg font-semibold text-foreground">
                {formatCurrency(customer.debtLimit)}
              </p>
            </div>

            {/* Progress Bar */}
            {customer.debtLimit > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground">Qarz holati</p>
                  <p className="text-xs font-medium text-muted-foreground">
                    {debtPercentage.toFixed(0)}%
                  </p>
                </div>
                <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-700',
                      getDebtProgressColor(),
                    )}
                    style={{ width: `${debtPercentage}%` }}
                  />
                </div>
              </div>
            )}

            {/* Available Credit */}
            <div className="pt-4 border-t border-border/50">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20">
                  <CreditCard className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Mavjud kredit</p>
                  <p className="text-lg font-semibold text-emerald-400">
                    {formatCurrency(availableCredit)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Activity / Orders History Placeholder */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6"
      >
        <div className="flex items-center gap-2 mb-6">
          <ShoppingCart className="h-5 w-5 text-indigo-400" />
          <h2 className="text-lg font-semibold text-foreground">Buyurtmalar tarixi</h2>
        </div>

        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50 mb-4">
            <PackageOpen className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">Hozircha buyurtmalar yo'q</p>
          <p className="text-xs text-muted-foreground mt-1">
            Bu mijozning buyurtmalari bu yerda ko'rsatiladi
          </p>
        </div>
      </motion.div>
    </div>
  );
}
