import { useEffect, useCallback, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Lock, Plus, Trash2, History } from 'lucide-react';
import type { Product, User } from '@plastmassa/shared';
import { formatNumber } from '@/lib/utils';
import { useProductionLogBatchDetail, useUpdateProductionLogBatch } from '@/hooks/use-production';
import { toast } from '@/components/ui/use-toast';
import { ProductSearchSelect } from '@/components/shared/product-search-select';
import { UserSearchSelect } from '@/components/shared/user-search-select';
import { useMachines } from '@/hooks/use-machines';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { LoadingSpinner } from '@/components/shared/loading-spinner';

const itemSchema = z.object({
  _id: z.string().optional(),
  product: z.string().min(1, 'Mahsulotni tanlang'),
  quantityProduced: z.coerce.number().min(0.001, "Miqdor 0 dan katta bo'lishi kerak"),
  quantityDefective: z.coerce.number().min(0, "Brak miqdori 0 dan kam bo'lmasligi kerak").optional(),
  locked: z.boolean().optional(),
  productName: z.string().optional(),
});

const editBatchSchema = z.object({
  worker: z.string().min(1, 'Ishchini tanlang'),
  date: z.string().min(1, 'Sanani tanlang'),
  notes: z.string().optional(),
  machine: z.string().optional(),
  shift: z.enum(['DAY', 'NIGHT']).optional(),
  hoursWorked: z.coerce.number().min(0, "Ish soati 0 dan kam bo'lmasligi kerak").optional(),
  items: z.array(itemSchema).min(1, "Kamida bitta mahsulot qo'shing"),
});

type EditBatchFormData = z.infer<typeof editBatchSchema>;

interface ProductionBatchDetailDialogProps {
  open: boolean;
  batchNumber: string | null;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  workers: User[];
}

export function ProductionBatchDetailDialog({
  open,
  batchNumber,
  onOpenChange,
  products,
  workers,
}: ProductionBatchDetailDialogProps) {
  const { data: detail, isLoading } = useProductionLogBatchDetail(open ? batchNumber : null);
  const updateBatchMutation = useUpdateProductionLogBatch();
  const { data: machines } = useMachines();

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EditBatchFormData>({
    resolver: zodResolver(editBatchSchema),
    defaultValues: { worker: '', date: '', notes: '', machine: '', shift: undefined, hoursWorked: undefined, items: [] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  useEffect(() => {
    if (!detail) return;
    reset({
      worker: typeof detail.worker === 'string' ? detail.worker : detail.worker?._id || '',
      date: detail.date ? format(new Date(detail.date), 'yyyy-MM-dd') : '',
      notes: detail.notes || '',
      machine: typeof detail.machine === 'string' ? detail.machine : detail.machine?._id || '',
      shift: detail.shift,
      hoursWorked: detail.hoursWorked,
      items: detail.items.map((item: any) => ({
        _id: item._id,
        product: typeof item.product === 'string' ? item.product : item.product?._id,
        quantityProduced: item.quantityProduced,
        quantityDefective: item.quantityDefective || 0,
        locked: item.locked,
        productName: item.productName,
      })),
    });
  }, [detail, reset]);

  const onSubmit = useCallback(
    async (data: EditBatchFormData) => {
      if (!batchNumber) return;
      try {
        await updateBatchMutation.mutateAsync({
          batchNumber,
          data: {
            worker: data.worker,
            date: data.date,
            notes: data.notes,
            machine: data.machine || undefined,
            shift: data.shift || undefined,
            hoursWorked: data.hoursWorked,
            items: data.items.map((it) => ({
              _id: it._id,
              product: it.product,
              quantityProduced: it.quantityProduced,
              quantityDefective: it.quantityDefective || 0,
            })),
          },
        });
        toast({ title: 'Muvaffaqiyatli', description: 'Hujjat yangilandi' });
        onOpenChange(false);
      } catch (err: any) {
        toast({
          title: 'Xatolik',
          description: err?.response?.data?.message || 'Hujjatni yangilashda xatolik yuz berdi',
          variant: 'destructive',
        });
      }
    },
    [batchNumber, updateBatchMutation, onOpenChange],
  );

  const watchedItems = watch('items');
  const totalQuantity = (watchedItems || []).reduce((sum, it) => sum + (Number(it?.quantityProduced) || 0), 0);

  // Batch-level field changes (Ishchi/Sana/Izoh) are recorded once per line on the
  // backend (so each document's own history stays complete) — collapse those
  // duplicates here so the same edit doesn't show up once per product row.
  const dedupedHistory = useMemo(() => {
    if (!detail?.editHistory) return [];
    const seen = new Set<string>();
    const result: typeof detail.editHistory = [];
    for (const h of detail.editHistory) {
      const isShared =
        h.field === 'Ishchi' ||
        h.field === 'Sana' ||
        h.field === 'Izoh' ||
        h.field === 'Stanok' ||
        h.field === 'Smena' ||
        h.field === 'Ish soati';
      const key = isShared
        ? `${h.field}|${h.changedAt}|${h.oldValue}|${h.newValue}|${h.userName}`
        : `${h.field}|${h.changedAt}|${h.oldValue}|${h.newValue}|${h.userName}|${h.productName}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(h);
    }
    return result;
  }, [detail]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ishlab chiqarish hujjati</DialogTitle>
          <DialogDescription>
            {detail?.batchNumber ? `Hujjat: ${detail.batchNumber}` : "Hujjat ma'lumotlari"}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !detail ? (
          <div className="flex justify-center py-10">
            <LoadingSpinner />
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Ishchi <span className="text-destructive">*</span>
                </Label>
                <UserSearchSelect
                  users={workers}
                  value={watch('worker')}
                  onSelect={(user) => setValue('worker', user._id, { shouldValidate: true })}
                  placeholder="Ishchini qidiring..."
                />
                {errors.worker && (
                  <p className="text-xs text-destructive">{errors.worker.message}</p>
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Stanok</Label>
                <Select
                  value={watch('machine') || 'none'}
                  onValueChange={(value) => setValue('machine', value === 'none' ? '' : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Stanokni tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tanlanmagan</SelectItem>
                    {machines?.map((m) => (
                      <SelectItem key={m._id} value={m._id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Smena</Label>
                <Select
                  value={watch('shift') || 'none'}
                  onValueChange={(value) =>
                    setValue('shift', value === 'none' ? undefined : (value as 'DAY' | 'NIGHT'))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Smenani tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tanlanmagan</SelectItem>
                    <SelectItem value="DAY">Kunduzgi</SelectItem>
                    <SelectItem value="NIGHT">Tungi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ish soati</Label>
                <Input
                  type="number"
                  min={0}
                  step="any"
                  placeholder="0"
                  {...register('hoursWorked')}
                />
                {errors.hoursWorked && (
                  <p className="text-xs text-destructive">{errors.hoursWorked.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Mahsulotlar</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => append({ product: '', quantityProduced: 1, quantityDefective: 0 })}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Qator qo'shish
                </Button>
              </div>

              {fields.map((field, index) => {
                const locked = watchedItems?.[index]?.locked;
                return (
                  <div key={field.id} className="rounded-xl border border-input p-3 relative">
                    {locked ? (
                      <span
                        className="absolute right-2 top-2 flex items-center gap-1 text-xs text-amber-400"
                        title="Bu qator allaqachon sarflangan — mahsulot yoki miqdorini o'zgartirib yoki o'chirib bo'lmaydi"
                      >
                        <Lock className="h-3.5 w-3.5" />
                      </span>
                    ) : (
                      fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="absolute right-2 top-2 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )
                    )}
                    <div className="grid grid-cols-4 gap-3 pr-6">
                      <div className="col-span-2 space-y-2">
                        <Label className="text-xs">
                          Mahsulot <span className="text-destructive">*</span>
                        </Label>
                        {locked ? (
                          <div className="flex items-center h-10 px-3 rounded-xl border border-input bg-muted/50 text-sm text-muted-foreground">
                            {watchedItems?.[index]?.productName}
                          </div>
                        ) : (
                          <ProductSearchSelect
                            products={products}
                            value={watchedItems?.[index]?.product}
                            onSelect={(product) => setValue(`items.${index}.product`, product._id, { shouldValidate: true })}
                            placeholder="Mahsulotni qidiring..."
                          />
                        )}
                        {errors.items?.[index]?.product && (
                          <p className="text-xs text-destructive">{errors.items[index]?.product?.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">
                          Miqdor <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          step="any"
                          disabled={locked}
                          {...register(`items.${index}.quantityProduced`)}
                        />
                        {errors.items?.[index]?.quantityProduced && (
                          <p className="text-xs text-destructive">{errors.items[index]?.quantityProduced?.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Brak miqdori</Label>
                        <Input
                          type="number"
                          min={0}
                          step="any"
                          {...register(`items.${index}.quantityDefective`)}
                        />
                        {errors.items?.[index]?.quantityDefective && (
                          <p className="text-xs text-destructive">{errors.items[index]?.quantityDefective?.message}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border/40 bg-muted/20 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Jami miqdor</span>
              <span className="font-medium text-foreground">{formatNumber(totalQuantity)}</span>
            </div>

            <div className="space-y-2">
              <Label>Izoh</Label>
              <Textarea placeholder="Qo'shimcha izoh..." rows={2} {...register('notes')} />
            </div>

            {dedupedHistory.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <History className="h-3.5 w-3.5" />
                  Tahrirlar tarixi
                </Label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto rounded-xl border border-border/30 p-2.5">
                  {dedupedHistory.map((h, i) => (
                    <div key={i} className="text-xs text-muted-foreground">
                      <span className="text-foreground font-medium">{h.userName}</span>
                      {' — '}
                      {format(new Date(h.changedAt), 'dd.MM.yyyy HH:mm')}
                      {': '}
                      <span className="text-foreground">{h.field}</span>
                      {(h.field === 'Mahsulot' || h.field === 'Miqdor' || h.field === 'Brak miqdori') && h.productName ? ` (${h.productName})` : ''}
                      {': '}
                      {h.oldValue} → {h.newValue}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Bekor qilish
              </Button>
              <Button type="submit" disabled={updateBatchMutation.isPending}>
                {updateBatchMutation.isPending && (
                  <LoadingSpinner size="sm" className="mr-2 h-4 w-4" />
                )}
                Saqlash
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
