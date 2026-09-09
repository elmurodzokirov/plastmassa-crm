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
  Boxes,
  Hash,
  DollarSign,
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import type { Unit, Supplier } from '@plastmassa/shared';
import { cn, formatCurrency, formatNumber } from '@/lib/utils';
import { useMaterial } from '@/hooks/use-materials';
import { useUnits } from '@/hooks/use-units';
import { useSuppliers } from '@/hooks/use-suppliers';
import {
  useMaterialLotsByMaterial,
  useCreateMaterialLot,
} from '@/hooks/use-material-lots';
import { MaterialLotQuery } from '@/api/material-lots';
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

export default function MaterialDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const limit = 10;

  const { data: material, isLoading: isLoadingMaterial, isError } = useMaterial(id || '');
  const { data: units } = useUnits();
  const { data: suppliersData } = useSuppliers({ limit: 200, isActive: true });
  const suppliers = suppliersData?.items || [];

  const lotsParams: MaterialLotQuery = {
    page,
    limit,
    ...(supplierFilter !== 'all' && { supplier: supplierFilter }),
    ...(dateFrom && { dateFrom }),
    ...(dateTo && { dateTo }),
  };

  const { data: lotsData, isLoading: isLoadingLots } = useMaterialLotsByMaterial(id || '', lotsParams);
  const createLotMutation = useCreateMaterialLot();

  const lots = lotsData?.items || [];
  const totalPages = lotsData?.totalPages || 1;
  const totalLots = lotsData?.total || 0;

  const unitSymbol = useMemo(() => {
    if (!material) return '';
    if (typeof material.baseUnit === 'object' && material.baseUnit !== null) {
      return (material.baseUnit as Unit).symbol;
    }
    const unit = units?.find((u) => u._id === material.baseUnit);
    return unit?.symbol || '';
  }, [material, units]);

  const baseUnitId = useMemo(() => {
    if (!material) return '';
    if (typeof material.baseUnit === 'object' && material.baseUnit !== null) {
      return (material.baseUnit as Unit)._id;
    }
    return material.baseUnit as string;
  }, [material]);

  const totalLotsSum = useMemo(() => lots.reduce((sum, l) => sum + l.totalCost, 0), [lots]);

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<LotFormData>({
    resolver: zodResolver(lotSchema),
    defaultValues: { quantity: undefined, unit: '', unitCost: undefined, supplier: 'none', paidAmount: undefined, notes: '' },
  });

  const watchQuantity = watch('quantity');
  const watchUnitCost = watch('unitCost');
  const watchSupplier = watch('supplier');

  const calculatedTotal = useMemo(() => {
    return (Number(watchQuantity) || 0) * (Number(watchUnitCost) || 0);
  }, [watchQuantity, watchUnitCost]);

  useEffect(() => {
    if (material && baseUnitId) {
      reset((prev) => ({ ...prev, unit: baseUnitId }));
    }
  }, [material, baseUnitId, reset]);

  const defaultSupplierId = useMemo(() => {
    if (!material) return 'none';
    const ds = material.defaultSupplier as string | Supplier | undefined;
    if (!ds) return 'none';
    return typeof ds === 'object' ? ds._id : ds;
  }, [material]);

  const openDialog = useCallback(() => {
    reset({ quantity: undefined, unit: baseUnitId, unitCost: undefined, supplier: defaultSupplierId, paidAmount: undefined, notes: '' });
    setDialogOpen(true);
  }, [reset, baseUnitId, defaultSupplierId]);

  const onSubmit = useCallback(
    async (data: LotFormData) => {
      if (!id) return;
      const hasSupplier = !!(data.supplier && data.supplier !== 'none');
      try {
        await createLotMutation.mutateAsync({
          material: id,
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

  if (isLoadingMaterial) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isError || !material) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 mb-4">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Xom-ashyo topilmadi</h2>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/materials')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Xom-ashyoga qaytish
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
        <Button variant="ghost" onClick={() => navigate('/materials')} className="gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Xom-ashyo
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10">
              <Boxes className="h-6 w-6 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground">{material.name}</h1>
                <Badge variant={material.isActive ? 'success' : 'secondary'}>
                  {material.isActive ? 'Faol' : 'Nofaol'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">O'lchov birligi: {unitSymbol}</p>
            </div>
          </div>
          <Button onClick={openDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            Yangi kirim
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Joriy zaxira"
          value={`${formatNumber(material.currentStock)} ${unitSymbol}`}
          icon={Boxes}
          iconColor="text-indigo-400"
          iconBg="bg-indigo-500/20"
          index={0}
        />
        <StatCard
          title="Joriy narx"
          value={formatCurrency(material.costPrice)}
          icon={DollarSign}
          iconColor="text-emerald-400"
          iconBg="bg-emerald-500/20"
          index={1}
        />
        <StatCard
          title="Jami kirimlar soni"
          value={totalLots}
          icon={Hash}
          iconColor="text-purple-400"
          iconBg="bg-purple-500/20"
          index={2}
        />
        <StatCard
          title="Sahifadagi kirim summasi"
          value={formatCurrency(totalLotsSum)}
          icon={DollarSign}
          iconColor="text-cyan-400"
          iconBg="bg-cyan-500/20"
          index={3}
        />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }} className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Kirimlar tarixi</h2>

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
                <TableHead className="hidden md:table-cell">Kim</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lots.map((lot) => {
                const lotUnitSymbol = typeof lot.unit === 'object' && lot.unit !== null ? lot.unit.symbol : unitSymbol;
                const createdByName = typeof lot.createdBy === 'object' && lot.createdBy !== null ? lot.createdBy.fullName : '';
                return (
                  <TableRow key={lot._id}>
                    <TableCell className="font-mono text-sm">{lot.lotNumber}</TableCell>
                    <TableCell className="text-muted-foreground">{format(new Date(lot.createdAt), 'dd.MM.yyyy HH:mm')}</TableCell>
                    <TableCell className="font-medium">{formatNumber(lot.quantity)} {lotUnitSymbol}</TableCell>
                    <TableCell className="font-medium">{formatNumber(lot.quantityRemaining)} {lotUnitSymbol}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                        lot.source === 'ADJUSTMENT' ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300',
                      )}>
                        {lot.source === 'ADJUSTMENT' ? 'Tuzatish' : 'Xarid'}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">{formatCurrency(lot.unitCost)}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(lot.totalCost)}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {typeof lot.supplier === 'object' && lot.supplier !== null
                        ? lot.supplier.name
                        : suppliers.find((s) => s._id === lot.supplier)?.name || '-'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{createdByName || '-'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DataTableWrapper>

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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Yangi xom-ashyo kirimi</DialogTitle>
            <DialogDescription>{material.name} uchun yangi kirim ma'lumotlarini kiriting</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Miqdor <span className="text-destructive">*</span></Label>
              <Input id="quantity" type="number" step="any" min={0} placeholder="0" {...register('quantity')} />
              {errors.quantity && <p className="text-xs text-destructive">{errors.quantity.message}</p>}
            </div>

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

            <div className="space-y-2">
              <Label htmlFor="unitCost">Narx (birlik uchun) <span className="text-destructive">*</span></Label>
              <Input id="unitCost" type="number" step="any" min={0} placeholder="0" {...register('unitCost')} />
              {errors.unitCost && <p className="text-xs text-destructive">{errors.unitCost.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Jami</Label>
              <div className="flex items-center h-10 px-3 rounded-xl border border-input bg-muted/50 text-sm font-medium text-foreground">
                {formatCurrency(calculatedTotal)}
              </div>
            </div>

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
