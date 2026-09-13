import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  FileText,
  Printer,
  Pencil,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
  Phone,
  Calendar,
  CreditCard,
  Banknote,
  DollarSign,
  Truck,
  Clock,
  Hash,
  RotateCcw,
  History,
  Undo2,
} from 'lucide-react';
import type { Customer, User as UserType, Payment, PaymentMethodType, Return as ReturnEntity } from '@plastmassa/shared';
import { cn, formatCurrency } from '@/lib/utils';
import { useOrder, useUpdateOrderStatus, useDeliverOrder } from '@/hooks/use-orders';
import { usePaymentsByOrder, useCreatePayment } from '@/hooks/use-payments';
import { useReturns, useCreateReturn } from '@/hooks/use-returns';
import { usePermissions } from '@/hooks/use-permissions';
import { toast } from '@/components/ui/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

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

const PAYMENT_METHOD_MAP: Record<string, string> = {
  CASH: 'Naqd',
  TRANSFER: "O'tkazma",
  CARD: 'Karta',
};

const paymentSchema = z.object({
  amount: z.coerce.number().min(1, "Summa 0 dan katta bo'lishi kerak"),
  type: z.enum(['CASH', 'TRANSFER', 'CARD']),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface ReturnDraftItem {
  productId: string;
  productName: string;
  unitId: string;
  unitName: string;
  maxQuantity: number;
  quantity: number;
  price: number;
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { can } = usePermissions();
  const canUpdateOrders = can('orders:update');
  const canCreatePayments = can('finance:create');
  const canCreateReturns = can('returns:create');
  const canReadReturns = can('returns:read');

  const { data: order, isLoading, isError } = useOrder(id || '');
  const { data: paymentsData, isLoading: isLoadingPayments } = usePaymentsByOrder(id || '');
  const { data: returnsData, isLoading: isLoadingReturns } = useReturns(
    id ? { order: id, limit: 50 } : undefined,
    !!id && canReadReturns,
  );
  const payments = Array.isArray(paymentsData) ? paymentsData : (paymentsData as any)?.items || [];
  const returns = Array.isArray((returnsData as any)?.items) ? (returnsData as any).items as ReturnEntity[] : [];
  const updateStatusMutation = useUpdateOrderStatus();
  const createPaymentMutation = useCreatePayment();
  const createReturnMutation = useCreateReturn();
  const deliverMutation = useDeliverOrder();

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [deliverDialogOpen, setDeliverDialogOpen] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [deliveredTo, setDeliveredTo] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [returnItems, setReturnItems] = useState<ReturnDraftItem[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      type: 'CASH',
      amount: 0,
    },
  });

  const getCustomer = (customer: string | Customer): Customer | null => {
    if (typeof customer === 'string') return null;
    return customer;
  };

  const getCreatedByName = (user: string | UserType): string => {
    if (typeof user === 'string') return user;
    return user.fullName;
  };

  const getEntityId = (value: { _id: string } | string): string => {
    if (typeof value === 'string') {
      return value;
    }

    return value._id;
  };

  const handleStatusChange = useCallback(
    (newStatus: string) => {
      setPendingStatus(newStatus);
      setConfirmDialogOpen(true);
    },
    [],
  );

  const confirmStatusChange = useCallback(async () => {
    if (!id || !pendingStatus || !canUpdateOrders) return;
    try {
      await updateStatusMutation.mutateAsync({ id, status: pendingStatus });
      toast({
        title: 'Muvaffaqiyatli',
        description: "Buyurtma holati muvaffaqiyatli o'zgartirildi",
      });
      setConfirmDialogOpen(false);
      setPendingStatus(null);
    } catch (error: any) {
      toast({
        title: 'Xatolik',
        description:
          error?.response?.data?.message || "Holatni o'zgartirishda xatolik yuz berdi",
        variant: 'destructive',
      });
    }
  }, [id, pendingStatus, updateStatusMutation, canUpdateOrders]);

  const openPaymentDialog = useCallback(() => {
    if (!order || !canCreatePayments) return;
    const remaining = order.totalAmount - order.paidAmount;
    reset({
      amount: remaining > 0 ? remaining : 0,
      type: 'CASH',
      notes: '',
    });
    setPaymentDialogOpen(true);
  }, [order, reset, canCreatePayments]);

  const onPaymentSubmit = useCallback(
    async (data: PaymentFormData) => {
      if (!order) return;

      const customer = getCustomer(order.customer);
      if (!customer) return;

      const remainingAmount = Math.max(order.totalAmount - order.paidAmount, 0);
      if (data.amount > remainingAmount) {
        toast({
          title: 'Xatolik',
          description: "To'lov summasi qolgan qarzdorlikdan oshib ketdi",
          variant: 'destructive',
        });
        return;
      }

      try {
        await createPaymentMutation.mutateAsync({
          customer: customer._id,
          order: order._id,
          amount: data.amount,
          type: data.type,
          notes: data.notes || undefined,
        });
        toast({
          title: 'Muvaffaqiyatli',
          description: "To'lov muvaffaqiyatli qo'shildi",
        });
        setPaymentDialogOpen(false);
        reset();
      } catch (error: any) {
        toast({
          title: 'Xatolik',
          description:
            error?.response?.data?.message ||
            "To'lovni qo'shishda xatolik yuz berdi",
          variant: 'destructive',
        });
      }
    },
    [order, createPaymentMutation, reset],
  );

  const handleDeliver = useCallback(async () => {
    if (!id || !deliveredTo.trim() || !canUpdateOrders) return;
    try {
      await deliverMutation.mutateAsync({
        id,
        data: {
          deliveredTo: deliveredTo.trim(),
          deliveryNotes: deliveryNotes.trim() || undefined,
        },
      });
      toast({
        title: 'Muvaffaqiyatli',
        description: 'Buyurtma topshirildi',
      });
      setDeliverDialogOpen(false);
      setDeliveredTo('');
      setDeliveryNotes('');
    } catch {
      toast({
        title: 'Xatolik',
        description: 'Topshirishda xatolik yuz berdi',
        variant: 'destructive',
      });
    }
  }, [id, deliveredTo, deliveryNotes, deliverMutation, canUpdateOrders]);

  const openReturnDialog = useCallback(() => {
    if (!order || !canCreateReturns) return;

    setReturnItems(
      order.items.map((item) => ({
        productId: getEntityId(item.product as any),
        productName: item.productName,
        unitId: getEntityId(item.unit as any),
        unitName: item.unitName,
        maxQuantity: item.quantity,
        quantity: 0,
        price: item.price,
      })),
    );
    setReturnReason('');
    setReturnDialogOpen(true);
  }, [order, canCreateReturns]);

  const updateReturnQuantity = useCallback((index: number, rawValue: number) => {
    setReturnItems((prev) => {
      const next = [...prev];
      const item = next[index];
      const safeValue = Number.isFinite(rawValue) ? rawValue : 0;
      const quantity = Math.min(Math.max(safeValue, 0), item.maxQuantity);
      next[index] = {
        ...item,
        quantity,
      };
      return next;
    });
  }, []);

  const submitReturn = useCallback(async () => {
    if (!order || !canCreateReturns) return;

    const payloadItems = returnItems
      .filter((item) => item.quantity > 0)
      .map((item) => ({
        product: item.productId,
        unit: item.unitId,
        quantity: item.quantity,
        price: item.price,
      }));

    if (!payloadItems.length) {
      toast({
        title: 'Xatolik',
        description: 'Kamida bitta mahsulot uchun miqdor kiriting',
        variant: 'destructive',
      });
      return;
    }

    if (!returnReason.trim()) {
      toast({
        title: 'Xatolik',
        description: 'Qaytarish sababini kiriting',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createReturnMutation.mutateAsync({
        order: order._id,
        reason: returnReason.trim(),
        items: payloadItems,
      });
      toast({
        title: 'Muvaffaqiyatli',
        description: 'Qaytarish arizasi yaratildi',
      });
      setReturnDialogOpen(false);
      setReturnReason('');
      setReturnItems([]);
    } catch (error: any) {
      toast({
        title: 'Xatolik',
        description:
          error?.response?.data?.message || 'Qaytarish yaratishda xatolik yuz berdi',
        variant: 'destructive',
      });
    }
  }, [order, canCreateReturns, returnItems, returnReason, createReturnMutation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 mb-4">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Buyurtma topilmadi</h2>
        <p className="text-sm text-muted-foreground mt-1">
          So'ralgan buyurtma mavjud emas yoki o'chirilgan
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate('/orders')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Buyurtmalarga qaytish
        </Button>
      </div>
    );
  }

  const customer = getCustomer(order.customer);
  const statusInfo = STATUS_MAP[order.status] || { label: order.status, variant: 'secondary' as const };
  const paymentInfo = PAYMENT_TYPE_MAP[order.paymentType] || { label: order.paymentType, variant: 'secondary' as const };
  const remaining = order.totalAmount - order.paidAmount;
  // Customer's debt before/after this sale. There's no stored historical snapshot,
  // so "after" is the customer's live currentDebt and "before" is derived by
  // subtracting what this specific order contributed to it at creation time
  // (only DEBT-type orders add to currentDebt) — an approximation if other
  // payments/orders happened since, but accurate in the common case.
  const debtAddedByOrder =
    order.paymentType === 'DEBT'
      ? Math.max(order.totalAmount - order.initialPaidAmount, 0)
      : 0;
  const debtAfterSale = customer?.currentDebt ?? 0;
  const debtBeforeSale = Math.max(debtAfterSale - debtAddedByOrder, 0);
  const statusLabel = pendingStatus ? STATUS_MAP[pendingStatus]?.label || pendingStatus : '';
  const returnTotalAmount = returnItems.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0,
  );

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Button
          variant="ghost"
          onClick={() => navigate('/orders')}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Buyurtmalar
        </Button>
      </motion.div>

      {/* Order Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground">
                Buyurtma #{order.orderNumber}
              </h1>
              {(order as any).invoiceNumber && (
                <Badge variant="secondary" className="gap-1">
                  <Hash className="h-3 w-3" />
                  {(order as any).invoiceNumber}
                </Badge>
              )}
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {format(new Date(order.createdAt), 'dd.MM.yyyy HH:mm')}
              </div>
              <div className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {getCreatedByName(order.createdBy)}
              </div>
              {(order as any).deliveredTo && (
                <Badge variant="success" className="gap-1 text-xs">
                  <Truck className="h-3 w-3" />
                  Topshirilgan: {(order as any).deliveredTo}
                  {(order as any).deliveredAt && (
                    <span className="ml-1">({format(new Date((order as any).deliveredAt), 'dd.MM.yyyy')})</span>
                  )}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {canUpdateOrders && order.status === 'PENDING' && (
              <Button
                variant="outline"
                onClick={() => navigate(`/orders/${id}/edit`)}
                className="w-full gap-2 sm:w-auto"
              >
                <Pencil className="h-4 w-4" />
                Tahrirlash
              </Button>
            )}
            {canCreatePayments && order.status !== 'CANCELLED' && remaining > 0 && (
              <Button
                variant="outline"
                onClick={openPaymentDialog}
                className="w-full gap-2 sm:w-auto"
              >
                <CreditCard className="h-4 w-4" />
                To'lov qilish
              </Button>
            )}
            {canCreateReturns && order.status !== 'CANCELLED' && (
              <Button
                variant="outline"
                onClick={openReturnDialog}
                className="w-full gap-2 sm:w-auto"
              >
                <RotateCcw className="h-4 w-4" />
                Qaytarish
              </Button>
            )}
            {canUpdateOrders && order.status !== 'CANCELLED' && !(order as any).deliveredTo && (
              <Button
                variant="outline"
                onClick={() => setDeliverDialogOpen(true)}
                className="w-full gap-2 sm:w-auto"
              >
                <Truck className="h-4 w-4" />
                Topshirish
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => navigate(`/orders/${id}/check`)}
              className="w-full gap-2 sm:w-auto"
            >
              <Printer className="h-4 w-4" />
              Check chop etish
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Customer + Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Info */}
          {customer && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6"
            >
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Mijoz ma'lumotlari
              </h2>
              <div
                className="flex items-center gap-4 cursor-pointer hover:bg-accent/50 -mx-2 px-2 py-2 rounded-xl transition-colors"
                onClick={() => navigate(`/customers/${customer._id}`)}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/20">
                  <User className="h-6 w-6 text-indigo-400" />
                </div>
                <div>
                  <p className="text-base font-semibold text-foreground">
                    {customer.name}
                  </p>
                  {customer.phone && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      {customer.phone}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Items Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl overflow-hidden"
          >
            <div className="p-6 pb-0">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Mahsulotlar
              </h2>
            </div>
            <div className="space-y-3 p-4 md:hidden">
              {order.items.map((item, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-border/60 bg-background/60 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        #{index + 1}
                      </p>
                      <p className="mt-1 font-medium text-foreground">{item.productName}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.quantity} {item.unitName}
                      </p>
                    </div>
                    <p className="text-right text-sm font-semibold text-foreground">
                      {formatCurrency(item.total)}
                    </p>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Narx</p>
                      <p className="font-medium text-foreground">{formatCurrency(item.price)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Tannarx</p>
                      <p className="font-medium text-foreground">
                        {formatCurrency((item as any).totalCost || 0)}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">Foyda</p>
                      <p className="font-medium text-emerald-400">
                        {formatCurrency(item.total - ((item as any).totalCost || 0))}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>#</TableHead>
                    <TableHead>Mahsulot</TableHead>
                    <TableHead>Birlik</TableHead>
                    <TableHead>Miqdor</TableHead>
                    <TableHead>Narx</TableHead>
                    <TableHead>Jami</TableHead>
                    <TableHead className="hidden sm:table-cell">Tannarx</TableHead>
                    <TableHead className="hidden sm:table-cell">Foyda</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-medium">
                        {item.productName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.unitName}
                      </TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {((item as any).discountPercent > 0 || (item as any).discountAmount > 0) ? (
                          <div className="flex flex-col">
                            <span className="line-through text-muted-foreground/60 text-xs">
                              {formatCurrency((item as any).originalPrice || item.price)}
                            </span>
                            <div className="flex items-center gap-1">
                              <span>{formatCurrency(item.price)}</span>
                              <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                -{(item as any).discountPercent}%
                              </Badge>
                            </div>
                          </div>
                        ) : (
                          formatCurrency(item.price)
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(item.total)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {formatCurrency((item as any).totalCost || 0)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell font-medium text-emerald-400">
                        {formatCurrency(item.total - ((item as any).totalCost || 0))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </motion.div>

          {/* Payments History */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Banknote className="h-5 w-5 text-green-400" />
                <h2 className="text-lg font-semibold text-foreground">
                  To'lovlar tarixi
                </h2>
              </div>
            </div>

            {isLoadingPayments ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner size="md" />
              </div>
            ) : !payments || payments.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  Hozircha to'lovlar yo'q
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Sana</TableHead>
                    <TableHead>Summa</TableHead>
                    <TableHead>Turi</TableHead>
                    <TableHead>Izoh</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment: Payment) => (
                    <TableRow key={payment._id}>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(payment.createdAt), 'dd.MM.yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="font-medium text-green-400">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {PAYMENT_METHOD_MAP[payment.type] || payment.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {payment.notes || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </motion.div>

          {/* Status Change History */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.22 }}
            className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <History className="h-5 w-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-foreground">
                Holat tarixi
              </h2>
            </div>

            {!order.statusHistory || order.statusHistory.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  Holat tarixi mavjud emas
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Sana</TableHead>
                    <TableHead>Holat</TableHead>
                    <TableHead>Kim</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.statusHistory.map((entry, index) => (
                    <TableRow key={index}>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(entry.changedAt), 'dd.MM.yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={(STATUS_MAP[entry.status] || { variant: 'secondary' as const }).variant}>
                          {STATUS_MAP[entry.status]?.label || entry.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {getCreatedByName(entry.changedBy)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </motion.div>

          {canReadReturns && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.23 }}
              className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <RotateCcw className="h-5 w-5 text-amber-400" />
                <h2 className="text-lg font-semibold text-foreground">
                  Qaytarishlar
                </h2>
              </div>

              {isLoadingReturns ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="md" />
                </div>
              ) : returns.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Bu buyurtma bo&apos;yicha qaytarishlar hali yaratilmagan.
                </p>
              ) : (
                <div className="space-y-3">
                  {returns.map((returnDoc) => (
                    <div
                      key={returnDoc._id}
                      className="rounded-2xl border border-border/60 bg-background/60 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={returnDoc.status === 'APPROVED' ? 'success' : 'warning'}>
                              {returnDoc.status === 'APPROVED' ? 'Tasdiqlangan' : 'Kutilmoqda'}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(returnDoc.createdAt), 'dd.MM.yyyy HH:mm')}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-foreground">{returnDoc.reason}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {returnDoc.items.length} ta mahsulot
                          </p>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="text-xs text-muted-foreground">Jami</p>
                          <p className="text-sm font-semibold text-foreground">
                            {formatCurrency(returnDoc.totalAmount)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Notes */}
          {order.notes && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25 }}
              className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6"
            >
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-5 w-5 text-cyan-400" />
                <h2 className="text-lg font-semibold text-foreground">Izoh</h2>
              </div>
              <p className="text-sm text-muted-foreground">{order.notes}</p>
            </motion.div>
          )}
        </div>

        {/* Right Column: Financial Summary + Status */}
        <div className="space-y-6">
          {/* Financial Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6"
          >
            <h2 className="text-lg font-semibold text-foreground mb-6">
              Moliyaviy ma'lumotlar
            </h2>

            <div className="space-y-4">
              {/* Total Amount */}
              <div>
                <p className="text-sm text-muted-foreground mb-1">Jami summa</p>
                <p className="text-3xl font-bold text-foreground">
                  {formatCurrency(order.totalAmount)}
                </p>
              </div>

              {/* Paid Amount */}
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-500/20">
                  <DollarSign className="h-4 w-4 text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">To'langan</p>
                  <p className="text-lg font-semibold text-green-400">
                    {formatCurrency(order.paidAmount)}
                  </p>
                </div>
              </div>

              {/* Remaining */}
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                    remaining > 0 ? 'bg-red-500/20' : 'bg-green-500/20',
                  )}
                >
                  <CreditCard
                    className={cn(
                      'h-4 w-4',
                      remaining > 0 ? 'text-red-400' : 'text-green-400',
                    )}
                  />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Qoldiq</p>
                  <p
                    className={cn(
                      'text-lg font-semibold',
                      remaining > 0 ? 'text-red-400' : 'text-green-400',
                    )}
                  >
                    {formatCurrency(remaining)}
                  </p>
                </div>
              </div>

              {/* Payment Type */}
              <div className="pt-4 border-t border-border/50">
                <p className="text-xs text-muted-foreground mb-2">To'lov turi</p>
                <Badge variant={paymentInfo.variant}>{paymentInfo.label}</Badge>
              </div>

              {/* Due Date */}
              {(order as any).dueDate && (
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                    new Date((order as any).dueDate) < new Date() && remaining > 0
                      ? 'bg-red-500/20'
                      : 'bg-green-500/20',
                  )}>
                    <Clock className={cn(
                      'h-4 w-4',
                      new Date((order as any).dueDate) < new Date() && remaining > 0
                        ? 'text-red-400'
                        : 'text-green-400',
                    )} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">To'lov muddati</p>
                    <p className={cn(
                      'text-sm font-semibold',
                      new Date((order as any).dueDate) < new Date() && remaining > 0
                        ? 'text-red-400'
                        : 'text-green-400',
                    )}>
                      {format(new Date((order as any).dueDate), 'dd.MM.yyyy')}
                    </p>
                  </div>
                </div>
              )}

              {/* Customer debt before/after this sale */}
              {customer && (
                <div className="pt-4 border-t border-border/50 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500/20">
                      <DollarSign className="h-4 w-4 text-orange-400" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Mijozning avvalgi qarzi</p>
                      <p className="text-lg font-semibold text-orange-400">
                        {formatCurrency(debtBeforeSale)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                        debtAfterSale > 0 ? 'bg-red-500/20' : 'bg-emerald-500/20',
                      )}
                    >
                      <DollarSign
                        className={cn(
                          'h-4 w-4',
                          debtAfterSale > 0 ? 'text-red-400' : 'text-emerald-400',
                        )}
                      />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Savdodan keyingi qarzi</p>
                      <p className={cn(
                        'text-lg font-semibold',
                        debtAfterSale > 0 ? 'text-red-400' : 'text-emerald-400',
                      )}>
                        {formatCurrency(debtAfterSale)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Status Change Actions */}
          {canUpdateOrders && order.status !== 'CANCELLED' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6"
            >
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Holatni o'zgartirish
              </h2>

              <div className="space-y-3">
                {order.status === 'PENDING' && (
                  <>
                    <Button
                      className="w-full gap-2"
                      onClick={() => handleStatusChange('CONFIRMED')}
                      disabled={updateStatusMutation.isPending}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Tasdiqlash
                    </Button>
                    <Button
                      variant="destructive"
                      className="w-full gap-2"
                      onClick={() => handleStatusChange('CANCELLED')}
                      disabled={updateStatusMutation.isPending}
                    >
                      <XCircle className="h-4 w-4" />
                      Bekor qilish
                    </Button>
                  </>
                )}

                {order.status === 'CONFIRMED' && (
                  <>
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => handleStatusChange('PENDING')}
                      disabled={updateStatusMutation.isPending}
                    >
                      <Undo2 className="h-4 w-4" />
                      Qoralamaga qaytarish
                    </Button>
                    <Button
                      variant="destructive"
                      className="w-full gap-2"
                      onClick={() => handleStatusChange('CANCELLED')}
                      disabled={updateStatusMutation.isPending}
                    >
                      <XCircle className="h-4 w-4" />
                      Bekor qilish
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Status Change Confirmation Dialog */}
      {canUpdateOrders && (
        <ConfirmDialog
          open={confirmDialogOpen}
          onOpenChange={setConfirmDialogOpen}
          title="Holatni o'zgartirish"
          description={`Buyurtma holatini "${statusLabel}" ga o'zgartirmoqchimisiz?`}
          onConfirm={confirmStatusChange}
          loading={updateStatusMutation.isPending}
          variant={pendingStatus === 'CANCELLED' ? 'destructive' : 'default'}
        />
      )}

      {/* Payment Dialog */}
      {canCreatePayments && (
        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>To'lov qilish</DialogTitle>
              <DialogDescription>
                Buyurtma #{order.orderNumber} uchun to'lov qilish.
                Qoldiq: {formatCurrency(remaining)}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onPaymentSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">
                  Summa <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  min={1}
                  step="any"
                  placeholder="0"
                  {...register('amount')}
                />
                {errors.amount && (
                  <p className="text-xs text-destructive">{errors.amount.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>To'lov usuli</Label>
                <Select
                  defaultValue="CASH"
                  onValueChange={(value) =>
                    setValue('type', value as PaymentMethodType)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Naqd</SelectItem>
                    <SelectItem value="TRANSFER">O'tkazma</SelectItem>
                    <SelectItem value="CARD">Karta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentNotes">Izoh</Label>
                <Textarea
                  id="paymentNotes"
                  placeholder="Qo'shimcha izoh..."
                  rows={2}
                  {...register('notes')}
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPaymentDialogOpen(false)}
                >
                  Bekor qilish
                </Button>
                <Button
                  type="submit"
                  disabled={createPaymentMutation.isPending}
                >
                  {createPaymentMutation.isPending && (
                    <LoadingSpinner size="sm" className="mr-2 h-4 w-4" />
                  )}
                  To'lovni tasdiqlash
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {canCreateReturns && (
        <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Qaytarish yaratish</DialogTitle>
              <DialogDescription>
                Buyurtma #{order.orderNumber} ichidan qaytariladigan mahsulotlarni tanlang.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-3">
                {returnItems.map((item, index) => (
                  <div
                    key={`${item.productId}-${item.unitId}`}
                    className="rounded-2xl border border-border/60 bg-background/60 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium text-foreground">{item.productName}</p>
                        <p className="text-sm text-muted-foreground">
                          Maksimum: {item.maxQuantity} {item.unitName}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-28">
                          <Label className="text-xs text-muted-foreground">Miqdor</Label>
                          <Input
                            type="number"
                            min={0}
                            max={item.maxQuantity}
                            step="any"
                            value={item.quantity}
                            onChange={(e) =>
                              updateReturnQuantity(index, parseFloat(e.target.value) || 0)
                            }
                            className="mt-1"
                          />
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Summa</p>
                          <p className="text-sm font-semibold text-foreground">
                            {formatCurrency(item.quantity * item.price)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="returnReason">
                  Qaytarish sababi <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="returnReason"
                  rows={3}
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="Masalan: mahsulot sifati mos kelmadi yoki ortiqcha buyurtma qilingan"
                />
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/30 px-4 py-3">
                <span className="text-sm text-muted-foreground">Jami qaytarish summasi</span>
                <span className="text-base font-semibold text-foreground">
                  {formatCurrency(returnTotalAmount)}
                </span>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setReturnDialogOpen(false)}
              >
                Bekor qilish
              </Button>
              <Button
                type="button"
                onClick={submitReturn}
                disabled={createReturnMutation.isPending}
              >
                {createReturnMutation.isPending && (
                  <LoadingSpinner size="sm" className="mr-2 h-4 w-4" />
                )}
                Qaytarishni yuborish
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Deliver Dialog */}
      {canUpdateOrders && (
        <Dialog open={deliverDialogOpen} onOpenChange={setDeliverDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Buyurtmani topshirish</DialogTitle>
              <DialogDescription>
                Buyurtma #{order.orderNumber} ni kim qabul qilganini kiriting.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="deliveredTo">
                  Kim qabul qildi? <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="deliveredTo"
                  value={deliveredTo}
                  onChange={(e) => setDeliveredTo(e.target.value)}
                  placeholder="Qabul qiluvchi ismi..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deliveryNotes">Izoh</Label>
                <Textarea
                  id="deliveryNotes"
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="Qo'shimcha izoh..."
                  rows={2}
                />
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeliverDialogOpen(false)}
                >
                  Bekor qilish
                </Button>
                <Button
                  onClick={handleDeliver}
                  disabled={!deliveredTo.trim() || deliverMutation.isPending}
                >
                  {deliverMutation.isPending && (
                    <LoadingSpinner size="sm" className="mr-2 h-4 w-4" />
                  )}
                  Tasdiqlash
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
