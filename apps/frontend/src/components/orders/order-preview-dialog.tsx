import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ExternalLink } from 'lucide-react';
import { useOrder } from '@/hooks/use-orders';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

const STATUS_MAP: Record<string, { label: string; variant: 'warning' | 'default' | 'success' | 'destructive' }> = {
  PENDING: { label: 'Kutilmoqda', variant: 'warning' },
  CONFIRMED: { label: 'Tasdiqlangan', variant: 'default' },
  CANCELLED: { label: 'Bekor qilingan', variant: 'destructive' },
};

const PAYMENT_TYPE_MAP: Record<string, string> = {
  CASH: 'Naqd',
  TRANSFER: "O'tkazma",
  DEBT: 'Qarz',
};

interface OrderPreviewDialogProps {
  orderId: string | null;
  onOpenChange: (open: boolean) => void;
}

export function OrderPreviewDialog({ orderId, onOpenChange }: OrderPreviewDialogProps) {
  const navigate = useNavigate();
  const { data: order, isLoading } = useOrder(orderId || '');

  const customerName =
    order && typeof order.customer === 'object' && order.customer !== null
      ? order.customer.name
      : '';

  const statusInfo = order
    ? STATUS_MAP[order.status] || { label: order.status, variant: 'secondary' as const }
    : null;

  return (
    <Dialog open={!!orderId} onOpenChange={(open) => !open && onOpenChange(false)}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            {order ? `Buyurtma #${order.orderNumber}` : 'Buyurtma'}
            {statusInfo && <Badge variant={statusInfo.variant as any}>{statusInfo.label}</Badge>}
          </DialogTitle>
        </DialogHeader>

        {isLoading || !order ? (
          <div className="flex items-center justify-center py-10">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Mijoz</p>
                <p className="font-medium text-foreground">{customerName || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sana</p>
                <p className="font-medium text-foreground">
                  {format(new Date(order.createdAt), 'dd.MM.yyyy HH:mm')}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">To'lov turi</p>
                <p className="font-medium text-foreground">
                  {PAYMENT_TYPE_MAP[order.paymentType] || order.paymentType}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">To'langan / Jami</p>
                <p className="font-medium text-foreground">
                  {formatCurrency(order.paidAmount)} / {formatCurrency(order.totalAmount)}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Mahsulot</TableHead>
                    <TableHead>Miqdor</TableHead>
                    <TableHead>Narx</TableHead>
                    <TableHead>Jami</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell>
                        {item.quantity} {item.unitName}
                      </TableCell>
                      <TableCell>{formatCurrency(item.price)}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(item.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Yopish
          </Button>
          <Button
            onClick={() => order && navigate(`/orders/${order._id}`)}
            disabled={!order}
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            To'liq ko'rish / Tahrirlash
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
