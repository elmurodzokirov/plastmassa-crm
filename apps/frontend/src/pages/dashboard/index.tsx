import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Users,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Wallet,
  Factory,
  UserCheck,
  DollarSign,
  CreditCard,
  LineChart,
  PieChartIcon,
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
  useSalesChart,
} from '@/hooks/use-dashboard';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatCard } from '@/components/shared/stat-card';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

// ── Constants ─────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr',
];

const MONTH_SHORT = [
  'Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun',
  'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek',
];

const ORDER_STATUS: Record<string, { label: string; variant: 'warning' | 'info' | 'error' | 'default' }> = {
  PENDING: { label: 'Kutilmoqda', variant: 'warning' },
  CONFIRMED: { label: 'Tasdiqlangan', variant: 'info' },
  CANCELLED: { label: 'Bekor qilingan', variant: 'error' },
};

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Naqd', TRANSFER: "O'tkazma", CARD: 'Karta',
  cash: 'Naqd', transfer: "O'tkazma", card: 'Karta',
};

const PIE_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444'];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

// ── Helpers ───────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any): React.ReactNode {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border/80 bg-card px-3 py-2 shadow-lg">
      <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
        {label}
      </p>
      {payload.map((entry: any, idx: number) => (
        <p key={idx} className="text-sm" style={{ color: entry.color }}>
          <span className="text-muted-foreground">{entry.name}: </span>
          <span className="font-semibold">{formatCurrency(entry.value)}</span>
        </p>
      ))}
    </div>
  );
}

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

  // Sales chart state
  const [chartPeriod, setChartPeriod] = useState<'year' | 'month' | 'day'>('month');
  const [chartYear, setChartYear] = useState(now.getFullYear());
  const [chartMonth, setChartMonth] = useState(now.getMonth() + 1);

  // Data hooks
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: recentOrders, isLoading: ordersLoading } = useRecentOrders(5);
  const { data: recentPayments, isLoading: paymentsLoading } = useRecentPayments(5);
  const { data: salesData, isLoading: salesLoading } = useSalesChart(
    chartPeriod,
    chartPeriod !== 'year' ? chartYear : undefined,
    chartPeriod === 'day' ? chartMonth : undefined,
  );

  const orders = useMemo(() => (Array.isArray(recentOrders) ? recentOrders : []), [recentOrders]);
  const payments = useMemo(() => (Array.isArray(recentPayments) ? recentPayments : []), [recentPayments]);

  const chartItems = useMemo(() => {
    if (!Array.isArray(salesData)) return [];
    return salesData.map((d) => ({
      name: chartPeriod === 'year' ? String(d.year)
        : chartPeriod === 'month' ? MONTH_SHORT[(d.month || 1) - 1]
        : String(d.day || ''),
      savdo: d.totalSales,
      daromad: d.grossProfit,
      buyurtmalar: d.orderCount,
    }));
  }, [salesData, chartPeriod]);

  // Pie chart: savdo vs daromad (jami)
  const pieData = useMemo(() => {
    if (!chartItems.length) return [];
    const totalSales = chartItems.reduce((s, i) => s + i.savdo, 0);
    const totalProfit = chartItems.reduce((s, i) => s + i.daromad, 0);
    const totalCost = totalSales - totalProfit;
    if (totalSales === 0) return [];
    return [
      { name: 'Daromad', value: totalProfit },
      { name: 'Tannarx', value: totalCost },
    ];
  }, [chartItems]);

  const netProfit = useMemo(() => {
    if (!stats) return 0;
    return (stats.monthlyRevenue || 0) - (stats.monthlyExpenses || 0);
  }, [stats]);

  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let y = now.getFullYear(); y >= now.getFullYear() - 4; y--) years.push(y);
    return years;
  }, []);

  const chartSubtitle = useMemo(() => {
    if (chartPeriod === 'year') return 'Yillar kesimida';
    if (chartPeriod === 'month') return `${chartYear}-yil`;
    return `${MONTH_NAMES[(chartMonth || 1) - 1]} ${chartYear}`;
  }, [chartPeriod, chartYear, chartMonth]);

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
                label="Oylik daromad"
                value={formatCurrency(stats?.monthlyRevenue ?? 0)}
                icon={TrendingUp}
                iconColor="text-emerald-600 dark:text-emerald-400"
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

      {/* Charts Row - only for users with both orders and finance permissions */}
      {canSeeOrders && canSeeFinance && (
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-5 xl:grid-cols-2"
      >
        {/* Sales Bar Chart */}
        <motion.div variants={item}>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <LineChart className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  Savdo va daromad
                </CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={chartPeriod} onValueChange={(v) => setChartPeriod(v as 'year' | 'month' | 'day')}>
                    <SelectTrigger className="w-[100px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="year">Yillar</SelectItem>
                      <SelectItem value="month">Oylar</SelectItem>
                      <SelectItem value="day">Kunlar</SelectItem>
                    </SelectContent>
                  </Select>
                  {chartPeriod !== 'year' && (
                    <Select value={String(chartYear)} onValueChange={(v) => setChartYear(Number(v))}>
                      <SelectTrigger className="w-[80px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {yearOptions.map((y) => (
                          <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {chartPeriod === 'day' && (
                    <Select value={String(chartMonth)} onValueChange={(v) => setChartMonth(Number(v))}>
                      <SelectTrigger className="w-[110px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTH_NAMES.map((name, idx) => (
                          <SelectItem key={idx} value={String(idx + 1)}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{chartSubtitle}</p>
            </CardHeader>
            <CardContent>
              {salesLoading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <LoadingSpinner size="md" />
                </div>
              ) : chartItems.length === 0 ? (
                <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">
                  Ma'lumot topilmadi
                </div>
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartItems} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradSavdo" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="rgb(99, 102, 241)" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="rgb(99, 102, 241)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradDaromad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="rgb(16, 185, 129)" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="rgb(16, 185, 129)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis
                        axisLine={false} tickLine={false}
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        tickFormatter={(v) => v >= 1e9 ? `${(v/1e9).toFixed(1)}B` : v >= 1e6 ? `${(v/1e6).toFixed(0)}M` : v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : String(v)}
                        width={50}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                      <Area
                        type="monotone"
                        dataKey="savdo"
                        name="Savdo"
                        stroke="rgb(99, 102, 241)"
                        strokeWidth={2}
                        fill="url(#gradSavdo)"
                        stackId="1"
                      />
                      <Area
                        type="monotone"
                        dataKey="daromad"
                        name="Daromad"
                        stroke="rgb(16, 185, 129)"
                        strokeWidth={2}
                        fill="url(#gradDaromad)"
                        stackId="2"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Pie Chart: Savdo tarkibi */}
        <motion.div variants={item}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <PieChartIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                Savdo tarkibi
              </CardTitle>
              <p className="text-xs text-muted-foreground">{chartSubtitle}</p>
            </CardHeader>
            <CardContent>
              {salesLoading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <LoadingSpinner size="md" />
                </div>
              ) : pieData.length === 0 ? (
                <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">
                  Ma'lumot topilmadi
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={110}
                        paddingAngle={2}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {pieData.map((_entry, index) => (
                          <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid hsl(var(--border))',
                          background: 'hsl(var(--card))',
                          fontSize: '13px',
                        }}
                      />
                      <Legend
                        iconType="circle"
                        iconSize={8}
                        layout="vertical"
                        align="right"
                        verticalAlign="middle"
                        wrapperStyle={{ fontSize: '13px', paddingLeft: '16px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
      )}

      {/* Bottom stats row - permission gated */}
      {(canSeeFinance || canSeeCustomers || canSeeProduction || canSeeAttendance || canSeePayroll) && (
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        {canSeeFinance && (
          <motion.div variants={item}>
            <StatCard
              label="Sof foyda"
              value={formatCurrency(netProfit)}
              icon={netProfit >= 0 ? DollarSign : TrendingDown}
              iconColor={netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}
            />
          </motion.div>
        )}
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
