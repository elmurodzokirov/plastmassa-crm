import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  ShoppingCart,
  DollarSign,
  BarChart3,
  Factory,
  Package,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Users,
  UserCheck,
  Clock,
  Calculator,
} from 'lucide-react';
import { cn, formatCurrency, formatNumber } from '@/lib/utils';
import {
  useSalesReport,
  useProductionReport,
  useStockReport,
  useAttendanceReport,
} from '@/hooks/use-reports';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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



// ── Helper: get month range ──────────────────────────────────────────

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

export default function ReportsPage() {
  const now = new Date();
  const defaultRange = getMonthRange();

  // ── Sales tab state ────────────────────────────────────────────────
  const [salesDateFrom, setSalesDateFrom] = useState(defaultRange.dateFrom);
  const [salesDateTo, setSalesDateTo] = useState(defaultRange.dateTo);
  const [salesGroupBy, setSalesGroupBy] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // ── Production tab state ───────────────────────────────────────────
  const [prodDateFrom, setProdDateFrom] = useState(defaultRange.dateFrom);
  const [prodDateTo, setProdDateTo] = useState(defaultRange.dateTo);

  // ── Attendance tab state ───────────────────────────────────────────
  const [attYear, setAttYear] = useState(now.getFullYear());
  const [attMonth, setAttMonth] = useState(now.getMonth() + 1);

  // ── Queries ────────────────────────────────────────────────────────

  const salesParams = useMemo(
    () => ({ dateFrom: salesDateFrom, dateTo: salesDateTo, groupBy: salesGroupBy }),
    [salesDateFrom, salesDateTo, salesGroupBy],
  );
  const { data: salesData, isLoading: salesLoading } = useSalesReport(salesParams);

  const prodParams = useMemo(
    () => ({ dateFrom: prodDateFrom, dateTo: prodDateTo }),
    [prodDateFrom, prodDateTo],
  );
  const { data: prodData, isLoading: prodLoading } = useProductionReport(prodParams);

  const { data: stockData, isLoading: stockLoading } = useStockReport();

  const attParams = useMemo(() => ({ year: attYear, month: attMonth }), [attYear, attMonth]);
  const { data: attData, isLoading: attLoading } = useAttendanceReport(attParams);

  // ── Derived data ───────────────────────────────────────────────────

  const salesPeriods = salesData?.byPeriod || [];
  const topProducts = salesData?.topProducts || [];
  const topCustomers = salesData?.topCustomers || [];

  const prodByProduct = prodData?.byProduct || [];
  const prodByWorker = prodData?.byWorker || [];
  const prodDaily = prodData?.daily || [];

  const stockProducts = stockData?.products || [];

  const attEmployees = attData?.employees || [];

  // ── Attendance navigation ──────────────────────────────────────────

  const goToPrevMonth = () => {
    if (attMonth === 1) {
      setAttMonth(12);
      setAttYear((y) => y - 1);
    } else {
      setAttMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (attMonth === 12) {
      setAttMonth(1);
      setAttYear((y) => y + 1);
    } else {
      setAttMonth((m) => m + 1);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-bold text-foreground">Hisobotlar</h1>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="sales" className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          <TabsList>
            <TabsTrigger value="sales">Sotuvlar</TabsTrigger>
            <TabsTrigger value="production">Ishlab chiqarish</TabsTrigger>
            <TabsTrigger value="stock">Ombor</TabsTrigger>
            <TabsTrigger value="attendance">Davomat</TabsTrigger>
          </TabsList>
        </motion.div>

        {/* ── TAB 1: Sales ──────────────────────────────────────────────── */}
        <TabsContent value="sales" className="space-y-6">
          {/* Filters */}
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
                value={salesDateFrom}
                onChange={(e) => setSalesDateFrom(e.target.value)}
                className="h-9 rounded-xl text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Tugash sana</Label>
              <Input
                type="date"
                value={salesDateTo}
                onChange={(e) => setSalesDateTo(e.target.value)}
                className="h-9 rounded-xl text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Guruhlash</Label>
              <Select
                value={salesGroupBy}
                onValueChange={(v) => setSalesGroupBy(v as 'daily' | 'weekly' | 'monthly')}
              >
                <SelectTrigger className="h-9 rounded-xl text-xs w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Kunlik</SelectItem>
                  <SelectItem value="weekly">Haftalik</SelectItem>
                  <SelectItem value="monthly">Oylik</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </motion.div>

          {salesLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <>
              {/* Stat Cards */}
              {salesData && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <StatCard
                    title="Jami buyurtmalar"
                    value={salesData.totalOrders ?? 0}
                    icon={ShoppingCart}
                    iconColor="text-indigo-400"
                    iconBg="bg-indigo-500/20"
                    index={0}
                  />
                  <StatCard
                    title="Jami summa"
                    value={formatCurrency(salesData.totalAmount ?? 0)}
                    icon={DollarSign}
                    iconColor="text-green-400"
                    iconBg="bg-green-500/20"
                    index={1}
                  />
                  <StatCard
                    title="O'rtacha buyurtma"
                    value={formatCurrency(salesData.averageOrder ?? 0)}
                    icon={BarChart3}
                    iconColor="text-amber-400"
                    iconBg="bg-amber-500/20"
                    index={2}
                  />
                </div>
              )}

              {/* Sales Breakdown by Period */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <h3 className="text-base font-semibold text-foreground mb-3">
                  Davr bo'yicha sotuvlar
                </h3>
                <DataTableWrapper
                  isEmpty={salesPeriods.length === 0}
                  emptyTitle="Ma'lumot topilmadi"
                  emptyDescription="Bu davr uchun sotuv ma'lumotlari mavjud emas"
                >
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-border/50 hover:bg-transparent">
                          <TableHead className="min-w-[140px]">Davr</TableHead>
                          <TableHead className="min-w-[100px]">Buyurtmalar</TableHead>
                          <TableHead className="min-w-[140px]">Summa</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {salesPeriods.map((row, idx) => (
                          <TableRow
                            key={idx}
                            className="border-b border-border/30 hover:bg-accent/50 transition-colors"
                          >
                            <TableCell className="font-medium text-foreground">
                              {row.period}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{row.orders}</TableCell>
                            <TableCell className="font-semibold text-green-400">
                              {formatCurrency(row.amount || 0)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </DataTableWrapper>
              </motion.div>

              {/* Top 10 Products */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.25 }}
              >
                <h3 className="text-base font-semibold text-foreground mb-3">
                  Top 10 mahsulotlar
                </h3>
                <DataTableWrapper
                  isEmpty={topProducts.length === 0}
                  emptyTitle="Ma'lumot topilmadi"
                  emptyDescription="Mahsulot sotuv ma'lumotlari mavjud emas"
                >
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-border/50 hover:bg-transparent">
                          <TableHead className="w-[50px]">#</TableHead>
                          <TableHead className="min-w-[180px]">Mahsulot</TableHead>
                          <TableHead className="min-w-[100px]">Miqdor</TableHead>
                          <TableHead className="min-w-[140px]">Summa</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topProducts.slice(0, 10).map((item, idx) => (
                          <TableRow
                            key={idx}
                            className="border-b border-border/30 hover:bg-accent/50 transition-colors"
                          >
                            <TableCell className="text-muted-foreground font-medium">
                              {idx + 1}
                            </TableCell>
                            <TableCell className="font-medium text-foreground">
                              {item.name}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatNumber(item.quantity || 0)}
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

              {/* Top 10 Customers */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
              >
                <h3 className="text-base font-semibold text-foreground mb-3">
                  Top 10 mijozlar
                </h3>
                <DataTableWrapper
                  isEmpty={topCustomers.length === 0}
                  emptyTitle="Ma'lumot topilmadi"
                  emptyDescription="Mijozlar sotuv ma'lumotlari mavjud emas"
                >
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-border/50 hover:bg-transparent">
                          <TableHead className="w-[50px]">#</TableHead>
                          <TableHead className="min-w-[180px]">Mijoz</TableHead>
                          <TableHead className="min-w-[100px]">Buyurtmalar</TableHead>
                          <TableHead className="min-w-[140px]">Summa</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topCustomers.slice(0, 10).map((item, idx) => (
                          <TableRow
                            key={idx}
                            className="border-b border-border/30 hover:bg-accent/50 transition-colors"
                          >
                            <TableCell className="text-muted-foreground font-medium">
                              {idx + 1}
                            </TableCell>
                            <TableCell className="font-medium text-foreground">
                              {item.name}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{item.orders}</TableCell>
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
            </>
          )}
        </TabsContent>

        {/* ── TAB 2: Production ─────────────────────────────────────────── */}
        <TabsContent value="production" className="space-y-6">
          {/* Filters */}
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
                value={prodDateFrom}
                onChange={(e) => setProdDateFrom(e.target.value)}
                className="h-9 rounded-xl text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Tugash sana</Label>
              <Input
                type="date"
                value={prodDateTo}
                onChange={(e) => setProdDateTo(e.target.value)}
                className="h-9 rounded-xl text-xs"
              />
            </div>
          </motion.div>

          {prodLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <>
              {/* Stat Cards */}
              {prodData && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <StatCard
                    title="Jami ishlab chiqarilgan"
                    value={formatNumber(prodData.totalProduced ?? 0)}
                    icon={Factory}
                    iconColor="text-purple-400"
                    iconBg="bg-purple-500/20"
                    index={0}
                  />
                  <StatCard
                    title="Jami hisoblangan summa"
                    value={formatCurrency(prodData.totalAmount ?? 0)}
                    icon={DollarSign}
                    iconColor="text-green-400"
                    iconBg="bg-green-500/20"
                    index={1}
                  />
                </div>
              )}

              {/* By Product */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <h3 className="text-base font-semibold text-foreground mb-3">
                  Mahsulot bo'yicha
                </h3>
                <DataTableWrapper
                  isEmpty={prodByProduct.length === 0}
                  emptyTitle="Ma'lumot topilmadi"
                  emptyDescription="Ishlab chiqarish ma'lumotlari mavjud emas"
                >
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-border/50 hover:bg-transparent">
                          <TableHead className="min-w-[180px]">Mahsulot</TableHead>
                          <TableHead className="min-w-[100px]">Miqdor</TableHead>
                          <TableHead className="min-w-[140px]">Summa</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {prodByProduct.map((item, idx) => (
                          <TableRow
                            key={idx}
                            className="border-b border-border/30 hover:bg-accent/50 transition-colors"
                          >
                            <TableCell className="font-medium text-foreground">
                              {item.name}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatNumber(item.quantity || 0)}
                            </TableCell>
                            <TableCell className="font-semibold text-green-400">
                              {formatCurrency(item.amount || 0)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </DataTableWrapper>
              </motion.div>

              {/* By Worker */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.25 }}
              >
                <h3 className="text-base font-semibold text-foreground mb-3">
                  Ishchi bo'yicha
                </h3>
                <DataTableWrapper
                  isEmpty={prodByWorker.length === 0}
                  emptyTitle="Ma'lumot topilmadi"
                  emptyDescription="Ishchi bo'yicha ma'lumotlar mavjud emas"
                >
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-border/50 hover:bg-transparent">
                          <TableHead className="min-w-[180px]">Ishchi</TableHead>
                          <TableHead className="min-w-[100px]">Miqdor</TableHead>
                          <TableHead className="min-w-[140px]">Summa</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {prodByWorker.map((item, idx) => (
                          <TableRow
                            key={idx}
                            className="border-b border-border/30 hover:bg-accent/50 transition-colors"
                          >
                            <TableCell className="font-medium text-foreground">
                              {item.name}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatNumber(item.quantity || 0)}
                            </TableCell>
                            <TableCell className="font-semibold text-green-400">
                              {formatCurrency(item.amount || 0)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </DataTableWrapper>
              </motion.div>

              {/* Daily Production */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
              >
                <h3 className="text-base font-semibold text-foreground mb-3">
                  Kunlik ishlab chiqarish
                </h3>
                <DataTableWrapper
                  isEmpty={prodDaily.length === 0}
                  emptyTitle="Ma'lumot topilmadi"
                  emptyDescription="Kunlik ishlab chiqarish ma'lumotlari mavjud emas"
                >
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-border/50 hover:bg-transparent">
                          <TableHead className="min-w-[120px]">Sana</TableHead>
                          <TableHead className="min-w-[100px]">Miqdor</TableHead>
                          <TableHead className="min-w-[140px]">Summa</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {prodDaily.map((item, idx) => (
                          <TableRow
                            key={idx}
                            className="border-b border-border/30 hover:bg-accent/50 transition-colors"
                          >
                            <TableCell className="font-medium text-foreground">
                              {item.date
                                ? format(new Date(item.date), 'dd.MM.yyyy')
                                : '---'}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatNumber(item.quantity || 0)}
                            </TableCell>
                            <TableCell className="font-semibold text-green-400">
                              {formatCurrency(item.amount || 0)}
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

        {/* ── TAB 3: Stock ──────────────────────────────────────────────── */}
        <TabsContent value="stock" className="space-y-6">
          {stockLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <>
              {/* Products Stock */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.15 }}
              >
                <h3 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4 text-indigo-400" />
                  Mahsulotlar zaxirasi
                </h3>
                <DataTableWrapper
                  isEmpty={stockProducts.length === 0}
                  emptyTitle="Mahsulotlar topilmadi"
                  emptyDescription="Mahsulotlar zaxirasi ma'lumotlari mavjud emas"
                >
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-border/50 hover:bg-transparent">
                          <TableHead className="min-w-[200px]">Mahsulot nomi</TableHead>
                          <TableHead className="min-w-[120px]">Joriy zaxira</TableHead>
                          <TableHead className="min-w-[100px]">Birlik</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stockProducts.map((product) => (
                          <TableRow
                            key={product._id}
                            className="border-b border-border/30 hover:bg-accent/50 transition-colors"
                          >
                            <TableCell className="font-medium text-foreground">
                              {product.name}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatNumber(product.currentStock)}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{product.unit}</TableCell>
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

        {/* ── TAB 4: Attendance ─────────────────────────────────────────── */}
        <TabsContent value="attendance" className="space-y-6">
          {/* Month/Year Selector */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="flex items-center justify-center gap-3"
          >
            <Button
              variant="outline"
              size="icon"
              onClick={goToPrevMonth}
              className="h-10 w-10 rounded-xl"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2 bg-card/60 backdrop-blur-xl border border-border/50 rounded-xl px-5 py-2.5 min-w-[220px] justify-center">
              <Users className="h-4 w-4 text-indigo-400 shrink-0" />
              <span className="text-sm font-medium text-foreground">
                {attYear}-yil, {MONTH_NAMES[attMonth - 1]}
              </span>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={goToNextMonth}
              className="h-10 w-10 rounded-xl"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </motion.div>

          {attLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <>
              {/* Summary Stats */}
              {attData?.summary && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard
                    title="Jami xodimlar"
                    value={attData.summary.totalEmployees ?? 0}
                    icon={Users}
                    iconColor="text-indigo-400"
                    iconBg="bg-indigo-500/20"
                    index={0}
                  />
                  <StatCard
                    title="O'rtacha keldi"
                    value={attData.summary.avgPresent ?? 0}
                    icon={UserCheck}
                    iconColor="text-green-400"
                    iconBg="bg-green-500/20"
                    index={1}
                  />
                  <StatCard
                    title="O'rtacha kelmadi"
                    value={attData.summary.avgAbsent ?? 0}
                    icon={AlertTriangle}
                    iconColor="text-red-400"
                    iconBg="bg-red-500/20"
                    index={2}
                  />
                  <StatCard
                    title="Jami soatlar"
                    value={formatNumber(attData.summary.totalHours ?? 0)}
                    icon={Clock}
                    iconColor="text-cyan-400"
                    iconBg="bg-cyan-500/20"
                    index={3}
                  />
                </div>
              )}

              {/* Attendance Table */}
              <DataTableWrapper
                isEmpty={attEmployees.length === 0}
                emptyTitle="Ma'lumot topilmadi"
                emptyDescription="Bu oy uchun davomat ma'lumotlari mavjud emas"
              >
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-border/50 hover:bg-transparent">
                        <TableHead className="min-w-[180px]">Xodim</TableHead>
                        <TableHead className="min-w-[100px]">Lavozim</TableHead>
                        <TableHead className="min-w-[80px]">Keldi</TableHead>
                        <TableHead className="min-w-[80px]">Kelmadi</TableHead>
                        <TableHead className="min-w-[80px]">Kechikdi</TableHead>
                        <TableHead className="min-w-[100px]">Jami soat</TableHead>
                        <TableHead className="min-w-[100px]">Qo'shimcha</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attEmployees.map((emp) => (
                        <TableRow
                          key={emp.userId}
                          className="border-b border-border/30 hover:bg-accent/50 transition-colors"
                        >
                          <TableCell className="font-medium text-foreground">
                            {emp.fullName}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {emp.role}
                          </TableCell>
                          <TableCell>
                            <Badge variant="success">{emp.presentDays}</Badge>
                          </TableCell>
                          <TableCell>
                            {emp.absentDays > 0 ? (
                              <Badge variant="destructive">{emp.absentDays}</Badge>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {emp.lateDays > 0 ? (
                              <Badge variant="warning">{emp.lateDays}</Badge>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatNumber(emp.totalHours || 0)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatNumber(emp.overtimeHours || 0)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </DataTableWrapper>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
