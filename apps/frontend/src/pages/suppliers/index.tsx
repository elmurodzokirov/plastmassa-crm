import { useState, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  Search,
  Wallet,
  Truck,
  MoreHorizontal,
  Pencil,
  Trash2,
  Filter,
  Scale,
} from 'lucide-react';
import type { Supplier } from '@plastmassa/shared';
import { formatCurrency } from '@/lib/utils';
import {
  useSuppliers,
  useCreateSupplier,
  useUpdateSupplier,
  useDeleteSupplier,
  useSetSupplierBalance,
} from '@/hooks/use-suppliers';
import { SupplierQuery } from '@/api/suppliers';
import { toast } from '@/components/ui/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { FormField } from '@/components/shared/form-field';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

const supplierSchema = z.object({
  name: z.string().min(1, 'Nomi kiritish majburiy'),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  openingBalance: z.coerce.number().optional(),
});

type SupplierFormData = z.infer<typeof supplierSchema>;

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export default function SuppliersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [hasDebt, setHasDebt] = useState(false);
  const limit = 10;

  const debouncedSearch = useDebounce(search, 300);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);
  const [balanceDialogOpen, setBalanceDialogOpen] = useState(false);
  const [balanceSupplier, setBalanceSupplier] = useState<Supplier | null>(null);
  const [balanceValue, setBalanceValue] = useState('0');

  const queryParams: SupplierQuery = {
    page,
    limit,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(hasDebt && { hasDebt: true }),
    sortBy: 'createdAt',
    sortOrder: 'desc',
  };

  const { data: suppliersData, isLoading } = useSuppliers(queryParams);
  const createMutation = useCreateSupplier();
  const updateMutation = useUpdateSupplier();
  const deleteMutation = useDeleteSupplier();
  const setBalanceMutation = useSetSupplierBalance();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
  });

  const openCreateDialog = useCallback(() => {
    setEditingSupplier(null);
    reset({ name: '', phone: '', address: '', notes: '', openingBalance: 0 });
    setDialogOpen(true);
  }, [reset]);

  const openEditDialog = useCallback(
    (supplier: Supplier) => {
      setEditingSupplier(supplier);
      reset({
        name: supplier.name,
        phone: supplier.phone || '',
        address: supplier.address || '',
        notes: supplier.notes || '',
      });
      setDialogOpen(true);
    },
    [reset],
  );

  const openDeleteDialog = useCallback((supplier: Supplier) => {
    setDeletingSupplier(supplier);
    setDeleteDialogOpen(true);
  }, []);

  const openBalanceDialog = useCallback((supplier: Supplier) => {
    setBalanceSupplier(supplier);
    setBalanceValue(String(supplier.currentDebt || 0));
    setBalanceDialogOpen(true);
  }, []);

  const handleSetBalance = useCallback(async () => {
    if (!balanceSupplier) return;
    const amount = Number(balanceValue);
    if (Number.isNaN(amount)) {
      toast({ title: 'Xatolik', description: "Saldo qiymati noto'g'ri", variant: 'destructive' });
      return;
    }
    try {
      await setBalanceMutation.mutateAsync({ id: balanceSupplier._id, amount });
      toast({ title: 'Muvaffaqiyatli', description: 'Saldo yangilandi' });
      setBalanceDialogOpen(false);
      setBalanceSupplier(null);
    } catch {
      toast({ title: 'Xatolik', description: 'Saldoni yangilashda xatolik yuz berdi', variant: 'destructive' });
    }
  }, [balanceSupplier, balanceValue, setBalanceMutation]);

  const onSubmit = useCallback(
    async (data: SupplierFormData) => {
      try {
        const { openingBalance, ...rest } = data;
        if (editingSupplier) {
          await updateMutation.mutateAsync({ id: editingSupplier._id, data: rest });
          toast({
            title: 'Muvaffaqiyatli',
            description: "Yetkazib beruvchi yangilandi",
          });
        } else {
          await createMutation.mutateAsync({ ...rest, currentDebt: openingBalance || 0 });
          toast({
            title: 'Muvaffaqiyatli',
            description: "Yangi yetkazib beruvchi yaratildi",
          });
        }
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
    [editingSupplier, createMutation, updateMutation, reset],
  );

  const handleDelete = useCallback(async () => {
    if (!deletingSupplier) return;
    try {
      await deleteMutation.mutateAsync(deletingSupplier._id);
      toast({
        title: 'Muvaffaqiyatli',
        description: "Yetkazib beruvchi o'chirildi",
      });
      setDeleteDialogOpen(false);
      setDeletingSupplier(null);
    } catch {
      toast({
        title: 'Xatolik',
        description: "O'chirishda xatolik yuz berdi",
        variant: 'destructive',
      });
    }
  }, [deletingSupplier, deleteMutation]);

  const suppliers = suppliersData?.items || [];
  const totalPages = suppliersData?.totalPages || 1;
  const totalCount = suppliersData?.total || 0;
  const totalDebt = suppliers.reduce(
    (sum, s) => sum + (s.currentDebt > 0 ? s.currentDebt : 0),
    0,
  );
  const debtorCount = suppliers.filter((s) => s.currentDebt > 0).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Yetkazib beruvchilar"
        actions={
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            Yangi yetkazib beruvchi
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Jami qarzimiz"
          value={formatCurrency(totalDebt)}
          icon={Wallet}
          iconColor="text-red-600 dark:text-red-400"
          index={0}
        />
        <StatCard
          label="Qarzdor yetkazib beruvchilar"
          value={debtorCount}
          icon={Truck}
          iconColor="text-amber-600 dark:text-amber-400"
          index={1}
        />
        <StatCard
          label="Jami soni"
          value={totalCount}
          icon={Truck}
          iconColor="text-indigo-600 dark:text-indigo-400"
          index={2}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Nomi yoki telefon bo'yicha qidirish..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="border-border/80 bg-card pl-10 shadow-sm"
          />
        </div>
        <Button
          variant={hasDebt ? 'default' : 'outline'}
          onClick={() => {
            setHasDebt(!hasDebt);
            setPage(1);
          }}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Qarzdorlar
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      ) : suppliers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
            <Truck className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground">
            Yetkazib beruvchilar topilmadi
          </h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm">
            Hozircha hech qanday yetkazib beruvchi qo'shilmagan yoki qidiruv
            natijasi topilmadi
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_30px_rgba(15,23,42,0.05)]">
          <Table>
            <TableHeader className="bg-muted/35">
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-11 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Nomi
                </TableHead>
                <TableHead className="hidden sm:table-cell h-11 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Telefon
                </TableHead>
                <TableHead className="hidden md:table-cell h-11 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Manzil
                </TableHead>
                <TableHead className="h-11 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Qarzimiz
                </TableHead>
                <TableHead className="hidden sm:table-cell h-11 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Holat
                </TableHead>
                <TableHead className="w-12 h-11" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((supplier) => (
                <TableRow key={supplier._id} className="hover:bg-muted/30">
                  <TableCell className="font-medium">{supplier.name}</TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">
                    {supplier.phone || '-'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    <span className="max-w-[200px] truncate block">
                      {supplier.address || '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={supplier.currentDebt > 0 ? 'error' : 'success'}>
                      {formatCurrency(supplier.currentDebt)}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant={supplier.isActive ? 'success' : 'secondary'}>
                      {supplier.isActive ? 'Faol' : 'Nofaol'}
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
                        <DropdownMenuItem onClick={() => openEditDialog(supplier)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Tahrirlash
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openBalanceDialog(supplier)}>
                          <Scale className="mr-2 h-4 w-4" />
                          Saldoni tuzatish
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => openDeleteDialog(supplier)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          O'chirish
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {(page - 1) * limit + 1}-{Math.min(page * limit, totalCount)} /{' '}
            {totalCount}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="h-8 w-8"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </Button>
            <span className="text-sm text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="h-8 w-8"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </Button>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingSupplier
                ? 'Yetkazib beruvchini tahrirlash'
                : "Yangi yetkazib beruvchi qo'shish"}
            </DialogTitle>
            <DialogDescription>
              {editingSupplier
                ? "Yetkazib beruvchi ma'lumotlarini yangilang"
                : "Yangi yetkazib beruvchi ma'lumotlarini kiriting"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Nomi" required error={errors.name?.message}>
                <Input placeholder="Yetkazib beruvchi nomi" {...register('name')} />
              </FormField>
              <FormField label="Telefon">
                <Input placeholder="+998 90 123 45 67" {...register('phone')} />
              </FormField>
            </div>

            <FormField label="Manzil">
              <Input placeholder="Manzil" {...register('address')} />
            </FormField>

            {!editingSupplier && (
              <FormField
                label="Boshlang'ich saldo"
                error={errors.openingBalance?.message}
              >
                <Input
                  type="number"
                  placeholder="0"
                  {...register('openingBalance')}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Yetkazib beruvchining tizimga qo'shilishidan oldingi joriy qarzimiz (ixtiyoriy)
                </p>
              </FormField>
            )}

            <FormField label="Izoh">
              <Textarea
                placeholder="Qo'shimcha ma'lumot..."
                rows={3}
                {...register('notes')}
              />
            </FormField>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
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
                {editingSupplier ? 'Saqlash' : "Qo'shish"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Ishonchingiz kommi?"
        description={`"${deletingSupplier?.name}" yetkazib beruvchisini o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi.`}
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
        variant="destructive"
      />

      {/* Saldoni tuzatish */}
      <Dialog open={balanceDialogOpen} onOpenChange={setBalanceDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Saldoni tuzatish</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">{balanceSupplier?.name}</span> uchun joriy qarzimiz
              summasini kiriting
            </DialogDescription>
          </DialogHeader>
          <FormField label="Joriy qarz">
            <Input
              type="number"
              value={balanceValue}
              onChange={(e) => setBalanceValue(e.target.value)}
              placeholder="0"
            />
          </FormField>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setBalanceDialogOpen(false)}
            >
              Bekor qilish
            </Button>
            <Button onClick={handleSetBalance} disabled={setBalanceMutation.isPending}>
              {setBalanceMutation.isPending && (
                <LoadingSpinner size="sm" className="mr-2 h-4 w-4" />
              )}
              Saqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
