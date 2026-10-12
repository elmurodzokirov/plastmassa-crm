import { format } from 'date-fns';
import { cn, formatCurrency } from '@/lib/utils';
import type { FinanceTransaction } from '@/api/finance';

import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CASH_ACCOUNT_LABELS } from './cash-operation-dialog';

interface TransactionsLedgerTableProps {
  items: FinanceTransaction[];
  onRowClick?: (tx: FinanceTransaction) => void;
}

/** Cash-book table: date, description, account, in, out and running balance.
 *  Cancelled entries are struck through and don't change the balance. */
export function TransactionsLedgerTable({ items, onRowClick }: TransactionsLedgerTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border/50">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border/50 hover:bg-transparent">
            <TableHead className="min-w-[130px]">Sana</TableHead>
            <TableHead className="min-w-[220px]">Tavsif</TableHead>
            <TableHead className="min-w-[80px]">Hisob</TableHead>
            <TableHead className="min-w-[130px] text-right">Kirim (+)</TableHead>
            <TableHead className="min-w-[130px] text-right">Chiqim (-)</TableHead>
            <TableHead className="min-w-[140px] text-right">Qoldiq</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((tx) => (
            <TableRow
              key={`${tx.type}-${tx._id}`}
              onClick={() => onRowClick?.(tx)}
              className={cn(
                'border-b border-border/30 hover:bg-accent/50 transition-colors',
                onRowClick && 'cursor-pointer',
                tx.cancelled && 'opacity-60',
              )}
            >
              <TableCell className="text-muted-foreground">
                {format(new Date(tx.date), 'dd.MM.yyyy HH:mm')}
              </TableCell>
              <TableCell>
                <span className={cn('font-medium text-foreground', tx.cancelled && 'line-through')}>
                  {tx.title}
                </span>
                {tx.cancelled && (
                  <Badge variant="destructive" className="ml-2">
                    Bekor qilingan
                  </Badge>
                )}
                {tx.subtitle && (
                  <span className="block text-xs text-muted-foreground font-normal">{tx.subtitle}</span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {tx.account ? CASH_ACCOUNT_LABELS[tx.account] : '---'}
                </Badge>
              </TableCell>
              <TableCell
                className={cn(
                  'text-right font-semibold text-green-400',
                  tx.cancelled && 'line-through',
                )}
              >
                {tx.direction === 'IN' ? formatCurrency(tx.amount) : ''}
              </TableCell>
              <TableCell
                className={cn(
                  'text-right font-semibold text-red-400',
                  tx.cancelled && 'line-through',
                )}
              >
                {tx.direction === 'OUT' ? formatCurrency(tx.amount) : ''}
              </TableCell>
              <TableCell
                className={cn(
                  'text-right font-semibold',
                  (tx.balance ?? 0) < 0 ? 'text-red-400' : 'text-foreground',
                )}
              >
                {formatCurrency(tx.balance ?? 0)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
