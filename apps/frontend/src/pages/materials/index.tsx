import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  Search,
  Boxes,
  PackageCheck,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Wallet,
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { Material, Unit } from '@plastmassa/shared';
import { formatCurrency, cn } from '@/lib/utils';
import {
  useMaterials,
  useCreateMaterial,
  useUpdateMaterial,
  useDeleteMaterial,
  useMaterialStats,
  useMaterialCategories,
} from '@/hooks/use-materials';
import { useUnits } from '@/hooks/use-units';
import { useSuppliers } from '@/hooks/use-suppliers';
import { MaterialQuery } from '@/api/materials';
import { toast } from '@/components/ui/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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

import { StatCard } from '@/components/shared/stat-card';
import { DataTableWrapper } from '@/components/shared/data-table';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

const materialSchema = z.object({
  name: z.string().min(1, 'Nomi kiritish majburiy'),
  baseUnit: z.string().min(1, 'O\'lchov birligini tanlang'),
  category: z.string().optional(),
  minStock: z.coerce.number().min(0, 'Minimal zaxira 0 dan kam bo\'lmasligi kerak').optional(),
  defaultSupplier: z.string().optional(),
});

type MaterialFormData = z.infer<typeof materialSchema>;

const EMPTY_FORM_VALUES: MaterialFormData = {
  name: '',
  baseUnit: '',
  category: '',
  minStock: 0,
  defaultSupplier: '',
};

export default function MaterialsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const limit = 10;

  const debouncedSearch = useDebounce(search, 300);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingMaterial, setDeletingMaterial] = useState<Material | null>(null);

  const queryParams: MaterialQuery = {
    page,
    limit,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(categoryFilter !== 'all' && { category: categoryFilter }),
    ...(lowStockFilter && { lowStock: true }),
    sortBy: 'createdAt',
    sortOrder: 'desc',
  };

  const { data: materialsData, isLoading } = useMaterials(queryParams);
  const { data: units, isLoading: isLoadingUnits } = useUnits();
  const { data: stats } = useMaterialStats();
  const { data: categories } = useMaterialCategories();
  const { data: suppliersData } = useSuppliers({ limit: 200, isActive: true });
  const suppliers = suppliersData?.items || [];
  const createMutation = useCreateMaterial();
  const updateMutation = useUpdateMaterial();
  const deleteMutation = useDeleteMaterial();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<MaterialFormData>({
    resolver: zodResolver(materialSchema),
    defaultValues: EMPTY_FORM_VALUES,
  });

  const materials = materialsData?.items || [];
  const totalPages = materialsData?.totalPages || 1;
  const totalCount = materialsData?.total || 0;

  const activeCount = useMemo(() => materials.filter((m) => m.isActive).length, [materials]);

  const getUnitSymbol = (material: Material): string => {
    if (typeof material.baseUnit === 'object' && material.baseUnit !== null) {
      return (material.baseUnit as Unit).symbol;
    }
    const unit = units?.find((u) => u._id === material.baseUnit);
    return unit?.symbol || '';
  };

  const isLowStock = (material: Material): boolean => {
    return !!material.minStock && material.minStock > 0 && material.currentStock <= material.minStock;
  };

  const openCreateDialog = useCallback(() => {
    setEditingMaterial(null);
    reset(EMPTY_FORM_VALUES);
    setDialogOpen(true);
  }, [reset]);

  const openEditDialog = useCallback(
    (material: Material) => {
      setEditingMaterial(material);
      const baseUnitId =
        typeof material.baseUnit === 'object' && material.baseUnit !== null
          ? (material.baseUnit as Unit)._id
          : material.baseUnit;
      const defaultSupplierId =
        typeof material.defaultSupplier === 'object' && material.defaultSupplier !== null
          ? material.defaultSupplier._id
          : material.defaultSupplier;
      reset({
        name: material.name,
        baseUnit: baseUnitId as string,
        category: material.category || '',
        minStock: material.minStock || 0,
        defaultSupplier: defaultSupplierId || '',
      });
      setDialogOpen(true);
    },
    [reset],
  );

  const openDeleteDialog = useCallback((material: Material) => {
    setDeletingMaterial(material);
    setDeleteDialogOpen(true);
  }, []);

  const onSubmit = useCallback(
    async (data: MaterialFormData) => {
      try {
        const payload = {
          name: data.name,
          baseUnit: data.baseUnit,
          category: data.category || undefined,
          minStock: data.minStock || 0,
          defaultSupplier: data.defaultSupplier || undefined,
        };

        if (editingMaterial) {
          await updateMutation.mutateAsync({ id: editingMaterial._id, data: payload });
          toast({ title: 'Muvaffaqiyatli', description: 'Xom-ashyo muvaffaqiyatli yangilandi' });
        } else {
          await createMutation.mutateAsync(payload);
          toast({ title: 'Muvaffaqiyatli', description: 'Yangi xom-ashyo muvaffaqiyatli yaratildi' });
        }
        setDialogOpen(false);
        reset(EMPTY_FORM_VALUES);
      } catch {
        toast({ title: 'Xatolik', description: 'Amalni bajarishda xatolik yuz berdi', variant: 'destructive' });
      }
    },
    [editingMaterial, createMutation, updateMutation, reset],
  );

  const handleDelete = useCallback(async () => {
    if (!deletingMaterial) return;
    try {
      await deleteMutation.mutateAsync(deletingMaterial._id);
      toast({ title: 'Muvaffaqiyatli', description: 'Xom-ashyo muvaffaqiyatli o\'chirildi' });
      setDeleteDialogOpen(false);
      setDeletingMaterial(null);
    } catch {
      toast({ title: 'Xatolik', description: 'O\'chirishda xatolik yuz berdi', variant: 'destructive' });
    }
  }, [deletingMaterial, deleteMutation]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Xom-ashyo</h1>
          <p className="text-sm text-muted-foreground mt-1">Jami {totalCount} ta xom-ashyo</p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          Yangi xom-ashyo
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Jami xom-ashyo turlari"
          value={isLoading ? '...' : totalCount}
          icon={Boxes}
          iconColor="text-indigo-400"
          iconBg="bg-indigo-500/20"
          index={0}
        />
        <StatCard
          title="Faol"
          value={isLoading ? '...' : activeCount}
          icon={PackageCheck}
          iconColor="text-green-400"
          iconBg="bg-green-500/20"
          index={1}
        />
        <StatCard
          title="Ombor qiymati"
          value={stats ? formatCurrency(stats.inventoryValue) : '...'}
          icon={Wallet}
          iconColor="text-emerald-400"
          iconBg="bg-emerald-500/20"
          index={2}
        />
        <StatCard
          title="Kam qolganlar"
          value={stats ? stats.lowStockCount : '...'}
          icon={AlertTriangle}
          iconColor="text-amber-400"
          iconBg="bg-amber-500/20"
          index={3}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Xom-ashyo nomi bo'yicha qidirish..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select
          value={categoryFilter}
          onValueChange={(value) => { setCategoryFilter(value); setPage(1); }}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Kategoriya" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barcha kategoriyalar</SelectItem>
            {categories?.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant={lowStockFilter ? 'default' : 'outline'}
          onClick={() => { setLowStockFilter((v) => !v); setPage(1); }}
          className="gap-2"
        >
          <AlertTriangle className="h-4 w-4" />
          Kam qolganlar
        </Button>
      </motion.div>

      <DataTableWrapper
        isLoading={isLoading}
        isEmpty={!isLoading && materials.length === 0}
        emptyTitle="Xom-ashyo topilmadi"
        emptyDescription="Hozircha hech qanday xom-ashyo qo'shilmagan yoki qidiruv natijasi topilmadi"
      >
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Nomi</TableHead>
              <TableHead className="hidden md:table-cell">Kategoriya</TableHead>
              <TableHead className="hidden sm:table-cell">O'lchov birligi</TableHead>
              <TableHead>Zaxira</TableHead>
              <TableHead className="hidden md:table-cell">Joriy narx</TableHead>
              <TableHead className="hidden sm:table-cell">Holat</TableHead>
              <TableHead className="w-12">Amallar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {materials.map((material) => {
              const unitSymbol = getUnitSymbol(material);
              return (
                <TableRow key={material._id}>
                  <TableCell>
                    <button
                      onClick={() => navigate(`/materials/${material._id}`)}
                      className="font-medium text-foreground hover:text-indigo-400 transition-colors text-left"
                    >
                      {material.name}
                    </button>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {material.category || '-'}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">
                    {unitSymbol}
                  </TableCell>
                  <TableCell className="font-medium">
                    <span className={cn('inline-flex items-center gap-1.5', isLowStock(material) && 'text-amber-400')}>
                      {material.currentStock}
                      {isLowStock(material) && <AlertTriangle className="h-3.5 w-3.5" />}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {formatCurrency(material.costPrice)}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant={material.isActive ? 'success' : 'secondary'}>
                      {material.isActive ? 'Faol' : 'Nofaol'}
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
                        <DropdownMenuItem onClick={() => navigate(`/materials/${material._id}`)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Ko'rish
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditDialog(material)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Tahrirlash
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => openDeleteDialog(material)}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingMaterial ? 'Xom-ashyoni tahrirlash' : 'Yangi xom-ashyo qo\'shish'}</DialogTitle>
            <DialogDescription>
              {editingMaterial ? 'Xom-ashyo ma\'lumotlarini yangilang' : 'Yangi xom-ashyo ma\'lumotlarini kiriting'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nomi <span className="text-destructive">*</span></Label>
              <Input id="name" placeholder="Xom-ashyo nomi" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>O'lchov birligi <span className="text-destructive">*</span></Label>
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
                        <SelectItem value="loading" disabled>Yuklanmoqda...</SelectItem>
                      ) : (
                        units?.map((unit) => (
                          <SelectItem key={unit._id} value={unit._id}>{unit.name} ({unit.symbol})</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.baseUnit && <p className="text-xs text-destructive">{errors.baseUnit.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Kategoriya</Label>
              <Input id="category" list="material-categories" placeholder="Masalan: Granula" {...register('category')} />
              <datalist id="material-categories">
                {categories?.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minStock">Minimal zaxira</Label>
              <Input id="minStock" type="number" min={0} step="any" placeholder="0" {...register('minStock')} />
              {errors.minStock && <p className="text-xs text-destructive">{errors.minStock.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Asosiy yetkazib beruvchi</Label>
              <Controller
                name="defaultSupplier"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || 'none'}
                    onValueChange={(value) => field.onChange(value === 'none' ? '' : value)}
                  >
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
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Bekor qilish</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) && <LoadingSpinner size="sm" className="mr-2 h-4 w-4" />}
                {editingMaterial ? 'Saqlash' : 'Qo\'shish'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Ishonchingiz kommi?"
        description={`"${deletingMaterial?.name}" xom-ashyosini o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi.`}
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
        variant="destructive"
      />
    </div>
  );
}
