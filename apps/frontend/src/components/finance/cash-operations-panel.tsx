import { useState } from 'react';
import { format } from 'date-fns';
import { Plus, Ban } from 'lucide-react';
import { cn, formatCurrency, getErrorMessage } from '@/lib/utils';
import { useCashOperations, useCancelCashOperation } from '@/hooks/use-finance';
import { toast } from '@/components/ui/use-toast';
import type { CashOperationData } from '@/api/finance';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DataTableWrapper } from '@/components/shared/data-table';
import {
  CashOperationDialog,
  CASH_ACCOUNT_LABELS,
  CASH_OPERATION_KIND_LABELS,
} from './cash-operation-dialog';
import { CancelReasonDialog } from './cancel-reason-dialog';

interface CashOperationsPanelProps {
  direction: 'IN' | 'OUT';
  addLabel: string;
  emptyTitle: string;
  emptyDescription: string;
}

/** List + "add" button for manual cash-book entries of one direction
 *  (Kirim page: "Boshqa kirimlar", Chiqim page: "Pul yechish"). */
export function CashOperationsPanel({
  direction,
  addLabel,
  emptyTitle,
  emptyDescription,
}: CashOperationsPanelProps) {
  const { data, isLoading } = useCashOperations(direction);
  const cancelOperation = useCancelCashOperation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toCancel, setToCancel] = useState<CashOperationData | null>(null);

  const items = data?.items || [];
  const amountClass = direction === 'IN' ? 'text-green-400' : 'text-red-400';

  const handleCancel = async (reason: string) => {
    if (!toCancel) return;
    try {
      await cancelOperation.mutateAsync({ id: toCancel._id, reason });
      toast({ title: 'Bekor qilindi', description: 'Operatsiya bekor qilindi', variant: 'success' });
      setToCancel(null);
    } catch (error) {
      toast({
        title: 'Xatolik',
        description: getErrorMessage(error, 'Operatsiyani bekor qilishda xatolik yuz berdi'),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setDialogOpen(true)} className="gap-2 rounded-xl">
          <Plus className="h-4 w-4" />
          {addLabel}
        </Button>
      </div>

      <DataTableWrapper
        isLoading={isLoading}
        isEmpty={items.length === 0}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/50 hover:bg-transparent">
                <TableHead className="min-w-[110px]">Sana</TableHead>
                <TableHead className="min-w-[200px]">Turi</TableHead>
                <TableHead className="min-w-[90px]">Hisob</TableHead>
                <TableHead className="min-w-[130px]">Summa</TableHead>
                <TableHead className="min-w-[180px]">Izoh</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((op) => {
                const cancelled = op.status === 'CANCELLED';
                return (
                  <TableRow
                    key={op._id}
                    className={cn(
                      'border-b border-border/30 hover:bg-accent/50 transition-colors',
                      cancelled && 'opacity-60',
                    )}
                  >
                    <TableCell className="text-muted-foreground">
                      {format(new Date(op.date), 'dd.MM.yyyy')}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      <span className={cn(cancelled && 'line-through')}>
                        {CASH_OPERATION_KIND_LABELS[op.kind] || op.kind}
                      </span>
                      {cancelled && (
                        <Badge variant="destructive" className="ml-2">
                          Bekor qilingan
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{CASH_ACCOUNT_LABELS[op.account] || op.account}</Badge>
                    </TableCell>
                    <TableCell className={cn('font-semibold', amountClass, cancelled && 'line-through')}>
                      {formatCurrency(op.amount)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {cancelled && op.cancelReason ? `Sabab: ${op.cancelReason}` : op.notes || '---'}
                    </TableCell>
                    <TableCell>
                      {!cancelled && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Bekor qilish"
                          onClick={() => setToCancel(op)}
                          className="text-muted-foreground hover:text-red-400"
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </DataTableWrapper>

      <CashOperationDialog open={dialogOpen} onOpenChange={setDialogOpen} direction={direction} />

      <CancelReasonDialog
        open={!!toCancel}
        onOpenChange={(o) => !o && setToCancel(null)}
        title="Operatsiyani bekor qilish"
        description="Operatsiya o'chirilmaydi, lekin kassa qoldig'iga ta'sir qilmaydi."
        isPending={cancelOperation.isPending}
        onConfirm={handleCancel}
      />
    </div>
  );
}
