import { useState } from 'react';
import { format } from 'date-fns';
import { CheckCircle2, ExternalLink } from 'lucide-react';
import type { Order, Customer } from '@plastmassa/shared';
import { useReturn, useApproveReturn } from '@/hooks/use-returns';
import { usePermissions } from '@/hooks/use-permissions';
import { formatCurrency } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
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

const STATUS_MAP: Record<string, { label: string; variant: 'warning' | 'success' }> = {
  PENDING: { label: 'Kutilmoqda', variant: 'warning' },
  APPROVED: { label: 'Tasdiqlangan', variant: 'success' },
};

function getOrderNumber(order?: string | Order) {
  if (!order) return null;
  if (typeof order === 'string') return order.slice(-6);
  return order.orderNumber || order._id.slice(-6);
}

function getOrderId(order?: string | Order) {
  if (!order) return null;
  if (typeof order === 'string') return order;
  return order._id;
}

function getCustomerName(customer: string | Customer) {
  if (typeof customer === 'string') return customer.slice(-6);
  return customer.name;
}

interface ReturnPreviewDialogProps {
  returnId: string | null;
  onOpenChange: (open: boolean) => void;
  onViewOrder?: (orderId: string) => void;
}

export function ReturnPreviewDialog({
  returnId,
  onOpenChange,
  onViewOrder,
}: ReturnPreviewDialogProps) {
  const { can } = usePermissions();
  const canApprove = can('returns:update');
  const [approving, setApproving] = useState(false);
  const { data: item, isLoading } = useReturn(returnId || '');
  const approveMutation = useApproveReturn();

  const statusInfo = item
    ? STATUS_MAP[item.status] || { label: item.status, variant: 'warning' as const }
    : null;
  const orderNumber = item ? getOrderNumber(item.order) : null;
  const orderId = item ? getOrderId(item.order) : null;

  const handleApprove = async () => {
    if (!item) return;
    setApproving(true);
    try {
      await approveMutation.mutateAsync(item._id);
      toast({ title: 'Muvaffaqiyatli', description: 'Qaytarish tasdiqlandi' });
    } catch (error: any) {
      toast({
        title: 'Xatolik',
        description:
          error?.response?.data?.message || 'Qaytarishni tasdiqlashda xatolik yuz berdi',
        variant: 'destructive',
      });
    } finally {
      setApproving(false);
    }
  };

  return (
    <Dialog open={!!returnId} onOpenChange={(open) => !open && onOpenChange(false)}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            Qaytarish
            {statusInfo && <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>}
          </DialogTitle>
        </DialogHeader>

        {isLoading || !item ? (
          <div className="flex items-center justify-center py-10">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">
                  {orderNumber ? 'Buyurtma' : 'Mijoz'}
                </p>
                <p className="font-medium text-foreground">
                  {orderNumber ? `#${orderNumber}` : getCustomerName(item.customer)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sana</p>
                <p className="font-medium text-foreground">
                  {format(new Date(item.createdAt), 'dd.MM.yyyy HH:mm')}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Summa</p>
                <p className="font-medium text-foreground">{formatCurrency(item.totalAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Qaytarilgan pul</p>
                <p className="font-medium text-foreground">
                  {formatCurrency(item.refundAmount || 0)}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Sabab</p>
                <p className="font-medium text-foreground">{item.reason || '-'}</p>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Mahsulot</TableHead>
                    <TableHead>Miqdor</TableHead>
                    <TableHead>Jami</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {item.items.map((it, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{it.productName}</TableCell>
                      <TableCell>
                        {it.quantity} {it.unitName}
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(it.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Yopish
          </Button>
          {orderId && onViewOrder && (
            <Button variant="outline" onClick={() => onViewOrder(orderId)} className="gap-2">
              <ExternalLink className="h-4 w-4" />
              Buyurtmani ko'rish
            </Button>
          )}
          {item && item.status === 'PENDING' && canApprove && (
            <Button onClick={handleApprove} disabled={approving} className="gap-2">
              {approving ? (
                <LoadingSpinner size="sm" className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Tasdiqlash
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
