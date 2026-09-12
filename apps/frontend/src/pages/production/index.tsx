import { useState, useEffect, useCallback, useMemo, useRef, type FormEvent } from 'react';
import {
  useForm,
  useFieldArray,
  type UseFormRegister,
  type UseFormWatch,
  type UseFormSetValue,
  type FieldErrors,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Product } from '@plastmassa/shared';
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
  Eye,
  Trash2,
  Printer,
} from 'lucide-react';
import { cn, formatNumber, formatCurrency } from '@/lib/utils';
import {
  useProductionLogs,
  useDailyProductionLogs,
  useCreateProductionLogBatch,
  useProductionLogBatches,
} from '@/hooks/use-production';
import { useProducts } from '@/hooks/use-products';
import { useUsers } from '@/hooks/use-users';
import { useActiveRecipe } from '@/hooks/use-recipes';
import type { ProductionBatchQuery } from '@/api/production';
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
import { ProductSearchSelect } from '@/components/shared/product-search-select';
import { UserSearchSelect } from '@/components/shared/user-search-select';
import { ProductionBatchDetailDialog } from '@/components/production/production-batch-detail-dialog';
import { StatCard } from '@/components/shared/stat-card';
import { DataTableWrapper } from '@/components/shared/data-table';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

const COMPANY_NAME = "SARDOBA KO'ZA PLAST MChJ";

interface ReceiptItem {
  productName: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface ReceiptData {
  workerName: string;
  date: string;
  items: ReceiptItem[];
  total: number;
  printedAt: string;
}

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

const productionItemSchema = z.object({
  product: z.string().min(1, 'Mahsulot tanlang'),
  quantityProduced: z.coerce.number().min(1, "Miqdor 0 dan katta bo'lishi kerak"),
});

const createLogSchema = z.object({
  worker: z.string().min(1, 'Ishchi tanlang'),
  date: z.string().min(1, 'Sana tanlang'),
  items: z.array(productionItemSchema).min(1, "Kamida bitta mahsulot qo'shing"),
  notes: z.string().optional(),
});

type CreateLogFormData = z.infer<typeof createLogSchema>;

interface ProductionItemRowProps {
  index: number;
  fieldId: string;
  products: Product[];
  register: UseFormRegister<CreateLogFormData>;
  watch: UseFormWatch<CreateLogFormData>;
  setValue: UseFormSetValue<CreateLogFormData>;
  errors: FieldErrors<CreateLogFormData>;
  registerFieldRef: (key: string) => (el: HTMLElement | null) => void;
  focusNext: (key: string) => void;
  removeItem: (index: number) => void;
  canRemove: boolean;
}

// A single "Mahsulot/Miqdor" row in the production-log dialog. Broken out into its
// own component (rather than an inline .map()) so it can call useActiveRecipe for
// just its own product — reads the recipe's required raw-material quantities and
// compares them against each material's currentStock to decide whether to show the
// same light-red "not enough stock, but still allowed" warning used on "Yangi sotuv".
function ProductionItemRow({
  index,
  fieldId,
  products,
  register,
  watch,
  setValue,
  errors,
  registerFieldRef,
  focusNext,
  removeItem,
  canRemove,
}: ProductionItemRowProps) {
  const productId = watch(`items.${index}.product`);
  const quantityProduced = watch(`items.${index}.quantityProduced`);
  const { data: recipe } = useActiveRecipe(productId);

  const isMaterialShort = useMemo(() => {
    if (!recipe || !recipe.items || recipe.items.length === 0) return false;
    const qty = Number(quantityProduced) || 0;
    if (qty <= 0) return false;
    return recipe.items.some((it) => {
      const material = typeof it.material === 'object' ? it.material : null;
      if (!material) return false;
      const needed = it.quantityPerUnit * (1 + (it.wastagePercent || 0) / 100) * qty;
      return needed > (material.currentStock || 0);
    });
  }, [recipe, quantityProduced]);

  const { ref: quantityRegisterRef, ...quantityRegisterRest } = register(
    `items.${index}.quantityProduced`,
  );

  return (
    <div
      className={cn(
        'rounded-xl border p-3 relative',
        isMaterialShort ? 'border-red-500/50 bg-red-500/10' : 'border-input',
      )}
    >
      {canRemove && (
        <button
          type="button"
          onClick={() => removeItem(index)}
          className="absolute right-2 top-2 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
      <div className={cn('grid grid-cols-3 gap-3', canRemove && 'pr-6')}>
        <div className="col-span-2 space-y-2">
          <Label className="text-xs">
            Mahsulot <span className="text-destructive">*</span>
          </Label>
          <ProductSearchSelect
            products={products}
            value={watch(`items.${index}.product`)}
            onSelect={(product) => setValue(`items.${index}.product`, product._id, { shouldValidate: true })}
            inputRef={registerFieldRef(`${fieldId}:product`)}
            onEnterNext={() => focusNext(`${fieldId}:product`)}
            placeholder="Mahsulotni qidiring..."
          />
          {(errors.items as any)?.[index]?.product && (
            <p className="text-xs text-destructive">{(errors.items as any)[index].product.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label className="text-xs">
            Miqdor <span className="text-destructive">*</span>
          </Label>
          <Input
            type="number"
            min={1}
            step="any"
            placeholder="0"
            onFocus={(e) => e.target.select()}
            className={cn(isMaterialShort && 'border-red-500/50 bg-red-500/10')}
            ref={(el) => {
              quantityRegisterRef(el);
              registerFieldRef(`${fieldId}:quantity`)(el);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                focusNext(`${fieldId}:quantity`);
              }
            }}
            {...quantityRegisterRest}
          />
          {(errors.items as any)?.[index]?.quantityProduced && (
            <p className="text-xs text-destructive">{(errors.items as any)[index].quantityProduced.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProductionPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailBatchNumber, setDetailBatchNumber] = useState<string | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const limit = 10;

  const debouncedSearch = useDebounce(search, 300);

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const batchQueryParams: ProductionBatchQuery = {
    page,
    limit,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(dateFrom && { dateFrom }),
    ...(dateTo && { dateTo }),
    sortOrder: 'desc',
  };

  const { data: batchesData, isLoading } = useProductionLogBatches(batchQueryParams);
  const { data: dailyLogs } = useDailyProductionLogs(todayStr);
  const { data: monthlyLogsData } = useProductionLogs({
    limit: 9999,
    dateFrom: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
    dateTo: format(new Date(), 'yyyy-MM-dd'),
  });
  const { data: productsData } = useProducts({ limit: 9999, isActive: true });
  const { data: usersData } = useUsers({ limit: 9999 });
  const createLogsBatchMutation = useCreateProductionLogBatch();

  const batches = batchesData?.items || [];
  const totalPages = batchesData?.totalPages || 1;
  const totalCount = batchesData?.total || 0;

  const todayLogs = dailyLogs || [];
  const todayProduced = todayLogs.reduce((sum, l) => sum + l.quantityProduced, 0);
  const monthlyLogs = monthlyLogsData?.items || [];
  const monthlyProduced = monthlyLogs.reduce((sum, l) => sum + l.quantityProduced, 0);
  const monthlyExpense = monthlyLogs.reduce((sum, l) => sum + l.totalMaterialCost, 0);
  const monthlyEarned = monthlyLogs.reduce((sum, l) => sum + l.earnedAmount, 0);

  const products = productsData?.items || [];
  const workers = usersData?.items || [];

  const emptyItem = { product: '', quantityProduced: 1 };

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    getValues,
    control,
    formState: { errors },
  } = useForm<CreateLogFormData>({
    resolver: zodResolver(createLogSchema),
    defaultValues: {
      worker: '',
      date: todayStr,
      items: [emptyItem],
      notes: '',
    },
  });

  const {
    fields: itemFields,
    append: appendItem,
    remove: removeItem,
    replace: replaceItems,
  } = useFieldArray({
    control,
    name: 'items',
  });

  const watchedItems = watch('items');
  const calculatedSalary = useMemo(() => {
    return (watchedItems || []).reduce((sum, it) => {
      const product = products.find((p) => p._id === it.product);
      const rate = product?.pieceRate || 0;
      const qty = Number(it.quantityProduced) || 0;
      return sum + rate * qty;
    }, 0);
  }, [watchedItems, products]);

  const { ref: dateRegisterRef, ...dateRegisterRest } = register('date');

  const openCreateDialog = useCallback(() => {
    reset({
      worker: '',
      date: todayStr,
      items: [emptyItem],
      notes: '',
    });
    setCreateDialogOpen(true);
  }, [reset, todayStr]);

  // ── Keyboard navigation: Enter moves focus worker -> date -> item1.product ->
  // item1.quantity -> item2.product -> ... A new item row is appended automatically
  // when Enter is pressed on the quantity field of the last row (mirrors the
  // multi-row Enter-to-add-row pattern used on the product lots page).
  const fieldRefs = useRef<Map<string, HTMLElement>>(new Map());
  const pendingFocusNewRowRef = useRef(false);
  const pendingPrintRef = useRef(false);

  const registerFieldRef = useCallback(
    (key: string) => (el: HTMLElement | null) => {
      if (el) fieldRefs.current.set(key, el);
      else fieldRefs.current.delete(key);
    },
    [],
  );

  const getFocusOrder = useCallback((): string[] => {
    const order: string[] = ['worker'];
    for (const f of itemFields) {
      order.push(`${f.id}:product`, `${f.id}:quantity`);
    }
    return order;
  }, [itemFields]);

  const focusNext = useCallback(
    (currentKey: string) => {
      const order = getFocusOrder();
      const idx = order.indexOf(currentKey);
      if (idx === -1) return;
      if (idx === order.length - 1) {
        pendingFocusNewRowRef.current = true;
        appendItem(emptyItem);
      } else {
        fieldRefs.current.get(order[idx + 1])?.focus();
      }
    },
    [getFocusOrder, appendItem],
  );

  const focusFirstItemField = useCallback(() => {
    const order = getFocusOrder();
    if (order.length > 1) {
      fieldRefs.current.get(order[1])?.focus();
    }
  }, [getFocusOrder]);

  useEffect(() => {
    if (pendingFocusNewRowRef.current && itemFields.length > 0) {
      const lastField = itemFields[itemFields.length - 1];
      fieldRefs.current.get(`${lastField.id}:product`)?.focus();
      pendingFocusNewRowRef.current = false;
    }
  }, [itemFields]);

  const addItemRow = useCallback(() => {
    pendingFocusNewRowRef.current = true;
    appendItem(emptyItem);
  }, [appendItem]);

  // Rows after the first one that are still missing a product (e.g. an extra row
  // added via Enter / "Qator qo'shish" that was never filled in) are silently
  // dropped on submit instead of blocking with a "Mahsulot tanlang" error.
  const cleanEmptyExtraRows = useCallback(() => {
    const current = getValues('items');
    const cleaned = current.filter((it, idx) => idx === 0 || !!it.product);
    if (cleaned.length !== current.length) {
      replaceItems(cleaned.length > 0 ? cleaned : [emptyItem]);
    }
  }, [getValues, replaceItems]);

  const buildReceiptData = useCallback(
    (data: CreateLogFormData): ReceiptData => {
      const workerObj = workers.find((w) => w._id === data.worker);
      const items: ReceiptItem[] = data.items.map((it) => {
        const product = products.find((p) => p._id === it.product);
        const rate = product?.pieceRate || 0;
        const qty = Number(it.quantityProduced) || 0;
        return {
          productName: product?.name || '-',
          quantity: qty,
          rate,
          amount: rate * qty,
        };
      });
      return {
        workerName: workerObj?.fullName || '-',
        date: data.date,
        items,
        total: items.reduce((sum, it) => sum + it.amount, 0),
        printedAt: format(new Date(), 'dd.MM.yyyy HH:mm'),
      };
    },
    [workers, products],
  );

  const submitLog = useCallback(
    async (data: CreateLogFormData, options?: { print?: boolean }) => {
      try {
        await createLogsBatchMutation.mutateAsync({
          worker: data.worker,
          date: data.date,
          notes: data.notes,
          items: data.items.map((it) => ({
            product: it.product,
            quantityProduced: it.quantityProduced,
          })),
        });
        if (options?.print) {
          setReceiptData(buildReceiptData(data));
          pendingPrintRef.current = true;
        }
        toast({
          title: 'Muvaffaqiyatli',
          description: data.items.length > 1
            ? `${data.items.length} ta mahsulot bilan hujjat yaratildi`
            : "Ishlab chiqarish yozuvi muvaffaqiyatli yaratildi",
          variant: 'success',
        });
        setCreateDialogOpen(false);
        reset();
      } catch (err: any) {
        toast({
          title: 'Xatolik',
          description: err?.response?.data?.message || "Yozuv yaratishda xatolik yuz berdi",
          variant: 'destructive',
        });
      }
    },
    [createLogsBatchMutation, reset, buildReceiptData],
  );

  const onCreateSubmit = useCallback(
    (data: CreateLogFormData) => submitLog(data),
    [submitLog],
  );

  const handleFormSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      cleanEmptyExtraRows();
      handleSubmit(onCreateSubmit)();
    },
    [cleanEmptyExtraRows, handleSubmit, onCreateSubmit],
  );

  const handlePrintClick = useCallback(() => {
    cleanEmptyExtraRows();
    handleSubmit((data) => submitLog(data, { print: true }))();
  }, [cleanEmptyExtraRows, handleSubmit, submitLog]);

  useEffect(() => {
    if (pendingPrintRef.current && receiptData) {
      pendingPrintRef.current = false;
      const timer = setTimeout(() => window.print(), 50);
      return () => clearTimeout(timer);
    }
  }, [receiptData]);

  const getWorkerName = (worker: any): string => {
    if (!worker) return '-';
    if (typeof worker === 'string') return worker;
    return worker.fullName || '-';
  };

  const openBatchDetail = (batchNumber: string) => {
    setDetailBatchNumber(batchNumber);
    setDetailDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ishlab chiqarish</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Jami {totalCount} ta hujjat
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

      {/* Documents Table */}
      <DataTableWrapper
        isLoading={isLoading}
        isEmpty={!isLoading && batches.length === 0}
        emptyTitle="Hujjatlar topilmadi"
        emptyDescription="Hozircha hech qanday ishlab chiqarish yozuvi qo'shilmagan"
      >
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Sana</TableHead>
              <TableHead>Mahsulot</TableHead>
              <TableHead className="hidden md:table-cell">Miqdor</TableHead>
              <TableHead className="hidden lg:table-cell">Xarajat</TableHead>
              <TableHead className="hidden sm:table-cell">Ishchi</TableHead>
              <TableHead className="text-right">Amallar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.map((batch) => (
              <TableRow
                key={batch.batchNumber}
                className="cursor-pointer hover:bg-muted/10"
                onClick={() => openBatchDetail(batch.batchNumber)}
              >
                <TableCell className="text-muted-foreground">
                  {format(new Date(batch.date), 'dd.MM.yyyy')}
                </TableCell>
                <TableCell className="font-medium">
                  {batch.itemCount > 1
                    ? `${batch.productNames[0]} va yana ${batch.itemCount - 1} ta`
                    : batch.productNames[0]}
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">
                  {formatNumber(batch.totalQuantity)}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-red-400">
                  {formatCurrency(batch.totalMaterialCost)}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground">
                  {getWorkerName(batch.worker)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      openBatchDetail(batch.batchNumber);
                    }}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Ko'rish
                  </Button>
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
          <form onSubmit={handleFormSubmit} className="space-y-4">
            {/* Worker select */}
            <div className="space-y-2">
              <Label>
                Ishchi <span className="text-destructive">*</span>
              </Label>
              <UserSearchSelect
                users={workers}
                value={watch('worker')}
                onSelect={(user) => setValue('worker', user._id, { shouldValidate: true })}
                inputRef={registerFieldRef('worker')}
                onEnterNext={() => focusNext('worker')}
                placeholder="Ishchini qidiring..."
              />
              {errors.worker && (
                <p className="text-xs text-destructive">{errors.worker.message}</p>
              )}
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label>
                Sana <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                ref={(el) => {
                  dateRegisterRef(el);
                  registerFieldRef('date')(el);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    focusFirstItemField();
                  }
                }}
                {...dateRegisterRest}
              />
              {errors.date && (
                <p className="text-xs text-destructive">{errors.date.message}</p>
              )}
            </div>

            {/* Product rows */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>
                  Mahsulotlar <span className="text-destructive">*</span>
                </Label>
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addItemRow}>
                  <Plus className="h-3.5 w-3.5" />
                  Qator qo'shish
                </Button>
              </div>

              {itemFields.map((field, index) => (
                <ProductionItemRow
                  key={field.id}
                  index={index}
                  fieldId={field.id}
                  products={products}
                  register={register}
                  watch={watch}
                  setValue={setValue}
                  errors={errors}
                  registerFieldRef={registerFieldRef}
                  focusNext={focusNext}
                  removeItem={removeItem}
                  canRemove={itemFields.length > 1}
                />
              ))}
              {errors.items && !Array.isArray(errors.items) && (
                <p className="text-xs text-destructive">{(errors.items as any).message}</p>
              )}
            </div>

            {/* Calculated salary */}
            <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Hisoblangan maosh</span>
              <span className="text-lg font-bold text-primary">{formatCurrency(calculatedSalary)}</span>
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
              <Button type="submit" variant="secondary" disabled={createLogsBatchMutation.isPending}>
                {createLogsBatchMutation.isPending && (
                  <LoadingSpinner size="sm" className="mr-2 h-4 w-4" />
                )}
                Saqlash
              </Button>
              <Button
                type="button"
                onClick={handlePrintClick}
                disabled={createLogsBatchMutation.isPending}
                className="gap-1.5"
              >
                {createLogsBatchMutation.isPending ? (
                  <LoadingSpinner size="sm" className="mr-2 h-4 w-4" />
                ) : (
                  <Printer className="h-4 w-4" />
                )}
                Chop etish
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Document Detail / Edit Dialog */}
      <ProductionBatchDetailDialog
        open={detailDialogOpen}
        batchNumber={detailBatchNumber}
        onOpenChange={setDetailDialogOpen}
        products={products}
        workers={workers}
      />

      {/* 80mm Receipt Print Area */}
      <style>{`
        .production-receipt { display: none; }
        @media print {
          body * { visibility: hidden; }
          .production-receipt, .production-receipt * { visibility: visible; }
          .production-receipt {
            display: block !important;
            position: fixed;
            top: 0;
            left: 0;
            width: 80mm;
            background: #fff;
            color: #000;
            padding: 3mm;
            font-size: 11px;
            line-height: 1.4;
          }
          @page {
            size: 80mm auto;
            margin: 0;
          }
        }
      `}</style>
      {receiptData && (
        <div className="production-receipt">
          <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 13 }}>{COMPANY_NAME}</div>
          <div style={{ textAlign: 'center', fontSize: 10, marginBottom: 6 }}>Ishlab chiqarish cheki</div>
          <div>Sana: {receiptData.date}</div>
          <div>Ishchi: {receiptData.workerName}</div>
          <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />
          <table style={{ width: '100%', fontSize: 10, borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Mahsulot</th>
                <th style={{ textAlign: 'right' }}>Son</th>
                <th style={{ textAlign: 'right' }}>Narx</th>
                <th style={{ textAlign: 'right' }}>Summa</th>
              </tr>
            </thead>
            <tbody>
              {receiptData.items.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.productName}</td>
                  <td style={{ textAlign: 'right' }}>{formatNumber(item.quantity)}</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(item.rate)}</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 12 }}>
            <span>Jami maosh:</span>
            <span>{formatCurrency(receiptData.total)}</span>
          </div>
          <div style={{ textAlign: 'center', fontSize: 9, marginTop: 8 }}>
            Chop etilgan: {receiptData.printedAt}
          </div>
        </div>
      )}
    </div>
  );
}
