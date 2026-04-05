import { useState, useCallback, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Plus,
  Package,
  TrendingUp,
  Hash,
  DollarSign,
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';
import type { Unit } from '@plastmassa/shared';
import { cn, formatCurrency, formatNumber } from '@/lib/utils';
import { useProduct } from '@/hooks/use-products';
import { useUnits } from '@/hooks/use-units';
import {
  useProductLotsByProduct,
  useProductCostHistory,
  useCreateProductLot,
} from '@/hooks/use-product-lots';
import { ProductLotQuery } from '@/api/product-lots';
import { toast } from '@/components/ui/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { DataTableWrapper } from '@/components/shared/data-table';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { ProductImage } from '@/components/shared/product-image';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

const lotSchema = z.object({
  quantity: z.coerce.number().positive('Miqdor 0 dan katta bo\'lishi kerak'),
  unit: z.string().min(1, 'O\'lchov birligini tanlang'),
  unitCost: z.coerce.number().min(0, 'Narx 0 dan kam bo\'lmasligi kerak'),
  supplier: z.string().optional(),
  notes: z.string().optional(),
});

type LotFormData = z.infer<typeof lotSchema>;

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const limit = 10;

  const debouncedSupplierSearch = useDebounce(supplierSearch, 300);

  const { data: product, isLoading: isLoadingProduct, isError } = useProduct(id || '');
  const { data: units } = useUnits();

  const lotsParams: ProductLotQuery = {
    page,
    limit,
    ...(debouncedSupplierSearch && { supplier: debouncedSupplierSearch }),
    ...(dateFrom && { dateFrom }),
    ...(dateTo && { dateTo }),
  };

  const { data: lotsData, isLoading: isLoadingLots } = useProductLotsByProduct(id || '', lotsParams);
  const { data: costHistory } = useProductCostHistory(id || '');
  const createLotMutation = useCreateProductLot();

  const lots = lotsData?.items || [];
  const totalPages = lotsData?.totalPages || 1;
  const totalLots = lotsData?.total || 0;

  const unitSymbol = useMemo(() => {
    if (!product) return '';
    if (typeof product.baseUnit === 'object' && product.baseUnit !== null) {
      return (product.baseUnit as Unit).symbol;
    }
    const unit = units?.find((u) => u._id === product.baseUnit);
    return unit?.symbol || '';
  }, [product, units]);

  const baseUnitId = useMemo(() => {
    if (!product) return '';
    if (typeof product.baseUnit === 'object' && product.baseUnit !== null) {
      return (product.baseUnit as Unit)._id;
    }
    return product.baseUnit as string;
  }, [product]);

  const totalLotsSum = useMemo(() => {
    if (!costHistory || costHistory.length === 0) return 0;
    return costHistory.reduce((sum, lot) => sum + lot.totalCost, 0);
  }, [costHistory]);

  const recentCosts = useMemo(() => {
    if (!costHistory) return [];
    return costHistory.slice(0, 10);
  }, [costHistory]);

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<LotFormData>({
    resolver: zodResolver(lotSchema),
    defaultValues: {
      quantity: undefined,
      unit: '',
      unitCost: undefined,
      supplier: '',
      notes: '',
    },
  });

  const watchQuantity = watch('quantity');
  const watchUnitCost = watch('unitCost');

  const calculatedTotal = useMemo(() => {
    return (Number(watchQuantity) || 0) * (Number(watchUnitCost) || 0);
  }, [watchQuantity, watchUnitCost]);

  const lastLotCost = useMemo(() => {
    if (!costHistory || costHistory.length === 0) return 0;
    return costHistory[costHistory.length - 1].unitCost;
  }, [costHistory]);

  useEffect(() => {
    if (product && baseUnitId) {
      reset((prev) => ({ ...prev, unit: baseUnitId }));
    }
  }, [product, baseUnitId, reset]);

  const openDialog = useCallback(() => {
    reset({
      quantity: undefined,
      unit: baseUnitId,
      unitCost: undefined,
      supplier: '',
      notes: '',
    });
    setDialogOpen(true);
  }, [reset, baseUnitId]);

  const onSubmit = useCallback(
    async (data: LotFormData) => {
      if (!id) return;
      try {
        await createLotMutation.mutateAsync({
          product: id,
          quantity: data.quantity,
          unit: data.unit,
          unitCost: data.unitCost,
          supplier: data.supplier || undefined,
          notes: data.notes || undefined,
        });
        toast({ title: 'Muvaffaqiyatli', description: 'Yangi kirim muvaffaqiyatli saqlandi' });
        setDialogOpen(false);
        reset();
      } catch {
        toast({ title: 'Xatolik', description: 'Kirimni saqlashda xatolik yuz berdi', variant: 'destructive' });
      }
    },
    [id, createLotMutation, reset],
  );

  if (isLoadingProduct) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 mb-4">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Mahsulot topilmadi</h2>
        <p className="text-sm text-muted-foreground mt-1">
          So'ralgan mahsulot mavjud emas yoki o'chirilgan
        </p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/products')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Mahsulotlarga qaytish
        </Button>
      </div>
    );
  }

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
          onClick={() => navigate('/products')}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Mahsulotlar
        </Button>
      </motion.div>

      {/* Product Info Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <ProductImage
              src={product.imageUrl}
              alt={product.name}
              className="h-14 w-14 shrink-0 rounded-2xl border border-indigo-500/20 bg-indigo-500/10"
              iconClassName="h-6 w-6 text-indigo-400"
            />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground">{product.name}</h1>
                <Badge variant={product.isActive ? 'success' : 'secondary'}>
                  {product.isActive ? 'Faol' : 'Nofaol'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                O'lchov birligi: {unitSymbol}
              </p>
            </div>
          </div>
          <Button onClick={openDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            Yangi kirim
          </Button>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Joriy zaxira"
          value={`${formatNumber(product.currentStock)} ${unitSymbol}`}
          icon={Package}
          iconColor="text-indigo-400"
          iconBg="bg-indigo-500/20"
          index={0}
        />
        <StatCard
          title="Oxirgi lot narxi"
          value={formatCurrency(lastLotCost)}
          icon={DollarSign}
          iconColor="text-emerald-400"
          iconBg="bg-emerald-500/20"
          index={1}
        />
        <StatCard
          title="Jami kirimlar soni"
          value={costHistory?.length ?? 0}
          icon={Hash}
          iconColor="text-purple-400"
          iconBg="bg-purple-500/20"
          index={2}
        />
        <StatCard
          title="Jami kirim summasi"
          value={formatCurrency(totalLotsSum)}
          icon={DollarSign}
          iconColor="text-cyan-400"
          iconBg="bg-cyan-500/20"
          index={3}
        />
      </div>

      {/* Cost Trend Section */}
      {recentCosts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-foreground">Narx tendensiyasi</h2>
            <span className="text-sm text-muted-foreground">(oxirgi 10 ta kirim)</span>
          </div>
          <div className="space-y-2">
            {recentCosts.map((lot, index) => {
              const prevLot = recentCosts[index + 1];
              let trend: 'up' | 'down' | 'same' = 'same';
              if (prevLot) {
                if (lot.unitCost > prevLot.unitCost) trend = 'up';
                else if (lot.unitCost < prevLot.unitCost) trend = 'down';
              }

              return (
                <div
                  key={lot._id}
                  className="flex items-center gap-4 py-2.5 px-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <span className="text-sm font-mono text-muted-foreground w-28 shrink-0">
                    {lot.lotNumber}
                  </span>
                  <span className="text-sm text-muted-foreground w-28 shrink-0">
                    {format(new Date(lot.createdAt), 'dd.MM.yyyy')}
                  </span>
                  <span className="text-sm text-foreground w-28 shrink-0">
                    {formatNumber(lot.quantity)} {unitSymbol}
                  </span>
                  <div className="flex items-center gap-1.5 w-36 shrink-0">
                    {trend === 'up' && <ArrowUpRight className="h-4 w-4 text-red-400" />}
                    {trend === 'down' && <ArrowDownRight className="h-4 w-4 text-green-400" />}
                    {trend === 'same' && <Minus className="h-4 w-4 text-muted-foreground" />}
                    <span
                      className={cn(
                        'text-sm font-medium',
                        trend === 'up' && 'text-red-400',
                        trend === 'down' && 'text-green-400',
                        trend === 'same' && 'text-muted-foreground',
                      )}
                    >
                      {formatCurrency(lot.unitCost)}
                    </span>
                  </div>
                  <span className="text-sm text-foreground ml-auto">
                    {formatCurrency(lot.totalCost)}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Lots History Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="space-y-4"
      >
        <h2 className="text-lg font-semibold text-foreground">Kirimlar tarixi</h2>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Yetkazuvchi bo'yicha qidirish..."
              value={supplierSearch}
              onChange={(e) => { setSupplierSearch(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="pl-9 w-40" />
            </div>
            <span className="text-muted-foreground">-</span>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="pl-9 w-40" />
            </div>
          </div>
        </div>

        {/* Table */}
        <DataTableWrapper
          isLoading={isLoadingLots}
          isEmpty={!isLoadingLots && lots.length === 0}
          emptyTitle="Kirimlar topilmadi"
          emptyDescription="Hozircha hech qanday kirim qayd etilmagan"
        >
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Lot #</TableHead>
                <TableHead>Sana</TableHead>
                <TableHead>Miqdor</TableHead>
                <TableHead>Qoldiq</TableHead>
                <TableHead className="hidden sm:table-cell">Manba</TableHead>
                <TableHead className="hidden sm:table-cell">Narx</TableHead>
                <TableHead>Jami</TableHead>
                <TableHead className="hidden md:table-cell">Yetkazuvchi</TableHead>
                <TableHead className="hidden lg:table-cell">Izoh</TableHead>
                <TableHead className="hidden md:table-cell">Kim</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lots.map((lot) => {
                const lotUnitSymbol =
                  typeof lot.unit === 'object' && lot.unit !== null
                    ? lot.unit.symbol
                    : unitSymbol;

                const createdByName =
                  typeof lot.createdBy === 'object' && lot.createdBy !== null
                    ? lot.createdBy.fullName
                    : '';

                return (
                  <TableRow key={lot._id}>
                    <TableCell className="font-mono text-sm">{lot.lotNumber}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(lot.createdAt), 'dd.MM.yyyy HH:mm')}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatNumber(lot.quantity)} {lotUnitSymbol}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatNumber(lot.quantityRemaining)} {lotUnitSymbol}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                        lot.source === 'PRODUCTION'
                          ? 'bg-purple-500/20 text-purple-300'
                          : 'bg-emerald-500/20 text-emerald-300'
                      )}>
                        {lot.source === 'PRODUCTION' ? 'Ishlab chiqarish' : 'Xarid'}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {formatCurrency(lot.unitCost)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(lot.totalCost)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {lot.supplier || '-'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground max-w-[200px] truncate">
                      {lot.notes || '-'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {createdByName || '-'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DataTableWrapper>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {(page - 1) * limit + 1}-{Math.min(page * limit, totalLots)} / {totalLots}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="h-8 w-8">
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
                      {showEllipsis && <span className="px-1 text-muted-foreground">...</span>}
                      <Button variant={page === p ? 'default' : 'outline'} size="icon" onClick={() => setPage(p)} className="h-8 w-8">{p}</Button>
                    </div>
                  );
                })}
              <Button variant="outline" size="icon" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="h-8 w-8">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </motion.div>

      {/* New Lot Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Yangi mahsulot kirimi</DialogTitle>
            <DialogDescription>
              {product.name} uchun yangi kirim ma'lumotlarini kiriting
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Quantity */}
            <div className="space-y-2">
              <Label htmlFor="quantity">Miqdor <span className="text-destructive">*</span></Label>
              <Input id="quantity" type="number" step="any" min={0} placeholder="0" {...register('quantity')} />
              {errors.quantity && <p className="text-xs text-destructive">{errors.quantity.message}</p>}
            </div>

            {/* Unit */}
            <div className="space-y-2">
              <Label>O'lchov birligi <span className="text-destructive">*</span></Label>
              <Controller
                name="unit"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="O'lchov birligini tanlang" />
                    </SelectTrigger>
                    <SelectContent>
                      {units?.map((unit) => (
                        <SelectItem key={unit._id} value={unit._id}>
                          {unit.name} ({unit.symbol})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.unit && <p className="text-xs text-destructive">{errors.unit.message}</p>}
            </div>

            {/* Unit Cost */}
            <div className="space-y-2">
              <Label htmlFor="unitCost">Narx (birlik uchun) <span className="text-destructive">*</span></Label>
              <Input id="unitCost" type="number" step="any" min={0} placeholder="0" {...register('unitCost')} />
              {errors.unitCost && <p className="text-xs text-destructive">{errors.unitCost.message}</p>}
            </div>

            {/* Total */}
            <div className="space-y-2">
              <Label>Jami</Label>
              <div className="flex items-center h-10 px-3 rounded-xl border border-input bg-muted/50 text-sm font-medium text-foreground">
                {formatCurrency(calculatedTotal)}
              </div>
            </div>

            {/* Supplier */}
            <div className="space-y-2">
              <Label htmlFor="supplier">Yetkazuvchi</Label>
              <Input id="supplier" placeholder="Yetkazuvchi nomi" {...register('supplier')} />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Izoh</Label>
              <Textarea id="notes" placeholder="Qo'shimcha ma'lumot..." {...register('notes')} />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Bekor qilish</Button>
              <Button type="submit" disabled={createLotMutation.isPending}>
                {createLotMutation.isPending && <LoadingSpinner size="sm" className="mr-2 h-4 w-4" />}
                Kirimni saqlash
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
