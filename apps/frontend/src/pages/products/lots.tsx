import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useForm, Controller, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import {
  Plus,
  Trash2,
  Package,
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { Product, Supplier, Unit } from '@plastmassa/shared';
import { cn, formatCurrency, formatNumber } from '@/lib/utils';
import { useProducts } from '@/hooks/use-products';
import { useProductLots, useProductLotBatches, useCreateProductLotBatch } from '@/hooks/use-product-lots';
import { useUnits } from '@/hooks/use-units';
import { useSuppliers } from '@/hooks/use-suppliers';
import { toast } from '@/components/ui/use-toast';
import { ProductImage } from '@/components/shared/product-image';
import { ProductSearchSelect } from '@/components/shared/product-search-select';
import { SupplierSearchSelect } from '@/components/shared/supplier-search-select';
import { QuickCreateProductDialog } from '@/components/shared/quick-create-product-dialog';
import { QuickCreateSupplierDialog } from '@/components/shared/quick-create-supplier-dialog';
import { EditLotBatchDialog } from '@/components/products/edit-lot-batch-dialog';

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

const lotItemSchema = z.object({
  product: z.string().min(1, 'Mahsulotni tanlang'),
  quantity: z.coerce.number().positive('Miqdor 0 dan katta bo\'lishi kerak'),
  unit: z.string().min(1, 'O\'lchov birligini tanlang'),
  unitCost: z.coerce.number().min(0, 'Narx 0 dan kam bo\'lmasligi kerak'),
  sellPrice: z.coerce.number().min(0, 'Narx 0 dan kam bo\'lmasligi kerak').optional(),
});

const batchSchema = z.object({
  supplier: z.string().optional(),
  paidAmount: z.coerce.number().min(0, 'Summa 0 dan kam bo\'lmasligi kerak').optional(),
  notes: z.string().optional(),
  items: z.array(lotItemSchema).min(1, 'Kamida bitta mahsulot qatori kerak'),
});

type BatchFormData = z.infer<typeof batchSchema>;

const emptyItem = { product: '', quantity: undefined as any, unit: '', unitCost: undefined as any, sellPrice: undefined as any };

export default function ProductLotsPage() {
  const [page, setPage] = useState(1);
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editBatchNumber, setEditBatchNumber] = useState<string | null>(null);
  const limit = 10;

  const batchQueryParams = {
    page,
    limit,
    ...(supplierFilter !== 'all' && { supplier: supplierFilter }),
    ...(dateFrom && { dateFrom }),
    ...(dateTo && { dateTo }),
  };

  const { data: batchesData, isLoading } = useProductLotBatches(batchQueryParams);
  const { data: productsData } = useProducts({ limit: 100 });
  const { data: units } = useUnits();
  const { data: suppliersData } = useSuppliers({ limit: 200, isActive: true });
  const createBatchMutation = useCreateProductLotBatch();

  // Independent of the table's own filters — always the true most-recent lots,
  // used to derive the "recently used products" combobox suggestions.
  const { data: recentLotsData } = useProductLots({ limit: 50, sortBy: 'createdAt', sortOrder: 'desc' });

  // Newly-created products/suppliers (via the "quick create" flow) are merged in immediately
  // so the combobox shows them without waiting for the underlying query to refetch.
  const [justCreatedProducts, setJustCreatedProducts] = useState<Product[]>([]);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickCreateRowIndex, setQuickCreateRowIndex] = useState<number | null>(null);
  const [quickCreateInitialName, setQuickCreateInitialName] = useState('');

  const [justCreatedSuppliers, setJustCreatedSuppliers] = useState<Supplier[]>([]);
  const [quickCreateSupplierOpen, setQuickCreateSupplierOpen] = useState(false);
  const [quickCreateSupplierInitialName, setQuickCreateSupplierInitialName] = useState('');

  const batches = batchesData?.items || [];
  const totalPages = batchesData?.totalPages || 1;
  const totalCount = batchesData?.total || 0;
  const fetchedProducts = productsData?.items || [];
  const products = useMemo(() => {
    const extra = justCreatedProducts.filter((jc) => !fetchedProducts.some((p) => p._id === jc._id));
    return [...fetchedProducts, ...extra];
  }, [fetchedProducts, justCreatedProducts]);

  const fetchedSuppliers = suppliersData?.items || [];
  const suppliers = useMemo(() => {
    const extra = justCreatedSuppliers.filter((jc) => !fetchedSuppliers.some((s) => s._id === jc._id));
    return [...fetchedSuppliers, ...extra];
  }, [fetchedSuppliers, justCreatedSuppliers]);

  const recentProducts = useMemo(() => {
    const seen = new Set<string>();
    const result: Product[] = [];
    for (const lot of recentLotsData?.items || []) {
      const p = lot.product;
      if (p && typeof p === 'object' && '_id' in p && !seen.has((p as Product)._id)) {
        seen.add((p as Product)._id);
        result.push(p as Product);
        if (result.length >= 5) break;
      }
    }
    return result;
  }, [recentLotsData]);

  // A synthetic "no supplier" entry so it's selectable/searchable the same way as a real one,
  // and so the field can display something meaningful when nothing is chosen.
  const supplierComboItems = useMemo<Supplier[]>(
    () => [{ _id: 'none', name: "Tanlanmagan (yetkazib beruvchisiz)" } as Supplier, ...suppliers],
    [suppliers],
  );

  const recentSuppliers = useMemo(() => {
    const seen = new Set<string>();
    const result: Supplier[] = [];
    for (const lot of recentLotsData?.items || []) {
      const s = lot.supplier;
      if (s && typeof s === 'object' && '_id' in s && !seen.has((s as Supplier)._id)) {
        seen.add((s as Supplier)._id);
        result.push(s as Supplier);
        if (result.length >= 5) break;
      }
    }
    return result;
  }, [recentLotsData]);

  const totalSum = useMemo(() => batches.reduce((sum, b) => sum + b.totalSum, 0), [batches]);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<BatchFormData>({
    resolver: zodResolver(batchSchema),
    defaultValues: {
      supplier: 'none',
      paidAmount: undefined,
      notes: '',
      items: [emptyItem],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  // useWatch (not form.watch()) so row totals reliably re-render on every keystroke,
  // including edits to an already-filled field — form.watch() is known to lag with
  // nested useFieldArray values.
  const watchItems = useWatch({ control, name: 'items' });
  const watchSupplier = useWatch({ control, name: 'supplier' });

  const rowTotals = useMemo(
    () => (watchItems || []).map((it) => (Number(it?.quantity) || 0) * (Number(it?.unitCost) || 0)),
    [watchItems],
  );
  const grandTotal = useMemo(() => rowTotals.reduce((s, v) => s + v, 0), [rowTotals]);

  const openDialog = useCallback(() => {
    reset({
      supplier: 'none',
      paidAmount: undefined,
      notes: '',
      items: [emptyItem],
    });
    fieldRefs.current.clear();
    setDialogOpen(true);
  }, [reset]);

  const handleProductSelect = useCallback(
    (index: number, product: Product) => {
      setValue(`items.${index}.product`, product._id);
      const baseUnitId =
        typeof product.baseUnit === 'object' && product.baseUnit !== null
          ? (product.baseUnit as Unit)._id
          : (product.baseUnit as string);
      setValue(`items.${index}.unit`, baseUnitId);
      if (typeof product.price === 'number') {
        setValue(`items.${index}.sellPrice`, product.price as any);
      }
    },
    [setValue],
  );

  const openQuickCreate = useCallback((index: number, searchText: string) => {
    setQuickCreateRowIndex(index);
    setQuickCreateInitialName(searchText);
    setQuickCreateOpen(true);
  }, []);

  const handleProductCreated = useCallback(
    (product: Product) => {
      setJustCreatedProducts((prev) => [...prev, product]);
      if (quickCreateRowIndex !== null) {
        handleProductSelect(quickCreateRowIndex, product);
      }
      setQuickCreateOpen(false);
      setQuickCreateRowIndex(null);
    },
    [quickCreateRowIndex, handleProductSelect],
  );

  // ── Keyboard navigation: Enter moves focus supplier -> row1.product -> row1.quantity ->
  // row1.unit -> row1.unitCost -> row1.sellPrice -> row2.product -> ... A new row is appended
  // automatically when Enter is pressed on the last field of the last row.
  const fieldRefs = useRef<Map<string, HTMLElement>>(new Map());
  const pendingFocusNewRowRef = useRef(false);

  const registerFieldRef = useCallback(
    (key: string) => (el: HTMLElement | null) => {
      if (el) fieldRefs.current.set(key, el);
      else fieldRefs.current.delete(key);
    },
    [],
  );

  const getFocusOrder = useCallback((): string[] => {
    const order: string[] = ['supplier'];
    for (const f of fields) {
      order.push(
        `${f.id}:product`,
        `${f.id}:quantity`,
        `${f.id}:unit`,
        `${f.id}:unitCost`,
        `${f.id}:sellPrice`,
      );
    }
    return order;
  }, [fields]);

  const focusNext = useCallback(
    (currentKey: string) => {
      const order = getFocusOrder();
      const idx = order.indexOf(currentKey);
      if (idx === -1) return;
      if (idx === order.length - 1) {
        pendingFocusNewRowRef.current = true;
        append(emptyItem);
      } else {
        fieldRefs.current.get(order[idx + 1])?.focus();
      }
    },
    [getFocusOrder, append],
  );

  useEffect(() => {
    if (pendingFocusNewRowRef.current && fields.length > 0) {
      const lastField = fields[fields.length - 1];
      const el = fieldRefs.current.get(`${lastField.id}:product`);
      if (el) {
        el.focus();
        pendingFocusNewRowRef.current = false;
      }
    }
  }, [fields]);

  const handleSupplierSelect = useCallback(
    (supplier: Supplier) => {
      setValue('supplier', supplier._id);
      // Move focus straight into the first row's product search field.
      const order = getFocusOrder();
      const nextKey = order[1]; // order[0] is 'supplier' itself
      if (nextKey) fieldRefs.current.get(nextKey)?.focus();
    },
    [setValue, getFocusOrder],
  );

  const openQuickCreateSupplier = useCallback((searchText: string) => {
    setQuickCreateSupplierInitialName(searchText);
    setQuickCreateSupplierOpen(true);
  }, []);

  const handleSupplierCreated = useCallback(
    (supplier: Supplier) => {
      setJustCreatedSuppliers((prev) => [...prev, supplier]);
      handleSupplierSelect(supplier);
      setQuickCreateSupplierOpen(false);
    },
    [handleSupplierSelect],
  );

  const onSubmit = useCallback(
    async (data: BatchFormData) => {
      const hasSupplier = !!(data.supplier && data.supplier !== 'none');
      try {
        await createBatchMutation.mutateAsync({
          supplier: hasSupplier ? data.supplier : undefined,
          paidAmount: hasSupplier && data.paidAmount ? data.paidAmount : undefined,
          notes: data.notes || undefined,
          items: data.items.map((it) => ({
            product: it.product,
            quantity: it.quantity,
            unit: it.unit,
            unitCost: it.unitCost,
            sellPrice: it.sellPrice !== undefined && it.sellPrice !== null ? it.sellPrice : undefined,
          })),
        });
        toast({ title: 'Muvaffaqiyatli', description: 'Yangi kirim muvaffaqiyatli saqlandi' });
        setDialogOpen(false);
        reset();
      } catch {
        toast({ title: 'Xatolik', description: 'Kirimni saqlashda xatolik yuz berdi', variant: 'destructive' });
      }
    },
    [createBatchMutation, reset],
  );

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
      </motion.div>

      {/* Table */}
      <DataTableWrapper
        isLoading={isLoading}
        isEmpty={!isLoading && batches.length === 0}
        emptyTitle="Kirimlar topilmadi"
        emptyDescription="Hozircha hech qanday kirim qayd etilmagan"
      >
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Sana</TableHead>
              <TableHead>Yetkazib beruvchi</TableHead>
              <TableHead>Mahsulotlar soni</TableHead>
              <TableHead className="hidden sm:table-cell">Manba</TableHead>
              <TableHead>Jami summa</TableHead>
              <TableHead className="hidden lg:table-cell">Kim</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.map((batch) => (
              <TableRow
                key={batch.batchNumber}
                className="cursor-pointer hover:bg-muted/40"
                onClick={() => setEditBatchNumber(batch.batchNumber)}
              >
                <TableCell className="text-muted-foreground">
                  {format(new Date(batch.createdAt), 'dd.MM.yyyy HH:mm')}
                </TableCell>
                <TableCell className="font-medium">
                  {batch.supplier?.name || '-'}
                </TableCell>
                <TableCell className="font-medium">{batch.itemCount}</TableCell>
                <TableCell className="hidden sm:table-cell">
                  <span className={cn(
                    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                    batch.source === 'PRODUCTION' && 'bg-purple-500/20 text-purple-300',
                    batch.source === 'ADJUSTMENT' && 'bg-amber-500/20 text-amber-300',
                    batch.source === 'PURCHASE' && 'bg-emerald-500/20 text-emerald-300',
                  )}>
                    {batch.source === 'PRODUCTION' && 'Ishlab chiqarish'}
                    {batch.source === 'ADJUSTMENT' && 'Tuzatish'}
                    {batch.source === 'PURCHASE' && 'Xarid'}
                  </span>
                </TableCell>
                <TableCell className="font-medium">{formatCurrency(batch.totalSum)}</TableCell>
                <TableCell className="hidden lg:table-cell text-muted-foreground">
                  {typeof batch.createdBy === 'object' && batch.createdBy !== null
                    ? batch.createdBy.fullName
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
        <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yangi mahsulot kirimi</DialogTitle>
            <DialogDescription>
              Bitta yetkazib beruvchidan bir nechta mahsulotni birgalikda kiriting
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Supplier */}
            <div className="space-y-2">
              <Label>Yetkazib beruvchi</Label>
              <Controller
                name="supplier"
                control={control}
                render={({ field }) => (
                  <SupplierSearchSelect
                    suppliers={supplierComboItems}
                    recentSuppliers={recentSuppliers}
                    value={field.value || 'none'}
                    onSelect={handleSupplierSelect}
                    onCreateNew={openQuickCreateSupplier}
                    inputRef={registerFieldRef('supplier')}
                    onEnterNext={() => focusNext('supplier')}
                  />
                )}
              />
              <p className="text-xs text-muted-foreground">
                Yetkazib beruvchi tanlansa, kirim summasi unga qarz sifatida yoziladi
              </p>
            </div>

            {/* Items */}
            <div className="space-y-3">
              <Label>Mahsulotlar <span className="text-destructive">*</span></Label>
              {fields.map((field, index) => (
                <div key={field.id} className="rounded-xl border border-input p-3 space-y-3 relative">
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="absolute right-2 top-2 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}

                  <div className="space-y-2 pr-6">
                    <Label className="text-xs">Mahsulot <span className="text-destructive">*</span></Label>
                    <div className="flex items-center gap-3">
                      <ProductImage
                        src={products.find((p) => p._id === watchItems?.[index]?.product)?.imageUrl}
                        alt={products.find((p) => p._id === watchItems?.[index]?.product)?.name || 'Mahsulot'}
                        className="h-14 w-14 shrink-0 rounded-xl border border-border/60 bg-background"
                        iconClassName="h-5 w-5"
                      />
                      <div className="flex-1">
                        <Controller
                          name={`items.${index}.product`}
                          control={control}
                          render={({ field: f }) => (
                            <ProductSearchSelect
                              products={products}
                              recentProducts={recentProducts}
                              value={f.value}
                              onSelect={(product) => handleProductSelect(index, product)}
                              onCreateNew={(searchText) => openQuickCreate(index, searchText)}
                              inputRef={registerFieldRef(`${field.id}:product`)}
                              onEnterNext={() => focusNext(`${field.id}:product`)}
                            />
                          )}
                        />
                      </div>
                    </div>
                    {errors.items?.[index]?.product && (
                      <p className="text-xs text-destructive">{errors.items[index]?.product?.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Miqdor <span className="text-destructive">*</span></Label>
                      {(() => {
                        const rhf = register(`items.${index}.quantity`);
                        return (
                          <Input
                            type="number"
                            step="any"
                            min={0}
                            placeholder="0"
                            {...rhf}
                            ref={(el) => {
                              rhf.ref(el);
                              registerFieldRef(`${field.id}:quantity`)(el);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                focusNext(`${field.id}:quantity`);
                              }
                            }}
                          />
                        );
                      })()}
                      {errors.items?.[index]?.quantity && (
                        <p className="text-xs text-destructive">{errors.items[index]?.quantity?.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Birlik <span className="text-destructive">*</span></Label>
                      <Controller
                        name={`items.${index}.unit`}
                        control={control}
                        render={({ field: f }) => (
                          <Select value={f.value} onValueChange={f.onChange}>
                            <SelectTrigger
                              ref={registerFieldRef(`${field.id}:unit`)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  focusNext(`${field.id}:unit`);
                                }
                              }}
                            >
                              <SelectValue placeholder="Birlik" />
                            </SelectTrigger>
                            <SelectContent>
                              {units?.map((unit) => (
                                <SelectItem key={unit._id} value={unit._id}>{unit.symbol}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.items?.[index]?.unit && (
                        <p className="text-xs text-destructive">{errors.items[index]?.unit?.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Olish narxi <span className="text-destructive">*</span></Label>
                      {(() => {
                        const rhf = register(`items.${index}.unitCost`);
                        return (
                          <Input
                            type="number"
                            step="any"
                            min={0}
                            placeholder="0"
                            {...rhf}
                            ref={(el) => {
                              rhf.ref(el);
                              registerFieldRef(`${field.id}:unitCost`)(el);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                focusNext(`${field.id}:unitCost`);
                              }
                            }}
                          />
                        );
                      })()}
                      {errors.items?.[index]?.unitCost && (
                        <p className="text-xs text-destructive">{errors.items[index]?.unitCost?.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Sotish narxi</Label>
                      {(() => {
                        const rhf = register(`items.${index}.sellPrice`);
                        return (
                          <Input
                            type="number"
                            step="any"
                            min={0}
                            placeholder="0"
                            {...rhf}
                            ref={(el) => {
                              rhf.ref(el);
                              registerFieldRef(`${field.id}:sellPrice`)(el);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                focusNext(`${field.id}:sellPrice`);
                              }
                            }}
                          />
                        );
                      })()}
                    </div>
                  </div>

                  <div className="text-right text-xs text-muted-foreground">
                    Qator jami: <span className="font-medium text-foreground">{formatCurrency(rowTotals[index] || 0)}</span>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => append(emptyItem)}
              >
                <Plus className="h-3.5 w-3.5" />
                Qator qo'shish
              </Button>
              {errors.items && !Array.isArray(errors.items) && (
                <p className="text-xs text-destructive">{(errors.items as any).message}</p>
              )}
            </div>

            {/* Grand Total */}
            <div className="space-y-2">
              <Label>Umumiy jami</Label>
              <div className="flex items-center h-10 px-3 rounded-xl border border-input bg-muted/50 text-sm font-medium text-foreground">
                {formatCurrency(grandTotal)}
              </div>
            </div>

            {watchSupplier && watchSupplier !== 'none' && (
              <div className="space-y-2">
                <Label htmlFor="paidAmount">Darhol to'langan summa (naqd)</Label>
                <Input
                  id="paidAmount"
                  type="number"
                  step="any"
                  min={0}
                  max={grandTotal || undefined}
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
              <Button type="submit" disabled={createBatchMutation.isPending}>
                {createBatchMutation.isPending && <LoadingSpinner size="sm" className="mr-2 h-4 w-4" />}
                Kirimni saqlash
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Quick Create Product Dialog (stacked on top of the lot dialog) */}
      <QuickCreateProductDialog
        open={quickCreateOpen}
        onOpenChange={(open) => {
          setQuickCreateOpen(open);
          if (!open) setQuickCreateRowIndex(null);
        }}
        initialName={quickCreateInitialName}
        onCreated={handleProductCreated}
      />

      {/* Quick Create Supplier Dialog (stacked on top of the lot dialog) */}
      <QuickCreateSupplierDialog
        open={quickCreateSupplierOpen}
        onOpenChange={setQuickCreateSupplierOpen}
        initialName={quickCreateSupplierInitialName}
        onCreated={handleSupplierCreated}
      />

      {/* Edit existing purchase invoice ("kirim hujjati") */}
      <EditLotBatchDialog
        open={editBatchNumber !== null}
        batchNumber={editBatchNumber}
        onOpenChange={(open) => { if (!open) setEditBatchNumber(null); }}
        products={products}
        units={units || []}
      />
    </div>
  );
}
