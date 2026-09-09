import { useCallback, useEffect, useState } from 'react';
import { useForm, useFieldArray, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Lock, Plus, Trash2 } from 'lucide-react';
import type { Product, Unit } from '@plastmassa/shared';
import { formatCurrency } from '@/lib/utils';
import { useProductLotBatchDetail, useUpdateProductLotBatch } from '@/hooks/use-product-lots';
import { toast } from '@/components/ui/use-toast';
import { ProductImage } from '@/components/shared/product-image';
import { ProductSearchSelect } from '@/components/shared/product-search-select';
import { QuickCreateProductDialog } from '@/components/shared/quick-create-product-dialog';

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

// Existing lines: quantity/unit can only move while nothing has been consumed from the
// lot yet (quantityRemaining === quantity). Once production has drawn from it, the
// quantity is frozen — only price/notes stay editable — to keep FIFO consumption records
// (which already reference the lot's original quantity) consistent.
const existingItemSchema = z.object({
  _id: z.string(),
  product: z.string(),
  productName: z.string(),
  productImage: z.string().optional(),
  lotNumber: z.string(),
  locked: z.boolean(),
  unitSymbol: z.string(),
  quantity: z.coerce.number().positive("Miqdor 0 dan katta bo'lishi kerak"),
  unit: z.string().min(1),
  unitCost: z.coerce.number().min(0, "Narx 0 dan kam bo'lmasligi kerak"),
  sellPrice: z.coerce.number().min(0).optional().or(z.literal('' as any)),
});

const newItemSchema = z.object({
  product: z.string().min(1, 'Mahsulotni tanlang'),
  quantity: z.coerce.number().positive("Miqdor 0 dan katta bo'lishi kerak"),
  unit: z.string().min(1, "O'lchov birligini tanlang"),
  unitCost: z.coerce.number().min(0, "Narx 0 dan kam bo'lmasligi kerak"),
  sellPrice: z.coerce.number().min(0).optional().or(z.literal('' as any)),
});

const editBatchSchema = z.object({
  existingItems: z.array(existingItemSchema),
  newItems: z.array(newItemSchema),
  additionalPaidAmount: z.coerce.number().min(0).optional().or(z.literal('' as any)),
  notes: z.string().optional(),
});

type EditBatchFormData = z.infer<typeof editBatchSchema>;

function toIdString(value: any): string {
  if (value && typeof value === 'object' && '_id' in value) return value._id.toString();
  return value?.toString() ?? '';
}

interface EditLotBatchDialogProps {
  open: boolean;
  batchNumber: string | null;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  units: Unit[];
}

export function EditLotBatchDialog({
  open,
  batchNumber,
  onOpenChange,
  products,
  units,
}: EditLotBatchDialogProps) {
  const { data: detail, isLoading } = useProductLotBatchDetail(open ? batchNumber : null);
  const updateBatchMutation = useUpdateProductLotBatch();

  const [justCreatedProducts, setJustCreatedProducts] = useState<Product[]>([]);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickCreateRowIndex, setQuickCreateRowIndex] = useState<number | null>(null);
  const [quickCreateInitialName, setQuickCreateInitialName] = useState('');

  const allProducts = products.concat(
    justCreatedProducts.filter((jc) => !products.some((p) => p._id === jc._id)),
  );

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<EditBatchFormData>({
    resolver: zodResolver(editBatchSchema),
    defaultValues: { existingItems: [], newItems: [], additionalPaidAmount: undefined, notes: '' },
  });

  const { fields: newFields, append: appendNew, remove: removeNew } = useFieldArray({
    control,
    name: 'newItems',
  });

  useEffect(() => {
    if (!detail) return;
    reset({
      existingItems: detail.items.map((item) => {
        const locked = item.quantityRemaining !== item.quantity;
        const productObj = typeof item.product === 'object' ? item.product : undefined;
        const unitObj = typeof item.unit === 'object' ? item.unit : undefined;
        return {
          _id: item._id,
          product: toIdString(item.product),
          productName: productObj?.name || '',
          productImage: productObj?.imageUrl,
          lotNumber: item.lotNumber,
          locked,
          unitSymbol: unitObj?.symbol || '',
          quantity: item.quantity,
          unit: toIdString(item.unit),
          unitCost: item.unitCost,
          sellPrice: undefined,
        };
      }),
      newItems: [],
      additionalPaidAmount: undefined,
      notes: detail.notes || '',
    });
    setJustCreatedProducts([]);
  }, [detail, reset]);

  const watchExisting = useWatch({ control, name: 'existingItems' });
  const watchNew = useWatch({ control, name: 'newItems' });

  const existingTotal = (watchExisting || []).reduce(
    (sum, it) => sum + (Number(it?.quantity) || 0) * (Number(it?.unitCost) || 0),
    0,
  );
  const newTotal = (watchNew || []).reduce(
    (sum, it) => sum + (Number(it?.quantity) || 0) * (Number(it?.unitCost) || 0),
    0,
  );
  const grandTotal = existingTotal + newTotal;

  const openQuickCreate = useCallback((index: number, searchText: string) => {
    setQuickCreateRowIndex(index);
    setQuickCreateInitialName(searchText);
    setQuickCreateOpen(true);
  }, []);

  const handleProductCreated = useCallback(
    (product: Product) => {
      setJustCreatedProducts((prev) => [...prev, product]);
      if (quickCreateRowIndex !== null) {
        setValue(`newItems.${quickCreateRowIndex}.product`, product._id);
        const baseUnitId =
          typeof product.baseUnit === 'object' && product.baseUnit !== null
            ? (product.baseUnit as Unit)._id
            : (product.baseUnit as string);
        setValue(`newItems.${quickCreateRowIndex}.unit`, baseUnitId);
        if (typeof product.price === 'number') {
          setValue(`newItems.${quickCreateRowIndex}.sellPrice`, product.price as any);
        }
      }
      setQuickCreateOpen(false);
      setQuickCreateRowIndex(null);
    },
    [quickCreateRowIndex, setValue],
  );

  const handleNewProductSelect = useCallback(
    (index: number, product: Product) => {
      setValue(`newItems.${index}.product`, product._id);
      const baseUnitId =
        typeof product.baseUnit === 'object' && product.baseUnit !== null
          ? (product.baseUnit as Unit)._id
          : (product.baseUnit as string);
      setValue(`newItems.${index}.unit`, baseUnitId);
      if (typeof product.price === 'number') {
        setValue(`newItems.${index}.sellPrice`, product.price as any);
      }
    },
    [setValue],
  );

  const onSubmit = useCallback(
    async (data: EditBatchFormData) => {
      if (!batchNumber) return;
      try {
        await updateBatchMutation.mutateAsync({
          batchNumber,
          data: {
            additionalPaidAmount:
              data.additionalPaidAmount !== undefined && data.additionalPaidAmount !== ('' as any)
                ? Number(data.additionalPaidAmount)
                : undefined,
            notes: data.notes || undefined,
            items: [
              ...data.existingItems.map((it) => ({
                _id: it._id,
                quantity: it.quantity,
                unit: it.unit,
                unitCost: it.unitCost,
                sellPrice:
                  it.sellPrice !== undefined && it.sellPrice !== ('' as any)
                    ? Number(it.sellPrice)
                    : undefined,
              })),
              ...data.newItems.map((it) => ({
                product: it.product,
                quantity: it.quantity,
                unit: it.unit,
                unitCost: it.unitCost,
                sellPrice:
                  it.sellPrice !== undefined && it.sellPrice !== ('' as any)
                    ? Number(it.sellPrice)
                    : undefined,
              })),
            ],
          },
        });
        toast({ title: 'Muvaffaqiyatli', description: 'Kirim hujjati yangilandi' });
        onOpenChange(false);
      } catch (err: any) {
        toast({
          title: 'Xatolik',
          description: err?.response?.data?.message || 'Kirim hujjatini yangilashda xatolik yuz berdi',
          variant: 'destructive',
        });
      }
    },
    [batchNumber, updateBatchMutation, onOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Kirim hujjatini tahrirlash</DialogTitle>
          <DialogDescription>
            {detail?.supplier?.name ? `Yetkazib beruvchi: ${detail.supplier.name}` : "Yetkazib beruvchisiz kirim"}
            {detail?.createdAt ? ` · ${format(new Date(detail.createdAt), 'dd.MM.yyyy HH:mm')}` : ''}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !detail ? (
          <div className="flex justify-center py-10">
            <LoadingSpinner />
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Existing lines */}
            <div className="space-y-3">
              <Label>Mavjud qatorlar</Label>
              {watchExisting?.map((_, index) => {
                const locked = detail.items[index]
                  ? detail.items[index].quantityRemaining !== detail.items[index].quantity
                  : false;
                const item = watchExisting[index];
                return (
                  <div key={item?._id || index} className="rounded-xl border border-input p-3 space-y-3">
                    <div className="flex items-center gap-3">
                      <ProductImage
                        src={item?.productImage}
                        alt={item?.productName || 'Mahsulot'}
                        className="h-14 w-14 shrink-0 rounded-xl border border-border/60 bg-background"
                        iconClassName="h-5 w-5"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item?.productName}</p>
                        <p className="text-xs text-muted-foreground font-mono">{item?.lotNumber}</p>
                      </div>
                      {locked && (
                        <span className="flex items-center gap-1 text-xs text-amber-400" title="Bu lot allaqachon qisman yoki to'liq sarflangan — miqdorini o'zgartirib bo'lmaydi">
                          <Lock className="h-3.5 w-3.5" />
                          Miqdor bloklangan
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Miqdor</Label>
                        <Input
                          type="number"
                          step="any"
                          min={0}
                          disabled={locked}
                          {...register(`existingItems.${index}.quantity`)}
                        />
                        {errors.existingItems?.[index]?.quantity && (
                          <p className="text-xs text-destructive">{errors.existingItems[index]?.quantity?.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Birlik</Label>
                        {locked ? (
                          <div className="flex items-center h-10 px-3 rounded-xl border border-input bg-muted/50 text-sm text-muted-foreground">
                            {item?.unitSymbol}
                          </div>
                        ) : (
                          <Controller
                            name={`existingItems.${index}.unit`}
                            control={control}
                            render={({ field: f }) => (
                              <Select value={f.value} onValueChange={f.onChange}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Birlik" />
                                </SelectTrigger>
                                <SelectContent>
                                  {units.map((unit) => (
                                    <SelectItem key={unit._id} value={unit._id}>{unit.symbol}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Olish narxi</Label>
                        <Input
                          type="number"
                          step="any"
                          min={0}
                          {...register(`existingItems.${index}.unitCost`)}
                        />
                        {errors.existingItems?.[index]?.unitCost && (
                          <p className="text-xs text-destructive">{errors.existingItems[index]?.unitCost?.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Yangi sotish narxi</Label>
                        <Input
                          type="number"
                          step="any"
                          min={0}
                          placeholder="O'zgarmasin"
                          {...register(`existingItems.${index}.sellPrice`)}
                        />
                      </div>
                    </div>

                    <div className="text-right text-xs text-muted-foreground">
                      Qator jami:{' '}
                      <span className="font-medium text-foreground">
                        {formatCurrency((Number(item?.quantity) || 0) * (Number(item?.unitCost) || 0))}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* New lines */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Yangi qatorlar</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => appendNew({ product: '', quantity: undefined as any, unit: '', unitCost: undefined as any, sellPrice: undefined as any })}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Qator qo'shish
                </Button>
              </div>

              {newFields.map((field, index) => (
                <div key={field.id} className="rounded-xl border border-input p-3 space-y-3 relative">
                  <button
                    type="button"
                    onClick={() => removeNew(index)}
                    className="absolute right-2 top-2 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  <div className="space-y-2 pr-6">
                    <Label className="text-xs">Mahsulot <span className="text-destructive">*</span></Label>
                    <div className="flex items-center gap-3">
                      <ProductImage
                        src={allProducts.find((p) => p._id === watchNew?.[index]?.product)?.imageUrl}
                        alt={allProducts.find((p) => p._id === watchNew?.[index]?.product)?.name || 'Mahsulot'}
                        className="h-14 w-14 shrink-0 rounded-xl border border-border/60 bg-background"
                        iconClassName="h-5 w-5"
                      />
                      <div className="flex-1">
                        <Controller
                          name={`newItems.${index}.product`}
                          control={control}
                          render={({ field: f }) => (
                            <ProductSearchSelect
                              products={allProducts}
                              value={f.value}
                              onSelect={(product) => handleNewProductSelect(index, product)}
                              onCreateNew={(searchText) => openQuickCreate(index, searchText)}
                            />
                          )}
                        />
                      </div>
                    </div>
                    {errors.newItems?.[index]?.product && (
                      <p className="text-xs text-destructive">{errors.newItems[index]?.product?.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Miqdor <span className="text-destructive">*</span></Label>
                      <Input type="number" step="any" min={0} placeholder="0" {...register(`newItems.${index}.quantity`)} />
                      {errors.newItems?.[index]?.quantity && (
                        <p className="text-xs text-destructive">{errors.newItems[index]?.quantity?.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Birlik <span className="text-destructive">*</span></Label>
                      <Controller
                        name={`newItems.${index}.unit`}
                        control={control}
                        render={({ field: f }) => (
                          <Select value={f.value} onValueChange={f.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Birlik" />
                            </SelectTrigger>
                            <SelectContent>
                              {units.map((unit) => (
                                <SelectItem key={unit._id} value={unit._id}>{unit.symbol}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.newItems?.[index]?.unit && (
                        <p className="text-xs text-destructive">{errors.newItems[index]?.unit?.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Olish narxi <span className="text-destructive">*</span></Label>
                      <Input type="number" step="any" min={0} placeholder="0" {...register(`newItems.${index}.unitCost`)} />
                      {errors.newItems?.[index]?.unitCost && (
                        <p className="text-xs text-destructive">{errors.newItems[index]?.unitCost?.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Sotish narxi</Label>
                      <Input type="number" step="any" min={0} placeholder="0" {...register(`newItems.${index}.sellPrice`)} />
                    </div>
                  </div>

                  <div className="text-right text-xs text-muted-foreground">
                    Qator jami:{' '}
                    <span className="font-medium text-foreground">
                      {formatCurrency((Number(watchNew?.[index]?.quantity) || 0) * (Number(watchNew?.[index]?.unitCost) || 0))}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Grand Total */}
            <div className="space-y-2">
              <Label>Umumiy jami</Label>
              <div className="flex items-center h-10 px-3 rounded-xl border border-input bg-muted/50 text-sm font-medium text-foreground">
                {formatCurrency(grandTotal)}
              </div>
            </div>

            {detail.supplier && (
              <div className="space-y-2">
                <Label htmlFor="additionalPaidAmount">Qo'shimcha naqd to'lov</Label>
                <Input
                  id="additionalPaidAmount"
                  type="number"
                  step="any"
                  min={0}
                  placeholder="0"
                  {...register('additionalPaidAmount')}
                />
                <p className="text-xs text-muted-foreground">
                  Kiritilsa, shu summa kassadan darhol yechilib, yetkazib beruvchi qarzidan ayiriladi.
                </p>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Izoh</Label>
              <Textarea id="edit-notes" placeholder="Qo'shimcha ma'lumot..." {...register('notes')} />
            </div>

            <p className="text-xs text-muted-foreground">
              Eslatma: mavjud qatorlarni o'chirish hozircha qo'llab-quvvatlanmaydi.
            </p>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Bekor qilish</Button>
              <Button type="submit" disabled={updateBatchMutation.isPending}>
                {updateBatchMutation.isPending && <LoadingSpinner size="sm" className="mr-2 h-4 w-4" />}
                Saqlash
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>

      {/* Quick Create Product Dialog (stacked on top of the edit dialog) */}
      <QuickCreateProductDialog
        open={quickCreateOpen}
        onOpenChange={(o) => {
          setQuickCreateOpen(o);
          if (!o) setQuickCreateRowIndex(null);
        }}
        initialName={quickCreateInitialName}
        onCreated={handleProductCreated}
      />
    </Dialog>
  );
}
