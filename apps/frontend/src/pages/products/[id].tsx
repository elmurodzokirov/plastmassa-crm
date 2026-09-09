import { useState, useCallback, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
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
  ClipboardList,
  X,
  Percent,
  Pencil,
} from 'lucide-react';
import type { Unit, Supplier } from '@plastmassa/shared';
import { cn, formatCurrency, formatNumber } from '@/lib/utils';
import { useProduct } from '@/hooks/use-products';
import { useUnits } from '@/hooks/use-units';
import {
  useProductLotsByProduct,
  useProductCostHistory,
  useCreateProductLot,
} from '@/hooks/use-product-lots';
import { ProductLotQuery } from '@/api/product-lots';
import { useMaterials } from '@/hooks/use-materials';
import { useSuppliers } from '@/hooks/use-suppliers';
import { useActiveRecipe, usePlannedCost, useUpsertRecipe } from '@/hooks/use-recipes';
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
  paidAmount: z.coerce.number().min(0, 'Summa 0 dan kam bo\'lmasligi kerak').optional(),
  notes: z.string().optional(),
});

type LotFormData = z.infer<typeof lotSchema>;

const recipeItemSchema = z.object({
  material: z.string().min(1, 'Xom-ashyoni tanlang'),
  quantityPerUnit: z.coerce.number().min(0.0001, 'Miqdor 0 dan katta bo\'lishi kerak'),
  wastagePercent: z.coerce.number().min(0).max(100).optional(),
});

const recipeSchema = z.object({
  items: z.array(recipeItemSchema).min(1, 'Kamida bitta xom-ashyo qo\'shilishi kerak'),
  laborCostPerUnit: z.coerce.number().min(0).optional(),
  overheadPercent: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

type RecipeFormData = z.infer<typeof recipeSchema>;

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const limit = 10;

  const { data: product, isLoading: isLoadingProduct, isError } = useProduct(id || '');
  const { data: units } = useUnits();
  const { data: suppliersData } = useSuppliers({ limit: 200, isActive: true });
  const suppliers = suppliersData?.items || [];

  const lotsParams: ProductLotQuery = {
    page,
    limit,
    ...(supplierFilter !== 'all' && { supplier: supplierFilter }),
    ...(dateFrom && { dateFrom }),
    ...(dateTo && { dateTo }),
  };

  const { data: lotsData, isLoading: isLoadingLots } = useProductLotsByProduct(id || '', lotsParams);
  const { data: costHistory } = useProductCostHistory(id || '');
  const createLotMutation = useCreateProductLot();

  const [recipeDialogOpen, setRecipeDialogOpen] = useState(false);
  const { data: materialsData } = useMaterials({ limit: 200, isActive: true });
  const { data: activeRecipe, isLoading: isLoadingRecipe } = useActiveRecipe(id || '');
  const { data: plannedCost } = usePlannedCost(id || '');
  const upsertRecipeMutation = useUpsertRecipe();
  const materials = materialsData?.items || [];

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
      supplier: 'none',
      paidAmount: undefined,
      notes: '',
    },
  });

  const watchQuantity = watch('quantity');
  const watchUnitCost = watch('unitCost');
  const watchSupplier = watch('supplier');

  const calculatedTotal = useMemo(() => {
    return (Number(watchQuantity) || 0) * (Number(watchUnitCost) || 0);
  }, [watchQuantity, watchUnitCost]);

  const lastLotCost = useMemo(() => {
    if (!costHistory || costHistory.length === 0) return 0;
    return costHistory[costHistory.length - 1].unitCost;
  }, [costHistory]);

  // Weighted-average cost of the stock currently remaining, computed FIFO-style
  // from the still-open lots (quantityRemaining > 0)
  const fifoAverageCost = useMemo(() => {
    if (!costHistory || costHistory.length === 0) return 0;
    let totalQty = 0;
    let totalValue = 0;
    for (const lot of costHistory) {
      if (lot.quantityRemaining > 0) {
        totalQty += lot.quantityRemaining;
        totalValue += lot.quantityRemaining * lot.unitCost;
      }
    }
    return totalQty > 0 ? totalValue / totalQty : 0;
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
      supplier: 'none',
      paidAmount: undefined,
      notes: '',
    });
    setDialogOpen(true);
  }, [reset, baseUnitId]);

  const onSubmit = useCallback(
    async (data: LotFormData) => {
      if (!id) return;
      const hasSupplier = !!(data.supplier && data.supplier !== 'none');
      try {
        await createLotMutation.mutateAsync({
          product: id,
          quantity: data.quantity,
          unit: data.unit,
          unitCost: data.unitCost,
          supplier: hasSupplier ? data.supplier : undefined,
          paidAmount: hasSupplier && data.paidAmount ? data.paidAmount : undefined,
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

  const {
    register: registerRecipe,
    handleSubmit: handleSubmitRecipe,
    reset: resetRecipe,
    control: recipeControl,
    formState: { errors: recipeErrors },
  } = useForm<RecipeFormData>({
    resolver: zodResolver(recipeSchema),
    defaultValues: { items: [], laborCostPerUnit: 0, overheadPercent: 0, notes: '' },
  });

  const { fields: recipeFields, append: appendRecipeItem, remove: removeRecipeItem } = useFieldArray({
    control: recipeControl,
    name: 'items',
  });

  const openRecipeDialog = useCallback(() => {
    if (activeRecipe) {
      resetRecipe({
        items: activeRecipe.items.map((item) => ({
          material: typeof item.material === 'object' ? item.material._id : item.material,
          quantityPerUnit: item.quantityPerUnit,
          wastagePercent: item.wastagePercent || 0,
        })),
        laborCostPerUnit: activeRecipe.laborCostPerUnit || (product as any)?.pieceRate || 0,
        overheadPercent: activeRecipe.overheadPercent || 0,
        notes: activeRecipe.notes || '',
      });
    } else {
      resetRecipe({
        items: [{ material: '', quantityPerUnit: 1, wastagePercent: 0 }],
        laborCostPerUnit: (product as any)?.pieceRate || 0,
        overheadPercent: 0,
        notes: '',
      });
    }
    setRecipeDialogOpen(true);
  }, [activeRecipe, resetRecipe, product]);

  const onSubmitRecipe = useCallback(
    async (data: RecipeFormData) => {
      if (!id) return;
      try {
        await upsertRecipeMutation.mutateAsync({
          product: id,
          items: data.items.map((item) => ({
            material: item.material,
            quantityPerUnit: item.quantityPerUnit,
            wastagePercent: item.wastagePercent || 0,
          })),
          laborCostPerUnit: data.laborCostPerUnit || 0,
          overheadPercent: data.overheadPercent || 0,
          notes: data.notes || undefined,
        });
        toast({ title: 'Muvaffaqiyatli', description: 'Retsept muvaffaqiyatli saqlandi' });
        setRecipeDialogOpen(false);
      } catch {
        toast({ title: 'Xatolik', description: 'Retseptni saqlashda xatolik yuz berdi', variant: 'destructive' });
      }
    },
    [id, upsertRecipeMutation],
  );

  // Margin analysis: prefer the actual FIFO average cost of stock on hand; fall back
  // to the recipe's theoretical planned cost when there's no stock history yet.
  const effectiveCost = fifoAverageCost > 0 ? fifoAverageCost : (plannedCost?.totalCost ?? 0);
  const marginPercent = product && product.price > 0 && effectiveCost > 0
    ? ((product.price - effectiveCost) / product.price) * 100
    : null;

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Joriy zaxira"
          value={`${formatNumber(product.currentStock)} ${unitSymbol}`}
          icon={Package}
          iconColor="text-indigo-400"
          iconBg="bg-indigo-500/20"
          index={0}
        />
        <StatCard
          title="Joriy o'rtacha tannarx (FIFO)"
          value={formatCurrency(fifoAverageCost)}
          icon={TrendingUp}
          iconColor="text-amber-400"
          iconBg="bg-amber-500/20"
          index={1}
        />
        <StatCard
          title="Oxirgi lot narxi"
          value={formatCurrency(lastLotCost)}
          icon={DollarSign}
          iconColor="text-emerald-400"
          iconBg="bg-emerald-500/20"
          index={2}
        />
        <StatCard
          title="Jami kirimlar soni"
          value={costHistory?.length ?? 0}
          icon={Hash}
          iconColor="text-purple-400"
          iconBg="bg-purple-500/20"
          index={3}
        />
        <StatCard
          title="Jami kirim summasi"
          value={formatCurrency(totalLotsSum)}
          icon={DollarSign}
          iconColor="text-cyan-400"
          iconBg="bg-cyan-500/20"
          index={4}
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

      {/* Recipe (BOM) & Cost Calculation Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-foreground">Retsept va kalkulyatsiya</h2>
            {activeRecipe && (
              <span className="text-sm text-muted-foreground">(v{activeRecipe.version})</span>
            )}
          </div>
          <Button onClick={openRecipeDialog} variant="outline" size="sm" className="gap-2">
            <Pencil className="h-3.5 w-3.5" />
            {activeRecipe ? 'Retseptni tahrirlash' : 'Retsept qo\'shish'}
          </Button>
        </div>

        {!isLoadingRecipe && !activeRecipe && (
          <p className="text-sm text-muted-foreground py-4">
            Bu mahsulot uchun hali retsept (xom-ashyo tarkibi) belgilanmagan. Retsept qo'shilsa,
            tannarx xom-ashyo narxlaridan avtomatik hisoblanadi va ishlab chiqarishda xom-ashyo
            zaxirasi to'g'ri kamayadi.
          </p>
        )}

        {activeRecipe && plannedCost && (
          <>
            <div className="rounded-xl border border-border/60 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Xom-ashyo</TableHead>
                    <TableHead>Miqdor (1 dona uchun)</TableHead>
                    <TableHead className="hidden sm:table-cell">Isrof %</TableHead>
                    <TableHead className="hidden sm:table-cell">Joriy narx</TableHead>
                    <TableHead>Tannarxdagi ulushi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plannedCost.items.map((item) => (
                    <TableRow key={item.material}>
                      <TableCell className="font-medium">{item.materialName}</TableCell>
                      <TableCell>{formatNumber(item.quantityPerUnit)}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">{item.wastagePercent}%</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">{formatCurrency(item.unitCost)}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(item.cost)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Xom-ashyo narxi</p>
                <p className="text-sm font-semibold text-foreground mt-1">{formatCurrency(plannedCost.materialCost)}</p>
              </div>
              <div className="rounded-xl bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Ishbay narxi</p>
                <p className="text-sm font-semibold text-foreground mt-1">{formatCurrency(plannedCost.laborCost)}</p>
              </div>
              <div className="rounded-xl bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Ustama xarajat</p>
                <p className="text-sm font-semibold text-foreground mt-1">{formatCurrency(plannedCost.overheadCost)}</p>
              </div>
              <div className="rounded-xl bg-indigo-500/10 p-3 border border-indigo-500/20">
                <p className="text-xs text-muted-foreground">Rejalashtirilgan tannarx</p>
                <p className="text-sm font-semibold text-indigo-300 mt-1">{formatCurrency(plannedCost.totalCost)}</p>
              </div>
            </div>
          </>
        )}

        {marginPercent !== null && (
          <div className={cn(
            'flex items-center gap-3 rounded-xl p-4 border',
            marginPercent < 0
              ? 'bg-destructive/10 border-destructive/30'
              : 'bg-emerald-500/10 border-emerald-500/20',
          )}>
            {marginPercent < 0 ? (
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            ) : (
              <Percent className="h-5 w-5 text-emerald-400 shrink-0" />
            )}
            <div>
              <p className={cn('text-sm font-medium', marginPercent < 0 ? 'text-destructive' : 'text-emerald-300')}>
                {marginPercent < 0
                  ? `Diqqat: sotuv narxi tannarxdan past! Marja: ${formatNumber(marginPercent)}%`
                  : `Foyda marjasi: ${formatNumber(marginPercent)}%`}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sotuv narxi: {formatCurrency(product.price)} · Tannarx: {formatCurrency(effectiveCost)}
                {fifoAverageCost > 0 ? ' (FIFO haqiqiy)' : ' (retsept bo\'yicha rejalashtirilgan)'}
              </p>
            </div>
          </div>
        )}
      </motion.div>

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
          <Select
            value={supplierFilter}
            onValueChange={(value) => { setSupplierFilter(value); setPage(1); }}
          >
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue placeholder="Yetkazib beruvchi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Barcha yetkazib beruvchilar</SelectItem>
              {suppliers.map((s) => (
                <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                        lot.source === 'PRODUCTION' && 'bg-purple-500/20 text-purple-300',
                        lot.source === 'ADJUSTMENT' && 'bg-amber-500/20 text-amber-300',
                        lot.source === 'PURCHASE' && 'bg-emerald-500/20 text-emerald-300',
                      )}>
                        {lot.source === 'PRODUCTION' && 'Ishlab chiqarish'}
                        {lot.source === 'ADJUSTMENT' && 'Tuzatish'}
                        {lot.source === 'PURCHASE' && 'Xarid'}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {formatCurrency(lot.unitCost)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(lot.totalCost)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {typeof lot.supplier === 'object' && lot.supplier !== null
                        ? lot.supplier.name
                        : suppliers.find((s) => s._id === lot.supplier)?.name || '-'}
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
              <Label>Yetkazib beruvchi</Label>
              <Controller
                name="supplier"
                control={control}
                render={({ field }) => (
                  <Select value={field.value || 'none'} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Yetkazib beruvchini tanlang" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Tanlanmagan</SelectItem>
                      {suppliers.map((s) => (
                        <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-xs text-muted-foreground">
                Yetkazib beruvchi tanlansa, kirim summasi unga qarz sifatida yoziladi
              </p>
            </div>

            {watchSupplier && watchSupplier !== 'none' && (
              <div className="space-y-2">
                <Label htmlFor="paidAmount">Darhol to'langan summa (naqd)</Label>
                <Input
                  id="paidAmount"
                  type="number"
                  step="any"
                  min={0}
                  max={calculatedTotal || undefined}
                  placeholder="0"
                  {...register('paidAmount')}
                />
                {errors.paidAmount && <p className="text-xs text-destructive">{errors.paidAmount.message}</p>}
                <p className="text-xs text-muted-foreground">
                  To'ldirilsa, shu summa kassadan darhol yechiladi va faqat qoldiq qarzga yoziladi. Bo'sh qoldirilsa, jami summa qarzga yoziladi.
                </p>
              </div>
            )}

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

      {/* Recipe (BOM) Dialog */}
      <Dialog open={recipeDialogOpen} onOpenChange={setRecipeDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Retsept (xom-ashyo tarkibi)</DialogTitle>
            <DialogDescription>
              {product.name} — 1 dona/birlik ishlab chiqarish uchun kerakli xom-ashyolarni belgilang
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitRecipe(onSubmitRecipe)} className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Xom-ashyolar <span className="text-destructive">*</span></Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendRecipeItem({ material: '', quantityPerUnit: 1, wastagePercent: 0 })}
                className="gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Qo'shish
              </Button>
            </div>

            {recipeErrors.items?.message && (
              <p className="text-xs text-destructive">{recipeErrors.items.message}</p>
            )}

            {recipeFields.map((field, index) => (
              <div key={field.id} className="bg-muted/30 rounded-xl p-4 space-y-3 relative">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeRecipeItem(index)}
                  className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pr-8">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Xom-ashyo</Label>
                    <Controller
                      name={`items.${index}.material`}
                      control={recipeControl}
                      render={({ field: selectField }) => (
                        <Select value={selectField.value} onValueChange={selectField.onChange}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Tanlang" />
                          </SelectTrigger>
                          <SelectContent>
                            {materials.map((m) => (
                              <SelectItem key={m._id} value={m._id}>{m.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {recipeErrors.items?.[index]?.material && (
                      <p className="text-xs text-destructive">{recipeErrors.items[index]?.material?.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Miqdor (1 dona uchun)</Label>
                    <Input type="number" min={0.0001} step="any" placeholder="1" className="h-9" {...registerRecipe(`items.${index}.quantityPerUnit`)} />
                    {recipeErrors.items?.[index]?.quantityPerUnit && (
                      <p className="text-xs text-destructive">{recipeErrors.items[index]?.quantityPerUnit?.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Isrof %</Label>
                    <Input type="number" min={0} max={100} step="any" placeholder="0" className="h-9" {...registerRecipe(`items.${index}.wastagePercent`)} />
                  </div>
                </div>
              </div>
            ))}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="laborCostPerUnit">Ishbay narxi (birlik uchun)</Label>
                <Input id="laborCostPerUnit" type="number" min={0} step="any" placeholder="0" {...registerRecipe('laborCostPerUnit')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="overheadPercent">Ustama xarajat %</Label>
                <Input id="overheadPercent" type="number" min={0} step="any" placeholder="0" {...registerRecipe('overheadPercent')} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipeNotes">Izoh</Label>
              <Textarea id="recipeNotes" placeholder="Qo'shimcha ma'lumot..." {...registerRecipe('notes')} />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setRecipeDialogOpen(false)}>Bekor qilish</Button>
              <Button type="submit" disabled={upsertRecipeMutation.isPending}>
                {upsertRecipeMutation.isPending && <LoadingSpinner size="sm" className="mr-2 h-4 w-4" />}
                Retseptni saqlash
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
