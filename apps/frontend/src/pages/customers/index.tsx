import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  Search,
  Wallet,
  Users,
  TrendingUp,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Filter,
} from 'lucide-react';
import type { Customer } from '@plastmassa/shared';
import { cn, formatCurrency } from '@/lib/utils';
import {
  useCustomers,
  useDebtSummary,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
} from '@/hooks/use-customers';
import { CustomerQuery } from '@/api/customers';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

const customerSchema = z.object({
  name: z.string().min(1, 'Ism kiritish majburiy'),
  phone: z.string().optional(),
  address: z.string().optional(),
  debtLimit: z.coerce
    .number()
    .min(0, "Qarz limiti 0 dan kam bo'lmasligi kerak")
    .optional(),
  notes: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

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

export default function CustomersPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [hasDebt, setHasDebt] = useState(false);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder] = useState<'asc' | 'desc'>('desc');
  const limit = 10;

  const debouncedSearch = useDebounce(search, 300);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(
    null,
  );

  const queryParams: CustomerQuery = {
    page,
    limit,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(hasDebt && { hasDebt: true }),
    sortBy,
    sortOrder,
  };

  const { data: customersData, isLoading: isLoadingCustomers } =
    useCustomers(queryParams);
  const { data: debtSummary, isLoading: isLoadingDebt } = useDebtSummary();
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const deleteMutation = useDeleteCustomer();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
  });

  const openCreateDialog = useCallback(() => {
    setEditingCustomer(null);
    reset({ name: '', phone: '', address: '', debtLimit: 0, notes: '' });
    setDialogOpen(true);
  }, [reset]);

  const openEditDialog = useCallback(
    (customer: Customer) => {
      setEditingCustomer(customer);
      reset({
        name: customer.name,
        phone: customer.phone || '',
        address: customer.address || '',
        debtLimit: customer.debtLimit,
        notes: customer.notes || '',
      });
      setDialogOpen(true);
    },
    [reset],
  );

  const openDeleteDialog = useCallback((customer: Customer) => {
    setDeletingCustomer(customer);
    setDeleteDialogOpen(true);
  }, []);

  const onSubmit = useCallback(
    async (data: CustomerFormData) => {
      try {
        if (editingCustomer) {
          await updateMutation.mutateAsync({ id: editingCustomer._id, data });
          toast({
            title: 'Muvaffaqiyatli',
            description: 'Mijoz muvaffaqiyatli yangilandi',
          });
        } else {
          await createMutation.mutateAsync(data);
          toast({
            title: 'Muvaffaqiyatli',
            description: 'Yangi mijoz muvaffaqiyatli yaratildi',
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
    [editingCustomer, createMutation, updateMutation, reset],
  );

  const handleDelete = useCallback(async () => {
    if (!deletingCustomer) return;
    try {
      await deleteMutation.mutateAsync(deletingCustomer._id);
      toast({
        title: 'Muvaffaqiyatli',
        description: "Mijoz muvaffaqiyatli o'chirildi",
      });
      setDeleteDialogOpen(false);
      setDeletingCustomer(null);
    } catch {
      toast({
        title: 'Xatolik',
        description: "O'chirishda xatolik yuz berdi",
        variant: 'destructive',
      });
    }
  }, [deletingCustomer, deleteMutation]);

  const customers = customersData?.items || [];
  const totalPages = customersData?.totalPages || 1;
  const totalCount = customersData?.total || 0;

  const getDebtPercentage = (currentDebt: number, debtLimit: number): number => {
    if (debtLimit <= 0) return 0;
    return Math.min((currentDebt / debtLimit) * 100, 100);
  };

  const getDebtBarColor = (percentage: number): string => {
    if (percentage >= 80) return 'bg-red-500';
    if (percentage >= 50) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Mijozlar"
        actions={
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            Yangi mijoz
          </Button>
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Jami qarz"
          value={
            isLoadingDebt ? '...' : formatCurrency(debtSummary?.totalDebt || 0)
          }
          icon={Wallet}
          iconColor="text-red-600 dark:text-red-400"
          index={0}
        />
        <StatCard
          label="Qarzdorlar soni"
          value={isLoadingDebt ? '...' : debtSummary?.debtorCount || 0}
          icon={Users}
          iconColor="text-amber-600 dark:text-amber-400"
          index={1}
        />
        <StatCard
          label="O'rtacha qarz"
          value={
            isLoadingDebt
              ? '...'
              : formatCurrency(debtSummary?.averageDebt || 0)
          }
          icon={TrendingUp}
          iconColor="text-indigo-600 dark:text-indigo-400"
          index={2}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Ism yoki telefon bo'yicha qidirish..."
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
            <SelectItem value="name">Ism bo'yicha</SelectItem>
            <SelectItem value="currentDebt">Qarz bo'yicha</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoadingCustomers ? (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      ) : customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground">
            Mijozlar topilmadi
          </h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm">
            Hozircha hech qanday mijoz qo'shilmagan yoki qidiruv natijasi
            topilmadi
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_30px_rgba(15,23,42,0.05)]">
          <Table>
            <TableHeader className="bg-muted/35">
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-11 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Ism
                </TableHead>
                <TableHead className="hidden sm:table-cell h-11 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Telefon
                </TableHead>
                <TableHead className="hidden md:table-cell h-11 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Manzil
                </TableHead>
                <TableHead className="h-11 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Joriy qarz
                </TableHead>
                <TableHead className="hidden lg:table-cell h-11 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Qarz limiti
                </TableHead>
                <TableHead className="hidden sm:table-cell h-11 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Holat
                </TableHead>
                <TableHead className="w-12 h-11" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => {
                const debtPercentage = getDebtPercentage(
                  customer.currentDebt,
                  customer.debtLimit,
                );
                const debtBarColor = getDebtBarColor(debtPercentage);

                return (
                  <TableRow
                    key={customer._id}
                    className="cursor-pointer hover:bg-muted/30"
                    onClick={() => navigate(`/customers/${customer._id}`)}
                  >
                    <TableCell className="font-medium">
                      {customer.name}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {customer.phone || '-'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      <span className="max-w-[200px] truncate block">
                        {customer.address || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1.5">
                        <Badge
                          variant={
                            customer.currentDebt > 0 ? 'error' : 'success'
                          }
                        >
                          {formatCurrency(customer.currentDebt)}
                        </Badge>
                        {customer.debtLimit > 0 && (
                          <div className="w-full max-w-[100px] h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all duration-500',
                                debtBarColor,
                              )}
                              style={{ width: `${debtPercentage}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {formatCurrency(customer.debtLimit)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge
                        variant={customer.isActive ? 'success' : 'secondary'}
                      >
                        {customer.isActive ? 'Faol' : 'Nofaol'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          asChild
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/customers/${customer._id}`);
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Ko'rish
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditDialog(customer);
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Tahrirlash
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDeleteDialog(customer);
                            }}
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
        </div>
      )}

      {/* Pagination */}
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? 'Mijozni tahrirlash' : "Yangi mijoz qo'shish"}
            </DialogTitle>
            <DialogDescription>
              {editingCustomer
                ? "Mijoz ma'lumotlarini yangilang"
                : "Yangi mijoz ma'lumotlarini kiriting"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label="Ism"
                required
                error={errors.name?.message}
              >
                <Input placeholder="Mijoz ismi" {...register('name')} />
              </FormField>
              <FormField label="Telefon">
                <Input
                  placeholder="+998 90 123 45 67"
                  {...register('phone')}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Manzil">
                <Input placeholder="Mijoz manzili" {...register('address')} />
              </FormField>
              <FormField
                label="Qarz limiti"
                error={errors.debtLimit?.message}
              >
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  {...register('debtLimit')}
                />
              </FormField>
            </div>

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
                disabled={
                  createMutation.isPending || updateMutation.isPending
                }
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <LoadingSpinner size="sm" className="mr-2 h-4 w-4" />
                )}
                {editingCustomer ? 'Saqlash' : "Qo'shish"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Ishonchingiz kommi?"
        description={`"${deletingCustomer?.name}" mijozini o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi.`}
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
        variant="destructive"
      />
    </div>
  );
}
