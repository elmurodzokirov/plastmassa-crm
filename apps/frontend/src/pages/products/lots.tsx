import { useState, useCallback, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import {
  Plus,
  Package,
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { Unit } from '@plastmassa/shared';
import { cn, formatCurrency, formatNumber } from '@/lib/utils';
import { useProducts } from '@/hooks/use-products';
import { useProductLots, useCreateProductLot } from '@/hooks/use-product-lots';
import { useUnits } from '@/hooks/use-units';
import { ProductLotQuery } from '@/api/product-lots';
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

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

const lotSchema = z.object({
  product: z.string().min(1, 'Mahsulotni tanlang'),
  quantity: z.coerce.number().positive('Miqdor 0 dan katta bo\'lishi kerak'),
  unit: z.string().min(1, 'O\'lchov birligini tanlang'),
  unitCost: z.coerce.number().min(0, 'Narx 0 dan kam bo\'lmasligi kerak'),
  supplier: z.string().optional(),
  notes: z.string().optional(),
});

type LotFormData = z.infer<typeof lotSchema>;

export default function ProductLotsPage() {
  const [page, setPage] = useState(1);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const limit = 10;

  const debouncedSupplierSearch = useDebounce(supplierSearch, 300);

  const queryParams: ProductLotQuery = {
    page,
    limit,
    ...(debouncedSupplierSearch && { supplier: debouncedSupplierSearch }),
    ...(productFilter && { product: productFilter }),
    ...(dateFrom && { dateFrom }),
    ...(dateTo && { dateTo }),
  };

  const { data: lotsData, isLoading } = useProductLots(queryParams);
  const { data: productsData } = useProducts({ limit: 100 });
  const { data: units } = useUnits();
  const createLotMutation = useCreateProductLot();

  const lots = lotsData?.items || [];
  const totalPages = lotsData?.totalPages || 1;
  const totalCount = lotsData?.total || 0;
  const products = productsData?.items || [];

  const totalSum = useMemo(() => lots.reduce((sum, l) => sum + l.totalCost, 0), [lots]);

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
      product: '',
      quantity: undefined,
      unit: '',
      unitCost: undefined,
      supplier: '',
      notes: '',
    },
  });

  const watchProduct = watch('product');
  const watchQuantity = watch('quantity');
  const watchUnitCost = watch('unitCost');

  const selectedProduct = useMemo(
    () => products.find((p) => p._id === watchProduct),
    [products, watchProduct],
  );

  const calculatedTotal = useMemo(() => {
    return (Number(watchQuantity) || 0) * (Number(watchUnitCost) || 0);
  }, [watchQuantity, watchUnitCost]);

  // Set default unit when product is selected
  useEffect(() => {
    if (selectedProduct) {
      const baseUnitId =
        typeof selectedProduct.baseUnit === 'object' && selectedProduct.baseUnit !== null
          ? (selectedProduct.baseUnit as Unit)._id
          : (selectedProduct.baseUnit as string);
      reset((prev) => ({ ...prev, unit: baseUnitId }));
    }
  }, [selectedProduct, reset]);

  const openDialog = useCallback(() => {
    reset({
      product: '',
      quantity: undefined,
      unit: '',
      unitCost: undefined,
      supplier: '',
      notes: '',
    });
    setDialogOpen(true);
  }, [reset]);

  const onSubmit = useCallback(
    async (data: LotFormData) => {
      try {
        await createLotMutation.mutateAsync({
          product: data.product,
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
    [createLotMutation, reset],
  );

  const getUnitSymbol = (lot: any): string => {
    if (typeof lot.unit === 'object' && lot.unit !== null) return lot.unit.symbol;
    return '';
  };

  const getProductName = (lot: any): string => {
    if (typeof lot.product === 'object' && lot.product !== null) return lot.product.name;
    return '';
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mahsulot kirimlari</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Jami {totalCount} ta kirim
          </p>
        </div>
        <Button onClick={openDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          Yangi kirim
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          title="Jami kirimlar soni"
          value={totalCount}
          icon={Package}
          iconColor="text-indigo-400"
          iconBg="bg-indigo-500/20"
          index={0}
        />
        <StatCard
          title="Sahifadagi jami summa"
          value={formatCurrency(totalSum)}
          icon={Package}
          iconColor="text-emerald-400"
          iconBg="bg-emerald-500/20"
          index={1}
        />
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center flex-wrap"
      >
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Yetkazuvchi bo'yicha qidirish..."
            value={supplierSearch}
            onChange={(e) => { setSupplierSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select
          value={productFilter}
          onValueChange={(val) => { setProductFilter(val === 'all' ? '' : val); setPage(1); }}
        >
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder="Barcha mahsulotlar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barcha mahsulotlar</SelectItem>
            {products.map((p) => (
              <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
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
      </motion.div>

      {/* Table */}
      <DataTableWrapper
        isLoading={isLoading}
        isEmpty={!isLoading && lots.length === 0}
        emptyTitle="Kirimlar topilmadi"
        emptyDescription="Hozircha hech qanday kirim qayd etilmagan"
      >
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Lot #</TableHead>
              <TableHead>Mahsulot</TableHead>
              <TableHead className="hidden sm:table-cell">Sana</TableHead>
              <TableHead>Miqdor</TableHead>
              <TableHead>Qoldiq</TableHead>
              <TableHead className="hidden sm:table-cell">Manba</TableHead>
              <TableHead className="hidden sm:table-cell">Narx</TableHead>
              <TableHead>Jami</TableHead>
              <TableHead className="hidden md:table-cell">Yetkazuvchi</TableHead>
              <TableHead className="hidden lg:table-cell">Kim</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lots.map((lot) => (
              <TableRow key={lot._id}>
                <TableCell className="font-mono text-sm">{lot.lotNumber}</TableCell>
                <TableCell className="font-medium">{getProductName(lot)}</TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground">
                  {format(new Date(lot.createdAt), 'dd.MM.yyyy HH:mm')}
                </TableCell>
                <TableCell className="font-medium">
                  {formatNumber(lot.quantity)} {getUnitSymbol(lot)}
                </TableCell>
                <TableCell className="font-medium">
                  {formatNumber(lot.quantityRemaining)} {getUnitSymbol(lot)}
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
                <TableCell className="font-medium">{formatCurrency(lot.totalCost)}</TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">
                  {lot.supplier || '-'}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-muted-foreground">
                  {typeof lot.createdBy === 'object' && lot.createdBy !== null
                    ? lot.createdBy.fullName
                    : '-'}
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

      {/* New Lot Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Yangi mahsulot kirimi</DialogTitle>
            <DialogDescription>Yangi kirim ma'lumotlarini kiriting</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Product Select */}
            <div className="space-y-2">
              <Label>Mahsulot <span className="text-destructive">*</span></Label>
              <Controller
                name="product"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Mahsulotni tanlang" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.product && <p className="text-xs text-destructive">{errors.product.message}</p>}
            </div>

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
                        <SelectItem key={unit._id} value={unit._id}>{unit.name} ({unit.symbol})</SelectItem>
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
