import { format } from 'date-fns';
import type { FinanceTransaction } from '@/api/finance';
import { formatCurrency, formatNumber } from '@/lib/utils';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const TYPE_LABEL: Record<FinanceTransaction['type'], string> = {
  ORDER_INCOME: "Buyurtma — boshlang'ich to'lov",
  PAYMENT: "Mijozdan to'lov",
  EXPENSE: 'Xarajat',
  SUPPLIER_PAYMENT: "Yetkazib beruvchiga to'lov",
  RETURN_REFUND: "Mijozga qaytarilgan pul",
};

const PAYMENT_TYPE_LABEL: Record<string, string> = {
  CASH: 'Naqd',
  TRANSFER: "O'tkazma",
  CARD: 'Karta',
  DEBT: 'Nasiya',
};

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 border-b border-border/30 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value}</span>
    </div>
  );
}

interface TransactionViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: FinanceTransaction | null;
}

export function TransactionViewDialog({ open, onOpenChange, transaction }: TransactionViewDialogProps) {
  if (!transaction) return null;
  const { type, detail } = transaction;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {TYPE_LABEL[type]}
            <Badge variant={transaction.direction === 'IN' ? 'success' : 'destructive'}>
              {transaction.direction === 'IN' ? 'Kirim' : 'Chiqim'}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {format(new Date(transaction.date), 'dd.MM.yyyy HH:mm')}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-border/60 px-4 py-1">
          {type === 'ORDER_INCOME' && (
            <>
              <Field label="Buyurtma raqami" value={detail.orderNumber} />
              <Field label="Mijoz" value={detail.customerName} />
              <Field label="Telefon" value={detail.customerPhone} />
              <Field label="To'lov turi" value={detail.paymentType ? PAYMENT_TYPE_LABEL[detail.paymentType] || detail.paymentType : undefined} />
              <Field label="Buyurtma jami summasi" value={formatCurrency(detail.orderTotal || 0)} />
            </>
          )}
          {type === 'PAYMENT' && (
            <>
              <Field label="Mijoz" value={detail.customerName} />
              <Field label="Telefon" value={detail.customerPhone} />
              <Field label="Buyurtma raqami" value={detail.orderNumber} />
              <Field label="To'lov turi" value={detail.paymentType ? PAYMENT_TYPE_LABEL[detail.paymentType] || detail.paymentType : undefined} />
              <Field label="Izoh" value={detail.notes} />
            </>
          )}
          {type === 'EXPENSE' && (
            <>
              <Field label="Kategoriya" value={detail.category} />
              <Field label="Tavsif" value={detail.description} />
              <Field label="To'lov usuli" value={detail.paymentMethod} />
              <Field label="Izoh" value={detail.notes} />
            </>
          )}
          {type === 'SUPPLIER_PAYMENT' && (
            <>
              <Field label="Yetkazib beruvchi" value={detail.supplierName} />
              <Field label="Telefon" value={detail.supplierPhone} />
              <Field label="To'lov turi" value={detail.paymentType ? PAYMENT_TYPE_LABEL[detail.paymentType] || detail.paymentType : undefined} />
              <Field label="Izoh" value={detail.notes} />
            </>
          )}
          {type === 'RETURN_REFUND' && (
            <>
              <Field label="Mijoz" value={detail.customerName} />
              <Field label="Telefon" value={detail.customerPhone} />
              <Field label="Sabab" value={detail.reason} />
              <Field label="Qaytarish jami summasi" value={formatCurrency(detail.returnTotal || 0)} />
            </>
          )}
        </div>

        {(type === 'ORDER_INCOME' || type === 'RETURN_REFUND') && detail.items && detail.items.length > 0 && (
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
                {detail.items.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{item.productName}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatNumber(item.quantity)} {item.unitName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatCurrency(item.price)}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(item.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
          <span className="text-sm text-muted-foreground">Summa</span>
          <span className={transaction.direction === 'IN' ? 'text-lg font-bold text-green-400' : 'text-lg font-bold text-red-400'}>
            {transaction.direction === 'IN' ? '+' : '-'}{formatCurrency(transaction.amount)}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
