import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Plus,
  Search,
  ShoppingCart,
  Clock,
  DollarSign,
  MoreHorizontal,
  Eye,
  FileText,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { Order, Customer } from '@plastmassa/shared';
import { cn, formatCurrency } from '@/lib/utils';
import { useOrders } from '@/hooks/use-orders';
import { usePermissions } from '@/hooks/use-permissions';
import { OrderQuery } from '@/api/orders';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

const STATUS_MAP: Record<string, { label: string; variant: 'warning' | 'default' | 'success' | 'destructive' }> = {
  PENDING: { label: 'Kutilmoqda', variant: 'warning' },
  CONFIRMED: { label: 'Tasdiqlangan', variant: 'default' },
  CANCELLED: { label: 'Bekor qilingan', variant: 'destructive' },
};

const PAYMENT_TYPE_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'warning' }> = {
  CASH: { label: 'Naqd', variant: 'default' },
  TRANSFER: { label: "O'tkazma", variant: 'secondary' },
  DEBT: { label: 'Nasiya', variant: 'warning' },
};

export default function OrdersPage() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [paymentType, setPaymentType] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const limit = 10;

  const debouncedSearch = useDebounce(search, 300);

  const queryParams: OrderQuery = {
    page,
    limit,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(status !== 'all' && { status }),
    ...(paymentType !== 'all' && { paymentType }),
    ...(dateFrom && { dateFrom }),
    ...(dateTo && { dateTo }),
    sortBy: 'createdAt',
    sortOrder: 'desc',
  };

  const { data: ordersData, isLoading } = useOrders(queryParams);

  // Fetch all orders for stat calculations (without pagination)
  const { data: allOrdersData } = useOrders({ limit: 9999 });

  const orders = ordersData?.items || [];
  const totalPages = ordersData?.totalPages || 1;
  const totalCount = ordersData?.total || 0;

  const allOrders = allOrdersData?.items || [];
  const pendingCount = allOrders.filter((o) => o.status === 'PENDING').length;
  const totalAmount = allOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const canCreateOrders = can('orders:create');

  const getCustomerName = (customer: string | Customer): string => {
    if (typeof customer === 'string') return customer;
    return customer.name;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Buyurtmalar</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Jami {totalCount} ta buyurtma
          </p>
        </div>
        {canCreateOrders && (
          <Button onClick={() => navigate('/orders/new')} className="gap-2">
            <Plus className="h-4 w-4" />
            Yangi buyurtma
          </Button>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Jami buyurtmalar"
          value={allOrders.length}
          icon={ShoppingCart}
          iconColor="text-indigo-400"
          iconBg="bg-indigo-500/20"
          index={0}
        />
        <StatCard
          title="Kutilmoqda"
          value={pendingCount}
          icon={Clock}
          iconColor="text-yellow-400"
          iconBg="bg-yellow-500/20"
          index={1}
        />
        <StatCard
          title="Jami summa"
          value={formatCurrency(totalAmount)}
          icon={DollarSign}
          iconColor="text-emerald-400"
          iconBg="bg-emerald-500/20"
          index={2}
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
            placeholder="Buyurtma raqami bo'yicha qidirish..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>

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
            <SelectItem value="CONFIRMED">Tasdiqlangan</SelectItem>
            <SelectItem value="CANCELLED">Bekor qilingan</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={paymentType}
          onValueChange={(value) => {
            setPaymentType(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="To'lov turi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Hammasi</SelectItem>
            <SelectItem value="CASH">Naqd</SelectItem>
            <SelectItem value="TRANSFER">O'tkazma</SelectItem>
            <SelectItem value="DEBT">Nasiya</SelectItem>
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

      {/* Orders Table */}
      <DataTableWrapper
        isLoading={isLoading}
        isEmpty={!isLoading && orders.length === 0}
        emptyTitle="Buyurtmalar topilmadi"
        emptyDescription="Hozircha hech qanday buyurtma qo'shilmagan yoki qidiruv natijasi topilmadi"
      >
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Buyurtma #</TableHead>
              <TableHead>Mijoz</TableHead>
              <TableHead className="hidden md:table-cell">Sana</TableHead>
              <TableHead className="hidden lg:table-cell">Mahsulotlar</TableHead>
              <TableHead>Jami summa</TableHead>
              <TableHead className="hidden sm:table-cell">To'langan</TableHead>
              <TableHead className="hidden sm:table-cell">Qoldiq</TableHead>
              <TableHead>Holat</TableHead>
              <TableHead className="hidden lg:table-cell">To'lov turi</TableHead>
              <TableHead className="w-12">Amallar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => {
              const remaining = order.totalAmount - order.paidAmount;
              const statusInfo = STATUS_MAP[order.status] || {
                label: order.status,
                variant: 'secondary' as const,
              };
              const paymentInfo = PAYMENT_TYPE_MAP[order.paymentType] || {
                label: order.paymentType,
                variant: 'secondary' as const,
              };

              return (
                <TableRow
                  key={order._id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/orders/${order._id}`)}
                >
                  <TableCell className="font-bold text-indigo-400">
                    {order.orderNumber}
                  </TableCell>
                  <TableCell className="font-medium">
                    {getCustomerName(order.customer)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {format(new Date(order.createdAt), 'dd.MM.yyyy')}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">
                    {order.items.length} ta mahsulot
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(order.totalAmount)}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span className="text-green-400">
                      {formatCurrency(order.paidAmount)}
                    </span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span className={cn(remaining > 0 ? 'text-red-400 font-medium' : 'text-muted-foreground')}>
                      {formatCurrency(remaining)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Badge variant={paymentInfo.variant}>{paymentInfo.label}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/orders/${order._id}`);
                          }}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Ko'rish
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/orders/${order._id}/check`);
                          }}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          Check
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/orders/${order._id}`, { state: { changeStatus: true } });
                          }}
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Holatni o'zgartirish
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
    </div>
  );
}
