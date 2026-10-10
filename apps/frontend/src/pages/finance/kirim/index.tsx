import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { usePayments, useCreatePayment } from '@/hooks/use-payments';
import { useCustomers } from '@/hooks/use-customers';
import { useOrders } from '@/hooks/use-orders';
import { toast } from '@/components/ui/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { DataTableWrapper } from '@/components/shared/data-table';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

// ── Constants ─────────────────────────────────────────────────────────

const PAYMENT_TYPES = [
  { value: 'CASH', label: 'Naqd' },
  { value: 'TRANSFER', label: "O'tkazma" },
  { value: 'CARD', label: 'Karta' },
];

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  CASH: 'Naqd',
  TRANSFER: "O'tkazma",
  CARD: 'Karta',
};

// ── Zod schema ────────────────────────────────────────────────────────

const paymentSchema = z.object({
  customer: z.string().min(1, 'Mijozni tanlang'),
  amount: z.coerce.number().min(0.01, 'Summani kiriting'),
  type: z.enum(['CASH', 'TRANSFER', 'CARD']),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

// ── Component ─────────────────────────────────────────────────────────

export default function KirimPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('customer-payments');
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  // ── Queries ───────────────────────────────────────────────────────

  const { data: paymentsData, isLoading: paymentsLoading } = usePayments({
    limit: 50,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const { data: customersData } = useCustomers({ limit: 500, isActive: true });
  const { data: ordersData, isLoading: ordersLoading } = useOrders({
    limit: 50,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const createPayment = useCreatePayment();

  const payments = paymentsData?.items || [];
  const customers = customersData?.items || [];
  const orders = (ordersData?.items || []).filter(
    (o: any) => (o.initialPaidAmount || 0) > 0,
  );

  // ── Form ──────────────────────────────────────────────────────────

  const paymentForm = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { customer: '', amount: 0, type: 'CASH', notes: '' },
  });

  const openPaymentDialog = useCallback(() => {
    paymentForm.reset({ customer: '', amount: 0, type: 'CASH', notes: '' });
    setPaymentDialogOpen(true);
  }, [paymentForm]);

  const selectedCustomerId = paymentForm.watch('customer');
  const selectedCustomer = customers.find((c: any) => c._id === selectedCustomerId);

  const handleSubmitPayment = useCallback(
    async (data: PaymentFormData) => {
      try {
        // `order` maydoni yuborilmaydi — bu buyurtmadan tashqari, alohida mijoz to'lovi.
        // Mijoz qarzidan yechiladi (yoki mijoz haqdor holatiga o'tadi).
        await createPayment.mutateAsync(data as any);
        toast({
          title: 'Muvaffaqiyatli',
          description: "To'lov qabul qilindi",
          variant: 'success',
        });
        setPaymentDialogOpen(false);
      } catch (err: any) {
        toast({
          title: 'Xatolik',
          description:
            err?.response?.data?.message || "To'lovni saqlashda xatolik yuz berdi",
          variant: 'destructive',
        });
      }
    },
    [createPayment],
  );

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-bold text-foreground">Kirim</h1>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          <TabsList>
            <TabsTrigger value="customer-payments">Mijozdan to'lovlar</TabsTrigger>
            <TabsTrigger value="order-income">Buyurtma to'lovlari</TabsTrigger>
          </TabsList>
        </motion.div>

        {/* ── TAB 1: Mijozdan to'lovlar (standalone customer payments) ─── */}
        <TabsContent value="customer-payments" className="space-y-6">
          <div className="flex justify-end">
            <Button onClick={openPaymentDialog} className="gap-2 rounded-xl">
              <Plus className="h-4 w-4" />
              Yangi to'lov
            </Button>
          </div>

          <DataTableWrapper
            isLoading={paymentsLoading}
            isEmpty={payments.length === 0}
            emptyTitle="To'lovlar topilmadi"
            emptyDescription="Hozircha hech qanday mijoz to'lovi qayd etilmagan"
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/50 hover:bg-transparent">
                    <TableHead className="min-w-[160px]">Mijoz</TableHead>
                    <TableHead className="min-w-[120px]">Buyurtma</TableHead>
                    <TableHead className="min-w-[130px]">Summa</TableHead>
                    <TableHead className="min-w-[140px]">Sana</TableHead>
                    <TableHead className="min-w-[100px]">To'lov turi</TableHead>
                    <TableHead className="min-w-[160px]">Izoh</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p: any) => {
                    const customer = typeof p.customer === 'object' ? p.customer : null;
                    const order = typeof p.order === 'object' ? p.order : null;
                    return (
                      <TableRow
                        key={p._id}
                        className="border-b border-border/30 hover:bg-accent/50 transition-colors"
                      >
                        <TableCell>
                          <span className="font-medium text-foreground">
                            {customer?.name || '---'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {order ? (
                            order.orderNumber
                          ) : (
                            <Badge variant="secondary">Alohida to'lov</Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-semibold text-green-400">
                          {formatCurrency(p.amount || 0)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {p.createdAt ? format(new Date(p.createdAt), 'dd.MM.yyyy HH:mm') : '---'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {PAYMENT_TYPE_LABELS[p.type] || p.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {p.notes || '---'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </DataTableWrapper>
        </TabsContent>

        {/* ── TAB 2: Buyurtma to'lovlari (read-only report) ────────────── */}
        <TabsContent value="order-income" className="space-y-6">
          <div className="flex justify-end">
            <Button onClick={() => navigate('/orders/new')} className="gap-2 rounded-xl">
              <Plus className="h-4 w-4" />
              Yangi buyurtma
            </Button>
          </div>

          <DataTableWrapper
            isLoading={ordersLoading}
            isEmpty={orders.length === 0}
            emptyTitle="Buyurtma to'lovlari topilmadi"
            emptyDescription="Boshlang'ich to'lovi bo'lgan buyurtmalar bu yerda ko'rinadi"
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/50 hover:bg-transparent">
                    <TableHead className="min-w-[120px]">Buyurtma</TableHead>
                    <TableHead className="min-w-[160px]">Mijoz</TableHead>
                    <TableHead className="min-w-[140px]">Boshlang'ich to'lov</TableHead>
                    <TableHead className="min-w-[130px]">Jami summa</TableHead>
                    <TableHead className="min-w-[110px]">Sana</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o: any) => {
                    const customer = typeof o.customer === 'object' ? o.customer : null;
                    return (
                      <TableRow
                        key={o._id}
                        className="border-b border-border/30 hover:bg-accent/50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/orders/${o._id}`)}
                      >
                        <TableCell className="font-medium text-foreground">
                          {o.orderNumber}
                        </TableCell>
                        <TableCell>{customer?.name || '---'}</TableCell>
                        <TableCell className="font-semibold text-green-400">
                          {formatCurrency(o.initialPaidAmount || 0)}
                        </TableCell>
                        <TableCell>{formatCurrency(o.totalAmount || 0)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {o.createdAt ? format(new Date(o.createdAt), 'dd.MM.yyyy') : '---'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </DataTableWrapper>
        </TabsContent>
      </Tabs>

      {/* ── Create Payment Dialog ────────────────────────────────────────── */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mijozdan to'lov qabul qilish</DialogTitle>
            <DialogDescription>
              Bu to'lov buyurtmadan tashqari, alohida qabul qilinadi va mijozning qarzidan
              ayiriladi (yoki mijoz haqdor bo'lib qoladi)
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={paymentForm.handleSubmit(handleSubmitPayment)} className="space-y-4">
            <div className="space-y-2">
              <Label>Mijoz</Label>
              <Select
                value={paymentForm.watch('customer')}
                onValueChange={(value) => paymentForm.setValue('customer', value)}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Mijozni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c: any) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.name}
                      {c.currentDebt ? ` — qarz: ${formatCurrency(c.currentDebt)}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {paymentForm.formState.errors.customer && (
                <p className="text-xs text-destructive">
                  {paymentForm.formState.errors.customer.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Summa</Label>
              <Input
                type="number"
                min={0.01}
                step="any"
                placeholder="0"
                className="rounded-xl"
                {...paymentForm.register('amount', { valueAsNumber: true })}
              />
              {selectedCustomer && (
                <p className="text-xs text-muted-foreground">
                  Joriy qarz: {formatCurrency(Math.max(selectedCustomer.currentDebt || 0, 0))}
                </p>
              )}
              {paymentForm.formState.errors.amount && (
                <p className="text-xs text-destructive">
                  {paymentForm.formState.errors.amount.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>To'lov turi</Label>
              <Select
                value={paymentForm.watch('type')}
                onValueChange={(value) =>
                  paymentForm.setValue('type', value as 'CASH' | 'TRANSFER' | 'CARD')
                }
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="To'lov turini tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Izoh</Label>
              <Textarea
                placeholder="Qo'shimcha izoh (ixtiyoriy)"
                className="rounded-xl"
                {...paymentForm.register('notes')}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPaymentDialogOpen(false)}
                disabled={createPayment.isPending}
                className="rounded-xl"
              >
                Bekor qilish
              </Button>
              <Button
                type="submit"
                disabled={createPayment.isPending}
                className="gap-2 rounded-xl"
              >
                {createPayment.isPending ? (
                  <LoadingSpinner size="sm" className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Qabul qilish
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
