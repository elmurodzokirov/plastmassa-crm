import { useState, useCallback, useEffect, useMemo, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  Search,
  Package,
  PackageCheck,
  Warehouse,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { Product, Unit } from '@plastmassa/shared';
import { formatCurrency } from '@/lib/utils';
import {
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from '@/hooks/use-products';
import { useUnits } from '@/hooks/use-units';
import { ProductQuery, ProductUpsertInput } from '@/api/products';
import { toast } from '@/components/ui/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { StatCard } from '@/components/shared/stat-card';
import { DataTableWrapper } from '@/components/shared/data-table';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { ProductImage } from '@/components/shared/product-image';

const salesUnitSchema = z.object({
  unit: z.string().min(1, 'Birlikni tanlang'),
  conversionFactor: z.coerce.number().min(0.001, 'Konversiya koeffitsienti 0 dan katta bo\'lishi kerak'),
  price: z.coerce.number().min(0, 'Narx 0 dan kam bo\'lmasligi kerak'),
});

const productSchema = z.object({
  name: z.string().min(1, 'Nomi kiritish majburiy'),
  baseUnit: z.string().min(1, 'O\'lchov birligini tanlang'),
  price: z.coerce.number().min(0, 'Narx 0 dan kam bo\'lmasligi kerak'),
  costPrice: z.coerce.number().min(0).optional(),
  pieceRate: z.coerce.number().min(0, 'Ishbay narxi 0 dan kam bo\'lmasligi kerak').optional(),
  salesUnits: z.array(salesUnitSchema).optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

const EMPTY_PRODUCT_FORM_VALUES: ProductFormData = {
  name: '',
  baseUnit: '',
  price: 0,
  costPrice: 0,
  pieceRate: 0,
  salesUnits: [],
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

export default function ProductsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder] = useState<'asc' | 'desc'>('desc');
  const limit = 10;

  const debouncedSearch = useDebounce(search, 300);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);

  const queryParams: ProductQuery = {
    page,
    limit,
    ...(debouncedSearch && { search: debouncedSearch }),
    sortBy,
    sortOrder,
  };

  const { data: productsData, isLoading: isLoadingProducts } = useProducts(queryParams);
  const { data: units, isLoading: isLoadingUnits } = useUnits();
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: EMPTY_PRODUCT_FORM_VALUES,
  });

  const { fields: salesFields, append: appendSales, remove: removeSales } = useFieldArray({
    control,
    name: 'salesUnits',
  });

  useEffect(() => {
    if (!selectedImageFile) {
      setPreviewImageUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedImageFile);
    setPreviewImageUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedImageFile]);

  const resetImageState = useCallback(() => {
    setSelectedImageFile(null);
    setPreviewImageUrl(null);
    setRemoveImage(false);
  }, []);

  const effectivePreviewUrl = previewImageUrl || (!removeImage ? editingProduct?.imageUrl || null : null);


  const products = productsData?.items || [];
  const totalPages = productsData?.totalPages || 1;
  const totalCount = productsData?.total || 0;

  const totalStock = useMemo(() => {
    return products.reduce((sum, p) => sum + p.currentStock, 0);
  }, [products]);

  const activeCount = useMemo(() => {
    return products.filter((p) => p.isActive).length;
  }, [products]);

  const getUnitSymbol = (product: Product): string => {
    if (typeof product.baseUnit === 'object' && product.baseUnit !== null) {
      return (product.baseUnit as Unit).symbol;
    }
    const unit = units?.find((u) => u._id === product.baseUnit);
    return unit?.symbol || '';
  };

  const getSalesUnitsDisplay = (product: Product): string => {
    if (!product.salesUnits || product.salesUnits.length === 0) return '-';
    return `${product.salesUnits.length} ta`;
  };

  const openCreateDialog = useCallback(() => {
    setEditingProduct(null);
    reset(EMPTY_PRODUCT_FORM_VALUES);
    resetImageState();
    setDialogOpen(true);
  }, [reset, resetImageState]);

  const openEditDialog = useCallback(
    (product: Product) => {
      setEditingProduct(product);
      const baseUnitId =
        typeof product.baseUnit === 'object' && product.baseUnit !== null
          ? (product.baseUnit as Unit)._id
          : product.baseUnit;

      const salesUnits = (product.salesUnits || []).map((su) => ({
        unit:
          typeof su.unit === 'object' && su.unit !== null
            ? (su.unit as Unit)._id
            : (su.unit as string),
        conversionFactor: su.conversionFactor,
        price: su.price,
      }));

      reset({
        name: product.name,
        baseUnit: baseUnitId as string,
        price: product.price,
        costPrice: (product as any).costPrice || 0,
        pieceRate: (product as any).pieceRate || 0,
        salesUnits,
      });
      resetImageState();
      setDialogOpen(true);
    },
    [reset, resetImageState],
  );

  const openDeleteDialog = useCallback((product: Product) => {
    setDeletingProduct(product);
    setDeleteDialogOpen(true);
  }, []);

  const handleDialogOpenChange = useCallback(
    (open: boolean) => {
      setDialogOpen(open);
      if (!open) {
        resetImageState();
      }
    },
    [resetImageState],
  );

  const handleImageChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] || null;
      setSelectedImageFile(file);
      if (file) {
        setRemoveImage(false);
      }
      event.target.value = '';
    },
    [],
  );

  const onSubmit = useCallback(
    async (data: ProductFormData) => {
      try {
        const payload: ProductUpsertInput = {
          name: data.name,
          baseUnit: data.baseUnit,
          price: data.price,
          costPrice: data.costPrice || 0,
          pieceRate: data.pieceRate || 0,
          salesUnits: data.salesUnits || [],
          image: selectedImageFile,
          removeImage: !!editingProduct && !selectedImageFile && removeImage,
        };

        if (editingProduct) {
          await updateMutation.mutateAsync({
            id: editingProduct._id,
            data: payload,
          });
          toast({
            title: 'Muvaffaqiyatli',
            description: 'Mahsulot muvaffaqiyatli yangilandi',
          });
        } else {
          await createMutation.mutateAsync(payload);
          toast({
            title: 'Muvaffaqiyatli',
            description: 'Yangi mahsulot muvaffaqiyatli yaratildi',
          });
        }
        setDialogOpen(false);
        reset(EMPTY_PRODUCT_FORM_VALUES);
        resetImageState();
      } catch {
        toast({
          title: 'Xatolik',
          description: 'Amalni bajarishda xatolik yuz berdi',
          variant: 'destructive',
        });
      }
    },
    [editingProduct, createMutation, updateMutation, reset, selectedImageFile, removeImage, resetImageState],
  );

  const handleDelete = useCallback(async () => {
    if (!deletingProduct) return;
    try {
      await deleteMutation.mutateAsync(deletingProduct._id);
      toast({
        title: 'Muvaffaqiyatli',
        description: 'Mahsulot muvaffaqiyatli o\'chirildi',
      });
      setDeleteDialogOpen(false);
      setDeletingProduct(null);
    } catch {
      toast({
        title: 'Xatolik',
        description: 'O\'chirishda xatolik yuz berdi',
        variant: 'destructive',
      });
    }
  }, [deletingProduct, deleteMutation]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mahsulotlar</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Jami {totalCount} ta mahsulot
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          Yangi mahsulot
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Jami mahsulotlar"
          value={isLoadingProducts ? '...' : totalCount}
          icon={Package}
          iconColor="text-indigo-400"
          iconBg="bg-indigo-500/20"
          index={0}
        />
        <StatCard
          title="Umumiy zaxira"
          value={isLoadingProducts ? '...' : totalStock}
          icon={Warehouse}
          iconColor="text-blue-400"
          iconBg="bg-blue-500/20"
          index={1}
        />
        <StatCard
          title="Faol mahsulotlar"
          value={isLoadingProducts ? '...' : activeCount}
          icon={PackageCheck}
          iconColor="text-green-400"
          iconBg="bg-green-500/20"
          index={2}
        />
      </div>

      {/* Filters Row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Mahsulot nomi bo'yicha qidirish..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={sortBy}
          onValueChange={(value) => {
            setSortBy(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Saralash" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt">Sana bo'yicha</SelectItem>
            <SelectItem value="name">Nomi bo'yicha</SelectItem>
            <SelectItem value="currentStock">Zaxira bo'yicha</SelectItem>
            <SelectItem value="price">Narx bo'yicha</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Products Table */}
      <DataTableWrapper
        isLoading={isLoadingProducts}
        isEmpty={!isLoadingProducts && products.length === 0}
        emptyTitle="Mahsulotlar topilmadi"
        emptyDescription="Hozircha hech qanday mahsulot qo'shilmagan yoki qidiruv natijasi topilmadi"
      >
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Nomi</TableHead>
              <TableHead className="hidden sm:table-cell">O'lchov birligi</TableHead>
              <TableHead>Zaxira</TableHead>
              <TableHead className="hidden md:table-cell">Narx</TableHead>
              <TableHead className="hidden lg:table-cell">Tannarx</TableHead>
              <TableHead className="hidden md:table-cell">Sotuv birliklari</TableHead>
              <TableHead className="hidden sm:table-cell">Holat</TableHead>
              <TableHead className="w-12">Amallar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => {
              const unitSymbol = getUnitSymbol(product);

              return (
                <TableRow key={product._id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <ProductImage
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-10 w-10 shrink-0 rounded-xl border border-border/60 bg-background"
                        iconClassName="h-4 w-4"
                      />
                      <button
                        onClick={() => navigate(`/products/${product._id}`)}
                        className="font-medium text-foreground hover:text-indigo-400 transition-colors text-left"
                      >
                        {product.name}
                      </button>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">
                    {unitSymbol}
                  </TableCell>
                  <TableCell className="font-medium">{product.currentStock}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {formatCurrency(product.price)}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">
                    {formatCurrency((product as any).costPrice || 0)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {getSalesUnitsDisplay(product)}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant={product.isActive ? 'success' : 'secondary'}>
                      {product.isActive ? 'Faol' : 'Nofaol'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/products/${product._id}`)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Ko'rish
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditDialog(product)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Tahrirlash
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => openDeleteDialog(product)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          O'chirish
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot qo\'shish'}
            </DialogTitle>
            <DialogDescription>
              {editingProduct
                ? 'Mahsulot ma\'lumotlarini yangilang'
                : 'Yangi mahsulot ma\'lumotlarini kiriting'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">Asosiy</TabsTrigger>
                <TabsTrigger value="salesUnits">Sotuv birliklari</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="space-y-3">
                  <Label>Mahsulot rasmi</Label>
                  <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-border/70 bg-muted/20 p-4 sm:flex-row sm:items-center">
                    <ProductImage
                      src={effectivePreviewUrl}
                      alt={editingProduct?.name || 'Yangi mahsulot'}
                      className="h-24 w-24 rounded-2xl border border-border/70 bg-background"
                      iconClassName="h-8 w-8 text-muted-foreground"
                    />
                    <div className="flex-1 space-y-3">
                      <Input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleImageChange}
                        className="cursor-pointer"
                      />
                      <p className="text-xs text-muted-foreground">
                        PNG, JPG yoki WEBP format. Maksimal hajm: 5 MB.
                      </p>
                      {selectedImageFile && (
                        <div className="flex items-center justify-between gap-2 rounded-xl bg-background/80 px-3 py-2 text-xs text-muted-foreground">
                          <span className="truncate">{selectedImageFile.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => setSelectedImageFile(null)}
                          >
                            Bekor qilish
                          </Button>
                        </div>
                      )}
                      {editingProduct?.imageUrl && !selectedImageFile && (
                        <label className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Checkbox
                            checked={removeImage}
                            onCheckedChange={(checked) => setRemoveImage(checked === true)}
                          />
                          Joriy rasmni saqlashda olib tashlash
                        </label>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">
                    Nomi <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="Mahsulot nomi"
                    {...register('name')}
                  />
                  {errors.name && (
                    <p className="text-xs text-destructive">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>
                    O'lchov birligi <span className="text-destructive">*</span>
                  </Label>
                  <Controller
                    name="baseUnit"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="O'lchov birligini tanlang" />
                        </SelectTrigger>
                        <SelectContent>
                          {isLoadingUnits ? (
                            <SelectItem value="loading" disabled>
                              Yuklanmoqda...
                            </SelectItem>
                          ) : (
                            units?.map((unit) => (
                              <SelectItem key={unit._id} value={unit._id}>
                                {unit.name} ({unit.symbol})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.baseUnit && (
                    <p className="text-xs text-destructive">{errors.baseUnit.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">
                    Narx <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="price"
                    type="number"
                    min={0}
                    step="any"
                    placeholder="0"
                    {...register('price')}
                  />
                  {errors.price && (
                    <p className="text-xs text-destructive">{errors.price.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="costPrice">
                    Tannarx (UZS)
                  </Label>
                  <Input
                    id="costPrice"
                    type="number"
                    min={0}
                    step="any"
                    placeholder="0"
                    {...register('costPrice')}
                  />
                  {errors.costPrice && (
                    <p className="text-xs text-destructive">{errors.costPrice.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pieceRate">
                    Ishbay narxi (UZS)
                  </Label>
                  <Input
                    id="pieceRate"
                    type="number"
                    min={0}
                    step="any"
                    placeholder="0"
                    {...register('pieceRate')}
                  />
                  <p className="text-xs text-muted-foreground">
                    Ishbaychi xodimga har bir dona uchun to'lanadigan summa
                  </p>
                  {errors.pieceRate && (
                    <p className="text-xs text-destructive">{errors.pieceRate.message}</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="salesUnits" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <Label>Sotuv birliklari</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      appendSales({ unit: '', conversionFactor: 1, price: 0 })
                    }
                    className="gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Qo'shish
                  </Button>
                </div>

                {salesFields.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Sotuv birliklari qo'shilmagan. "Qo'shish" tugmasini bosing.
                  </div>
                )}

                {salesFields.map((field, index) => (
                  <div
                    key={field.id}
                    className="bg-muted/30 rounded-xl p-4 space-y-3 relative"
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSales(index)}
                      className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pr-8">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Birlik</Label>
                        <Controller
                          name={`salesUnits.${index}.unit`}
                          control={control}
                          render={({ field: selectField }) => (
                            <Select
                              value={selectField.value}
                              onValueChange={selectField.onChange}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Tanlang" />
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
                        {errors.salesUnits?.[index]?.unit && (
                          <p className="text-xs text-destructive">
                            {errors.salesUnits[index]?.unit?.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs">Konversiya</Label>
                        <Input
                          type="number"
                          min={0.001}
                          step="any"
                          placeholder="1"
                          className="h-9"
                          {...register(`salesUnits.${index}.conversionFactor`)}
                        />
                        {errors.salesUnits?.[index]?.conversionFactor && (
                          <p className="text-xs text-destructive">
                            {errors.salesUnits[index]?.conversionFactor?.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs">Narx</Label>
                        <Input
                          type="number"
                          min={0}
                          step="any"
                          placeholder="0"
                          className="h-9"
                          {...register(`salesUnits.${index}.price`)}
                        />
                        {errors.salesUnits?.[index]?.price && (
                          <p className="text-xs text-destructive">
                            {errors.salesUnits[index]?.price?.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </TabsContent>
            </Tabs>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDialogOpenChange(false)}
              >
                Bekor qilish
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <LoadingSpinner size="sm" className="mr-2 h-4 w-4" />
                )}
                {editingProduct ? 'Saqlash' : 'Qo\'shish'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Ishonchingiz kommi?"
        description={`"${deletingProduct?.name}" mahsulotini o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi.`}
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
        variant="destructive"
      />
    </div>
  );
}
