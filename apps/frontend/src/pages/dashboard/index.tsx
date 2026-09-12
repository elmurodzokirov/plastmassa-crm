import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  Users,
  ShoppingCart,
  Wallet,
  Factory,
  UserCheck,
  CreditCard,
  ListOrdered,
  Banknote,
} from 'lucide-react';
import { cn, formatCurrency, formatNumber } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { usePermissions } from '@/hooks/use-permissions';
import {
  useDashboardStats,
  useRecentOrders,
  useRecentPayments,
} from '@/hooks/use-dashboard';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { StatCard } from '@/components/shared/stat-card';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

// ── Constants ─────────────────────────────────────────────────────────

const ORDER_STATUS: Record<string, { label: string; variant: 'warning' | 'info' | 'error' | 'default' }> = {
  PENDING: { label: 'Kutilmoqda', variant: 'warning' },
  CONFIRMED: { label: 'Tasdiqlangan', variant: 'info' },
  CANCELLED: { label: 'Bekor qilingan', variant: 'error' },
};

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Naqd', TRANSFER: "O'tkazma", CARD: 'Karta',
  cash: 'Naqd', transfer: "O'tkazma", card: 'Karta',
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

// ── Helpers ───────────────────────────────────────────────────────────

function getCustomerName(customer: unknown): string {
  if (!customer) return '---';
  if (typeof customer === 'string') return customer;
  if (typeof customer === 'object' && customer !== null && 'name' in customer) {
    return (customer as { name: string }).name || '---';
  }
  return '---';
}

// ── Component ─────────────────────────────────────────────────────────

export default function DashboardPage(): React.ReactElement {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { can } = usePermissions();
  const now = new Date();

  // Permission flags for conditional rendering
  const canSeeOrders = can('orders:read');
  const canSeeFinance = can('finance:read');
  const canSeeProduction = can('production:read');
  const canSeeCustomers = can('customers:read');
  const canSeeAttendance = can('attendance:read');
  const canSeePayroll = can('payroll:read');
  const hasAnyStatPermission = canSeeOrders || canSeeFinance || canSeeCustomers || canSeeProduction || canSeeAttendance || canSeePayroll;

  // Data hooks
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: recentOrders, isLoading: ordersLoading } = useRecentOrders(5);
  const { data: recentPayments, isLoading: paymentsLoading } = useRecentPayments(5);

  const orders = useMemo(() => (Array.isArray(recentOrders) ? recentOrders : []), [recentOrders]);
  const payments = useMemo(() => (Array.isArray(recentPayments) ? recentPayments : []), [recentPayments]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">
          Salom, {user?.fullName || 'Foydalanuvchi'}!
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {format(now, 'dd.MM.yyyy, EEEE')}
        </p>
      </div>

      {/* Stat Cards - permission gated */}
      {hasAnyStatPermission && (statsLoading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
        >
          {canSeeOrders && (
            <motion.div variants={item}>
              <StatCard
                label="Faol buyurtmalar"
                value={formatNumber(stats?.activeOrders ?? 0)}
                icon={ShoppingCart}
                iconColor="text-amber-600 dark:text-amber-400"
              />
            </motion.div>
          )}
          {canSeeFinance && (
            <motion.div variants={item}>
              <StatCard
                label="Oylik xarajat"
                value={formatCurrency(stats?.monthlyExpenses ?? 0)}
                icon={CreditCard}
                iconColor="text-red-600 dark:text-red-400"
              />
            </motion.div>
          )}
          {canSeeCustomers && (
            <motion.div variants={item}>
              <StatCard
                label="Jami mijozlar"
                value={formatNumber(stats?.totalCustomers ?? 0)}
                icon={Users}
                iconColor="text-indigo-600 dark:text-indigo-400"
              />
            </motion.div>
          )}
        </motion.div>
      ))}

      {/* Bottom stats row - permission gated */}
      {(canSeeCustomers || canSeeProduction || canSeeAttendance || canSeePayroll) && (
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        {canSeeCustomers && (
          <motion.div variants={item}>
            <StatCard
              label="Jami qarz"
              value={formatCurrency(stats?.totalDebt ?? 0)}
              icon={Wallet}
              iconColor="text-red-600 dark:text-red-400"
            />
          </motion.div>
        )}
        {canSeeProduction && (
          <motion.div variants={item}>
            <StatCard
              label="Bugungi ishlab chiqarish"
              value={formatNumber(stats?.productionToday ?? 0)}
              icon={Factory}
              iconColor="text-purple-600 dark:text-purple-400"
            />
          </motion.div>
        )}
        {(canSeeAttendance || canSeePayroll) && (
          <motion.div variants={item}>
            <StatCard
              label="Faol xodimlar"
              value={formatNumber(stats?.employeeCount ?? 0)}
              icon={UserCheck}
              iconColor="text-blue-600 dark:text-blue-400"
            />
          </motion.div>
        )}
      </motion.div>
      )}

      {/* Lists Row - permission gated with dynamic grid */}
      {(canSeeOrders || canSeeFinance) && (
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className={cn(
          "grid grid-cols-1 gap-5",
          canSeeOrders && canSeeFinance ? "xl:grid-cols-2" : "",
        )}
      >
        {/* Recent Orders */}
        {canSeeOrders && (
        <motion.div variants={item}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ListOrdered className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                Oxirgi buyurtmalar
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="md" />
                </div>
              ) : orders.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">Buyurtmalar topilmadi</p>
              ) : (
                <div className="space-y-0">
                  {orders.map((order, idx) => {
                    const sc = ORDER_STATUS[order.status] || { label: order.status, variant: 'default' as const };
                    return (
                      <div
                        key={order._id}
                        className={cn(
                          'flex items-center justify-between py-3 cursor-pointer hover:bg-muted/30 -mx-6 px-6 transition-colors',
                          idx < orders.length - 1 && 'border-b border-border/50',
                        )}
                        onClick={() => navigate(`/orders/${order._id}`)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-muted shrink-0">
                            <span className="text-xs font-semibold text-muted-foreground">{idx + 1}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {getCustomerName(order.customer)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {order.createdAt ? format(new Date(order.createdAt), 'dd.MM.yyyy') : '---'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <Badge variant={sc.variant}>{sc.label}</Badge>
                          <span className="text-sm font-semibold text-foreground">
                            {formatCurrency(order.totalAmount || 0)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
        )}

        {/* Recent Payments */}
        {canSeeFinance && (
        <motion.div variants={item}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Banknote className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                Oxirgi to'lovlar
              </CardTitle>
            </CardHeader>
            <CardContent>
              {paymentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="md" />
                </div>
              ) : payments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">To'lovlar topilmadi</p>
              ) : (
                <div className="space-y-0">
                  {payments.map((payment, idx) => (
                    <div
                      key={payment._id}
                      className={cn(
                        'flex items-center justify-between py-3 -mx-6 px-6',
                        idx < payments.length - 1 && 'border-b border-border/50',
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-muted shrink-0">
                          <span className="text-xs font-semibold text-muted-foreground">{idx + 1}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {getCustomerName(payment.customer)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {payment.createdAt ? format(new Date(payment.createdAt), 'dd.MM.yyyy') : '---'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <Badge variant="secondary">
                          {PAYMENT_LABELS[payment.type] || payment.type}
                        </Badge>
                        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(payment.amount || 0)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
        )}
      </motion.div>
      )}

      {/* Minimal fallback for users with no dashboard-relevant permissions */}
      {!hasAnyStatPermission && (
        <Card>
          <CardContent className="py-12 text-center">
            <Factory className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              Tizimga xush kelibsiz! Sizning rolingiz uchun dashboard ma'lumotlari mavjud emas.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
