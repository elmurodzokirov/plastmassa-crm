import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  Factory,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Calendar,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { cn, formatNumber, formatCurrency } from '@/lib/utils';
import {
  useProductionLogs,
  useCreateProductionLog,
  useApproveProductionLog,
  useDailyProductionLogs,
} from '@/hooks/use-production';
import { useAuthStore } from '@/stores/auth.store';
import { useProducts } from '@/hooks/use-products';
import { useUsers } from '@/hooks/use-users';
import type { ProductionLogQuery } from '@/api/production';
import { toast } from '@/components/ui/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StatCard } from '@/components/shared/stat-card';
import { DataTableWrapper } from '@/components/shared/data-table';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

const createLogSchema = z.object({
  product: z.string().min(1, 'Mahsulot tanlang'),
  date: z.string().min(1, 'Sana tanlang'),
  quantityProduced: z.coerce.number().min(1, "Miqdor 0 dan katta bo'lishi kerak"),
  worker: z.string().min(1, 'Ishchi tanlang'),
  notes: z.string().optional(),
});

type CreateLogFormData = z.infer<typeof createLogSchema>;

export default function ProductionPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const limit = 10;
  const permissions = useAuthStore((s) => s.permissions);
  const hasUpdatePermission = permissions.includes('production:update');

  const debouncedSearch = useDebounce(search, 300);

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const queryParams: ProductionLogQuery = {
    page,
    limit,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(dateFrom && { dateFrom }),
    ...(dateTo && { dateTo }),
    ...(statusFilter && { status: statusFilter }),
    sortBy: 'date',
    sortOrder: 'desc',
  };

  const { data: logsData, isLoading } = useProductionLogs(queryParams);
  const { data: dailyLogs } = useDailyProductionLogs(todayStr);
  const { data: monthlyLogsData } = useProductionLogs({
    limit: 9999,
    dateFrom: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
    dateTo: format(new Date(), 'yyyy-MM-dd'),
  });
  const { data: productsData } = useProducts({ limit: 9999, isActive: true });
  const { data: usersData } = useUsers({ limit: 9999 });
  const createLogMutation = useCreateProductionLog();
  const approveLogMutation = useApproveProductionLog();

  const logs = logsData?.items || [];
  const totalPages = logsData?.totalPages || 1;
  const totalCount = logsData?.total || 0;

  const todayLogs = dailyLogs || [];
  const todayProduced = todayLogs.reduce((sum, l) => sum + l.quantityProduced, 0);
  const monthlyLogs = monthlyLogsData?.items || [];
  const monthlyProduced = monthlyLogs.reduce((sum, l) => sum + l.quantityProduced, 0);
  const monthlyExpense = monthlyLogs.reduce((sum, l) => sum + l.totalMaterialCost, 0);
  const monthlyEarned = monthlyLogs.reduce((sum, l) => sum + l.earnedAmount, 0);

  const products = productsData?.items || [];
  const workers = usersData?.items || [];

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateLogFormData>({
    resolver: zodResolver(createLogSchema),
    defaultValues: {
      product: '',
      date: todayStr,
      quantityProduced: 1,
      worker: '',
      notes: '',
    },
  });

  const openCreateDialog = useCallback(() => {
    reset({
      product: '',
      date: todayStr,
      quantityProduced: 1,
      worker: '',
      notes: '',
    });
    setCreateDialogOpen(true);
  }, [reset, todayStr]);

  const onCreateSubmit = useCallback(
    async (data: CreateLogFormData) => {
      try {
        const submitData: any = {
          product: data.product,
          date: data.date,
          quantityProduced: data.quantityProduced,
          worker: data.worker,
          notes: data.notes,
          status: hasUpdatePermission ? 'APPROVED' : 'PENDING',
        };
        await createLogMutation.mutateAsync(submitData);
        toast({
          title: 'Muvaffaqiyatli',
          description: "Ishlab chiqarish yozuvi muvaffaqiyatli yaratildi",
        });
        setCreateDialogOpen(false);
        reset();
      } catch {
        toast({
          title: 'Xatolik',
          description: "Yozuv yaratishda xatolik yuz berdi",
          variant: 'destructive',
        });
      }
    },
    [createLogMutation, reset],
  );

  const getWorkerName = (worker: any): string => {
    if (!worker) return '-';
    if (typeof worker === 'string') return worker;
    return worker.fullName || '-';
  };

  const handleApprove = async (logId: string) => {
    try {
      await approveLogMutation.mutateAsync(logId);
      toast({
        title: 'Muvaffaqiyatli',
        description: 'Ishlab chiqarish yozuvi tasdiqlandi',
      });
    } catch {
      toast({
        title: 'Xatolik',
        description: 'Tasdiqlashda xatolik yuz berdi',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ishlab chiqarish</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Jami {totalCount} ta yozuv
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          Yangi yozuv
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Bugungi ishlab chiqarish"
          value={formatNumber(todayProduced)}
          icon={Factory}
          iconColor="text-indigo-400"
          iconBg="bg-indigo-500/20"
          index={0}
        />
        <StatCard
          title="Oylik ishlab chiqarish"
          value={formatNumber(monthlyProduced)}
          icon={Calendar}
          iconColor="text-cyan-400"
          iconBg="bg-cyan-500/20"
          index={1}
        />
        <StatCard
          title="Oylik xarajat"
          value={formatCurrency(monthlyExpense)}
          icon={TrendingDown}
          iconColor="text-red-400"
          iconBg="bg-red-500/20"
          index={2}
        />
        <StatCard
          title="Oylik daromad"
          value={formatCurrency(monthlyEarned)}
          icon={TrendingUp}
          iconColor="text-green-400"
          iconBg="bg-green-500/20"
          index={3}
        />
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2">
        {[
          { label: 'Hammasi', value: '' },
          { label: 'Kutilmoqda', value: 'PENDING' },
          { label: 'Tasdiqlangan', value: 'APPROVED' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setStatusFilter(tab.value);
              setPage(1);
            }}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              statusFilter === tab.value
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters Row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center flex-wrap"
      >
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Mahsulot bo'yicha qidirish..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>

        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            setPage(1);
          }}
          className="w-full sm:w-40"
          placeholder="Dan"
        />

        <Input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setPage(1);
          }}
          className="w-full sm:w-40"
          placeholder="Gacha"
        />
      </motion.div>

      {/* Logs Table */}
      <DataTableWrapper
        isLoading={isLoading}
        isEmpty={!isLoading && logs.length === 0}
        emptyTitle="Yozuvlar topilmadi"
        emptyDescription="Hozircha hech qanday ishlab chiqarish yozuvi qo'shilmagan"
      >
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Sana</TableHead>
              <TableHead>Mahsulot</TableHead>
              <TableHead className="hidden md:table-cell">Miqdor</TableHead>
              <TableHead className="hidden lg:table-cell">Xarajat</TableHead>
              <TableHead className="hidden lg:table-cell">Daromad</TableHead>
              <TableHead className="hidden sm:table-cell">Ishchi</TableHead>
              <TableHead>Holat</TableHead>
              <TableHead className="text-right">Amallar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log._id}>
                <TableCell className="text-muted-foreground">
                  {format(new Date(log.date), 'dd.MM.yyyy')}
                </TableCell>
                <TableCell className="font-medium">
                  {log.productName}
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">
                  {formatNumber(log.quantityProduced)} {log.unitName || ''}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-red-400">
                  {formatCurrency(log.totalMaterialCost)}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-green-400">
                  {formatCurrency(log.earnedAmount)}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground">
                  {getWorkerName(log.worker)}
                </TableCell>
                <TableCell>
                  {log.status === 'APPROVED' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                      <CheckCircle className="h-3 w-3" />
                      Tasdiqlangan
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">
                      <Clock className="h-3 w-3" />
                      Kutilmoqda
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {log.status === 'PENDING' && hasUpdatePermission && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleApprove(log._id)}
                      disabled={approveLogMutation.isPending}
                      className="gap-1 text-green-400 border-green-500/30 hover:bg-green-500/20"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      Tasdiqlash
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableWrapper>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {(page - 1) * limit + 1}-{Math.min(page * limit, totalCount)} / {totalCount}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => {
                if (totalPages <= 5) return true;
                if (p === 1 || p === totalPages) return true;
                if (Math.abs(p - page) <= 1) return true;
                return false;
              })
              .map((p, idx, arr) => {
                const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                return (
                  <div key={p} className="flex items-center gap-1">
                    {showEllipsis && (
                      <span className="px-1 text-muted-foreground">...</span>
                    )}
                    <Button
                      variant={page === p ? 'default' : 'outline'}
                      size="icon"
                      onClick={() => setPage(p)}
                      className="h-8 w-8"
                    >
                      {p}
                    </Button>
                  </div>
                );
              })}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Create Log Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yangi ishlab chiqarish yozuvi</DialogTitle>
            <DialogDescription>
              Bugun qancha mahsulot ishlab chiqarilganini kiriting
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-4">
            {/* Product select */}
            <div className="space-y-2">
              <Label>
                Mahsulot <span className="text-destructive">*</span>
              </Label>
              <Select
                value={watch('product')}
                onValueChange={(value) => setValue('product', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Mahsulot tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product: any) => (
                    <SelectItem key={product._id} value={product._id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.product && (
                <p className="text-xs text-destructive">{errors.product.message}</p>
              )}
            </div>

            {/* Quantity & Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Miqdor <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  min={1}
                  step="any"
                  placeholder="0"
                  {...register('quantityProduced')}
                />
                {errors.quantityProduced && (
                  <p className="text-xs text-destructive">
                    {errors.quantityProduced.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>
                  Sana <span className="text-destructive">*</span>
                </Label>
                <Input type="date" {...register('date')} />
                {errors.date && (
                  <p className="text-xs text-destructive">{errors.date.message}</p>
                )}
              </div>
            </div>

            {/* Worker select */}
            <div className="space-y-2">
              <Label>
                Ishchi <span className="text-destructive">*</span>
              </Label>
              <Select
                value={watch('worker')}
                onValueChange={(value) => setValue('worker', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Ishchi tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {workers.map((user: any) => (
                    <SelectItem key={user._id} value={user._id}>
                      {user.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.worker && (
                <p className="text-xs text-destructive">{errors.worker.message}</p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Izoh</Label>
              <Textarea
                placeholder="Qo'shimcha izoh..."
                rows={2}
                {...register('notes')}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
              >
                Bekor qilish
              </Button>
              <Button type="submit" disabled={createLogMutation.isPending}>
                {createLogMutation.isPending && (
                  <LoadingSpinner size="sm" className="mr-2 h-4 w-4" />
                )}
                Saqlash
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
