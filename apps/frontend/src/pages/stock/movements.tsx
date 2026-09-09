import { useState, useCallback, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  ArrowDownToLine,
  ArrowUpFromLine,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Download,
  ClipboardList,
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { Product, Unit, User, StockMovementType } from '@plastmassa/shared';
import { cn, exportToCsv, formatNumber } from '@/lib/utils';
import { useStockMovements, useCreateStockMovement } from '@/hooks/use-stock';
import { useProducts } from '@/hooks/use-products';
import { useUnits } from '@/hooks/use-units';
import { StockMovementQuery } from '@/api/stock';
import { toast } from '@/components/ui/use-toast';
import { StockTakeDialog } from './stock-take-dialog';

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

import { DataTableWrapper } from '@/components/shared/data-table';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

const movementSchema = z.object({
  type: z.enum(['IN', 'OUT', 'ADJUSTMENT'], {
    required_error: 'Turini tanlang',
  }),
  product: z.string().min(1, 'Mahsulotni tanlang'),
  quantity: z.coerce.number().min(0.001, 'Miqdor 0 dan katta bo\'lishi kerak'),
  unit: z.string().min(1, 'Birlikni tanlang'),
  reasonPreset: z.string().min(1, 'Sababni tanlang'),
  reasonDetail: z.string().optional(),
}).refine(
  (data) => data.reasonPreset !== '__other__' || !!data.reasonDetail?.trim(),
  { message: 'Sababni kiriting', path: ['reasonDetail'] },
);

type MovementFormData = z.infer<typeof movementSchema>;

const OTHER_REASON = '__other__';

const REASON_PRESETS: Record<StockMovementType, { value: string; label: string }[]> = {
  IN: [
    { value: 'Xarid', label: 'Xarid' },
    { value: 'Qaytarish', label: 'Mijozdan qaytarish' },
    { value: 'Omborlararo ko\'chirish', label: 'Omborlararo ko\'chirish' },
    { value: OTHER_REASON, label: 'Boshqa' },
  ],
  OUT: [
    { value: 'Sotuv', label: 'Sotuv' },
    { value: 'Brak', label: 'Brak/yaroqsiz' },
    { value: 'Omborlararo ko\'chirish', label: 'Omborlararo ko\'chirish' },
    { value: 'Ichki ehtiyoj', label: 'Ichki ehtiyoj uchun sarf' },
    { value: OTHER_REASON, label: 'Boshqa' },
  ],
  ADJUSTMENT: [
    { value: 'Inventarizatsiya natijasida tuzatish', label: 'Inventarizatsiya natijasida tuzatish' },
    { value: 'Hisoblash xatosi', label: 'Hisoblash xatosini tuzatish' },
    { value: OTHER_REASON, label: 'Boshqa' },
  ],
};

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

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('uz-UZ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getTypeBadge(type: StockMovementType) {
  switch (type) {
    case 'IN':
      return (
        <Badge variant="success" className="gap-1">
          <ArrowDownToLine className="h-3 w-3" />
          Kirim
        </Badge>
      );
    case 'OUT':
      return (
        <Badge variant="destructive" className="gap-1">
          <ArrowUpFromLine className="h-3 w-3" />
          Chiqim
        </Badge>
      );
    case 'ADJUSTMENT':
      return (
        <Badge variant="warning" className="gap-1">
          <RefreshCw className="h-3 w-3" />
          Tuzatish
        </Badge>
      );
    default:
      return <Badge variant="secondary">{type}</Badge>;
  }
}

export default function StockMovementsPage() {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const limit = 10;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [stockTakeOpen, setStockTakeOpen] = useState(false);

  const queryParams: StockMovementQuery = {
    page,
    limit,
    ...(typeFilter !== 'all' && { type: typeFilter }),
    ...(productFilter !== 'all' && { product: productFilter }),
    ...(dateFrom && { dateFrom }),
    ...(dateTo && { dateTo }),
    sortBy: 'createdAt',
    sortOrder: 'desc',
  };

  const { data: movementsData, isLoading: isLoadingMovements } = useStockMovements(queryParams);
  const { data: productsData } = useProducts({ limit: 100 });
  const { data: units } = useUnits();
  const createMutation = useCreateStockMovement();

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<MovementFormData>({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      type: 'IN',
      product: '',
      quantity: 0,
      unit: '',
      reasonPreset: '',
      reasonDetail: '',
    },
  });

  const watchProduct = watch('product');
  const watchType = watch('type');
  const watchReasonPreset = watch('reasonPreset');

  const products = productsData?.items || [];
  const movements = movementsData?.items || [];
  const totalPages = movementsData?.totalPages || 1;
  const totalCount = movementsData?.total || 0;

  // Auto-fill unit when product is selected
  useEffect(() => {
    if (watchProduct) {
      const product = products.find((p) => p._id === watchProduct);
      if (product) {
        const unitId =
          typeof product.baseUnit === 'object' && product.baseUnit !== null
            ? (product.baseUnit as Unit)._id
            : (product.baseUnit as string);
        setValue('unit', unitId);
      }
    }
  }, [watchProduct, products, setValue]);

  // Reset reason preset when movement type changes (presets differ per type)
  useEffect(() => {
    setValue('reasonPreset', '');
    setValue('reasonDetail', '');
  }, [watchType, setValue]);

  const getItemName = (movement: any): string => {
    if (movement.product) {
      if (typeof movement.product === 'object' && movement.product !== null) {
        return (movement.product as Product).name;
      }
      const product = products.find((p) => p._id === movement.product);
      return product?.name || 'Noma\'lum mahsulot';
    }
    return '-';
  };

  const getUnitSymbol = (movement: any): string => {
    if (typeof movement.unit === 'object' && movement.unit !== null) {
      return (movement.unit as Unit).symbol;
    }
    const unit = units?.find((u) => u._id === movement.unit);
    return unit?.symbol || '';
  };

  const getCreatedByName = (movement: any): string => {
    if (typeof movement.createdBy === 'object' && movement.createdBy !== null) {
      return (movement.createdBy as User).fullName;
    }
    return '-';
  };

  const openCreateDialog = useCallback(() => {
    reset({
      type: 'IN',
      product: '',
      quantity: 0,
      unit: '',
      reasonPreset: '',
      reasonDetail: '',
    });
    setDialogOpen(true);
  }, [reset]);

  const onSubmit = useCallback(
    async (data: MovementFormData) => {
      try {
        const reason =
          data.reasonPreset === OTHER_REASON
            ? data.reasonDetail!.trim()
            : data.reasonDetail?.trim()
              ? `${data.reasonPreset} — ${data.reasonDetail.trim()}`
              : data.reasonPreset;

        const payload: any = {
          type: data.type,
          product: data.product,
          quantity: data.quantity,
          unit: data.unit,
          reason,
        };

        await createMutation.mutateAsync(payload);
        toast({
          title: 'Muvaffaqiyatli',
          description: 'Yangi ombor harakati muvaffaqiyatli yaratildi',
        });
        setDialogOpen(false);
        reset();
      } catch {
        toast({
          title: 'Xatolik',
          description: 'Amalni bajarishda xatolik yuz berdi',
          variant: 'destructive',
        });
      }
    },
    [createMutation, reset],
  );

  const handleExportCsv = useCallback(() => {
    exportToCsv(
      `ombor-harakatlari-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Sana', 'Turi', 'Mahsulot', 'Miqdor', 'Birlik', 'Sabab', 'Kim tomonidan'],
      movements.map((m) => [
        formatDate(m.createdAt),
        m.type,
        getItemName(m),
        m.quantity,
        getUnitSymbol(m),
        m.reason,
        getCreatedByName(m),
      ]),
    );
  }, [movements]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ombor harakatlari</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Jami {totalCount} ta harakat
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleExportCsv} className="gap-2">
            <Download className="h-4 w-4" />
            Eksport
          </Button>
          <Button variant="outline" onClick={() => setStockTakeOpen(true)} className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Inventarizatsiya
          </Button>
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            Yangi harakat
          </Button>
        </div>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
      >
        <Select
          value={typeFilter}
          onValueChange={(value) => {
            setTypeFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Turi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Hammasi</SelectItem>
            <SelectItem value="IN">Kirim</SelectItem>
            <SelectItem value="OUT">Chiqim</SelectItem>
            <SelectItem value="ADJUSTMENT">Tuzatish</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={productFilter}
          onValueChange={(value) => {
            setProductFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Mahsulot" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barcha mahsulotlar</SelectItem>
            {products.map((product) => (
              <SelectItem key={product._id} value={product._id}>
                {product.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            placeholder="Boshlanish sanasi"
            className="pl-9"
          />
        </div>

        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            placeholder="Tugash sanasi"
            className="pl-9"
          />
        </div>
      </motion.div>

      {/* Movements Table */}
      <DataTableWrapper
        isLoading={isLoadingMovements}
        isEmpty={!isLoadingMovements && movements.length === 0}
        emptyTitle="Harakatlar topilmadi"
        emptyDescription="Hozircha hech qanday ombor harakati qayd etilmagan"
      >
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Sana</TableHead>
              <TableHead>Turi</TableHead>
              <TableHead>Mahsulot</TableHead>
              <TableHead className="hidden sm:table-cell">Miqdor</TableHead>
              <TableHead className="hidden md:table-cell">Sabab</TableHead>
              <TableHead className="hidden lg:table-cell">Kim tomonidan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements.map((movement) => {
              const unitSymbol = getUnitSymbol(movement);

              return (
                <TableRow key={movement._id}>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {formatDate(movement.createdAt)}
                  </TableCell>
                  <TableCell>{getTypeBadge(movement.type)}</TableCell>
                  <TableCell className="font-medium">
                    {getItemName(movement)}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell font-medium">
                    {movement.quantity} {unitSymbol}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    <span className="max-w-[200px] truncate block">
                      {movement.reason}
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">
                    {getCreatedByName(movement)}
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

      {/* Create Movement Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Yangi ombor harakati</DialogTitle>
            <DialogDescription>
              Kirim, chiqim yoki tuzatish harakatini qayd eting
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>
                Harakat turi <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Turini tanlang" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IN">Kirim</SelectItem>
                      <SelectItem value="OUT">Chiqim</SelectItem>
                      <SelectItem value="ADJUSTMENT">Tuzatish</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.type && (
                <p className="text-xs text-destructive">{errors.type.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>
                Mahsulot <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="product"
                control={control}
                render={({ field }) => (
                  <Select value={field.value || ''} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Mahsulotni tanlang" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product._id} value={product._id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.product && (
                <p className="text-xs text-destructive">{errors.product.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">
                  Miqdor <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  min={0.001}
                  step="any"
                  placeholder="0"
                  {...register('quantity')}
                />
                {errors.quantity && (
                  <p className="text-xs text-destructive">{errors.quantity.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>
                  Birlik <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="unit"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Birlik" />
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
                {errors.unit && (
                  <p className="text-xs text-destructive">{errors.unit.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                Sabab <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="reasonPreset"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sababni tanlang" />
                    </SelectTrigger>
                    <SelectContent>
                      {REASON_PRESETS[watchType]?.map((preset) => (
                        <SelectItem key={preset.value} value={preset.value}>
                          {preset.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.reasonPreset && (
                <p className="text-xs text-destructive">{errors.reasonPreset.message}</p>
              )}
            </div>

            {(watchReasonPreset === OTHER_REASON || !!watchReasonPreset) && (
              <div className="space-y-2">
                <Label htmlFor="reasonDetail">
                  {watchReasonPreset === OTHER_REASON ? (
                    <>Sabab tafsiloti <span className="text-destructive">*</span></>
                  ) : (
                    'Qo\'shimcha izoh (ixtiyoriy)'
                  )}
                </Label>
                <Textarea
                  id="reasonDetail"
                  placeholder="Batafsil izoh..."
                  rows={2}
                  {...register('reasonDetail')}
                />
                {errors.reasonDetail && (
                  <p className="text-xs text-destructive">{errors.reasonDetail.message}</p>
                )}
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Bekor qilish
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && (
                  <LoadingSpinner size="sm" className="mr-2 h-4 w-4" />
                )}
                Saqlash
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Stock Take (Inventarizatsiya) Dialog */}
      <StockTakeDialog
        open={stockTakeOpen}
        onOpenChange={setStockTakeOpen}
        products={products}
      />
    </div>
  );
}
