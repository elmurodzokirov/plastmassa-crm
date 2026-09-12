import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  RotateCcw,
} from 'lucide-react';
import type {
  Order,
  Customer,
  Return as ReturnEntity,
  User,
} from '@plastmassa/shared';
import { useReturns, useApproveReturn } from '@/hooks/use-returns';
import { usePermissions } from '@/hooks/use-permissions';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { DataTableWrapper } from '@/components/shared/data-table';
import { EmptyState } from '@/components/shared/empty-state';
import { StatCard } from '@/components/shared/stat-card';

const STATUS_MAP: Record<string, { label: string; variant: 'warning' | 'success' }> = {
  PENDING: { label: 'Kutilmoqda', variant: 'warning' },
  APPROVED: { label: 'Tasdiqlangan', variant: 'success' },
};

function getOrderNumber(order?: string | Order) {
  if (!order) {
    return null;
  }
  if (typeof order === 'string') {
    return order.slice(-6);
  }

  return order.orderNumber || order._id.slice(-6);
}

function getOrderId(order?: string | Order) {
  if (!order) {
    return null;
  }
  if (typeof order === 'string') {
    return order;
  }

  return order._id;
}

function getCustomerName(customer: string | Customer) {
  if (typeof customer === 'string') {
    return customer.slice(-6);
  }

  return customer.name;
}

function getUserName(user?: string | User) {
  if (!user) {
    return '-';
  }

  if (typeof user === 'string') {
    return user;
  }

  return user.fullName;
}

export default function ReturnsPage() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedReturn, setSelectedReturn] = useState<ReturnEntity | null>(null);
  const limit = 10;

  const canApproveReturns = can('returns:update');
  const query = {
    page,
    limit,
    ...(status !== 'all' ? { status } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
  };

  const { data, isLoading } = useReturns(query);
  const approveReturnMutation = useApproveReturn();
  const items = data?.items || [];

  const pendingCount = useMemo(
    () => items.filter((item) => item.status === 'PENDING').length,
    [items],
  );
  const approvedCount = useMemo(
    () => items.filter((item) => item.status === 'APPROVED').length,
    [items],
  );
  const totalAmount = useMemo(
    () => items.reduce((sum, item) => sum + item.totalAmount, 0),
    [items],
  );

  const handleApprove = async () => {
    if (!selectedReturn) {
      return;
    }

    try {
      await approveReturnMutation.mutateAsync(selectedReturn._id);
      toast({
        title: 'Muvaffaqiyatli',
        description: 'Qaytarish tasdiqlandi',
      });
      setSelectedReturn(null);
    } catch (error: any) {
      toast({
        title: 'Xatolik',
        description:
          error?.response?.data?.message || 'Qaytarishni tasdiqlashda xatolik yuz berdi',
        variant: 'destructive',
      });
    }
  };

  const resetFilters = () => {
    setStatus('all');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Qaytarishlar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tasdiqlanmagan qaytarishlar shu yerdan ko&apos;rib chiqiladi.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Joriy ro'yxat"
          value={items.length}
          icon={ClipboardList}
          iconColor="text-indigo-600 dark:text-indigo-400"
          index={0}
        />
        <StatCard
          title="Kutilayotganlar"
          value={pendingCount}
          icon={RotateCcw}
          iconColor="text-amber-600 dark:text-amber-400"
          index={1}
        />
        <StatCard
          title="Jami summa"
          value={formatCurrency(totalAmount)}
          icon={CheckCircle2}
          iconColor="text-emerald-600 dark:text-emerald-400"
          index={2}
          description={`Tasdiqlangan: ${approvedCount} ta`}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Holat" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Hammasi</SelectItem>
            <SelectItem value="PENDING">Kutilmoqda</SelectItem>
            <SelectItem value="APPROVED">Tasdiqlangan</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            setPage(1);
          }}
          className="w-full sm:w-40"
        />

        <Input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setPage(1);
          }}
          className="w-full sm:w-40"
        />

        {(status !== 'all' || dateFrom || dateTo) && (
          <Button variant="outline" onClick={resetFilters}>
            Filtrni tozalash
          </Button>
        )}
      </div>

      <DataTableWrapper
        isLoading={isLoading}
        isEmpty={!isLoading && items.length === 0}
        emptyTitle="Qaytarishlar topilmadi"
        emptyDescription="Tanlangan filtrlar bo'yicha qaytarishlar mavjud emas"
      >
        {items.length === 0 ? (
          <EmptyState
            icon={RotateCcw}
            title="Qaytarishlar topilmadi"
            description="Tanlangan filtrlarni o'zgartiring yoki keyinroq qayta tekshiring."
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_30px_rgba(15,23,42,0.05)]">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Sana</TableHead>
                  <TableHead>Buyurtma</TableHead>
                  <TableHead className="hidden lg:table-cell">Sabab</TableHead>
                  <TableHead className="hidden md:table-cell">Mahsulot</TableHead>
                  <TableHead>Summa</TableHead>
                  <TableHead>Holat</TableHead>
                  <TableHead className="hidden xl:table-cell">Yaratgan</TableHead>
                  <TableHead className="text-right">Amal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const statusInfo = STATUS_MAP[item.status] || STATUS_MAP.PENDING;
                  const orderNumber = getOrderNumber(item.order);
                  const orderId = getOrderId(item.order);

                  return (
                    <TableRow key={item._id}>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(item.createdAt), 'dd.MM.yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="font-medium">
                        {orderNumber ? `#${orderNumber}` : getCustomerName(item.customer)}
                      </TableCell>
                      <TableCell className="hidden max-w-[18rem] truncate text-muted-foreground lg:table-cell">
                        {item.reason}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">
                        {item.items.length} ta
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(item.totalAmount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground xl:table-cell">
                        {getUserName(item.createdBy)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          {orderId && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/orders/${orderId}`)}
                              className="gap-1"
                            >
                              <ArrowRight className="h-3.5 w-3.5" />
                              Buyurtma
                            </Button>
                          )}
                          {canApproveReturns && item.status === 'PENDING' && (
                            <Button
                              size="sm"
                              onClick={() => setSelectedReturn(item)}
                              className="gap-1"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Tasdiqlash
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </DataTableWrapper>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            disabled={page === 1}
          >
            Oldingi
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {data.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((prev) => Math.min(prev + 1, data.totalPages))}
            disabled={page >= data.totalPages}
          >
            Keyingi
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={!!selectedReturn}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedReturn(null);
          }
        }}
        title="Qaytarishni tasdiqlash"
        description={
          selectedReturn
            ? (() => {
                const orderNumber = getOrderNumber(selectedReturn.order);
                const target = orderNumber
                  ? `#${orderNumber} buyurtma uchun`
                  : `${getCustomerName(selectedReturn.customer)} mijoz uchun`;
                return `${target} ${formatCurrency(selectedReturn.totalAmount)} qaytarishni tasdiqlaysizmi?`;
              })()
            : ''
        }
        onConfirm={handleApprove}
        loading={approveReturnMutation.isPending}
      />
    </div>
  );
}
