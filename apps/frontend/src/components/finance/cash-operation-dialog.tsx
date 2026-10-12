import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useCreateCashOperation } from '@/hooks/use-finance';
import type { CashAccount, CashOperationKind } from '@/api/finance';
import { toast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { LoadingSpinner } from '@/components/shared/loading-spinner';

export const CASH_ACCOUNT_LABELS: Record<CashAccount, string> = {
  CASH: 'Naqd',
  BANK: 'Bank',
  CARD: 'Karta',
};

export const CASH_OPERATION_KIND_LABELS: Record<CashOperationKind, string> = {
  OPENING: "Boshlang'ich qoldiq",
  CAPITAL_IN: "Egasi kassaga pul qo'shdi",
  LOAN_IN: 'Kredit / qarz olindi',
  OTHER_IN: 'Boshqa kirim',
  WITHDRAWAL: 'Egasi pul yechib oldi',
  LOAN_REPAYMENT: "Kredit / qarz to'landi",
  OTHER_OUT: 'Boshqa chiqim',
};

const KINDS_BY_DIRECTION: Record<'IN' | 'OUT', CashOperationKind[]> = {
  IN: ['OPENING', 'CAPITAL_IN', 'LOAN_IN', 'OTHER_IN'],
  OUT: ['WITHDRAWAL', 'LOAN_REPAYMENT', 'OTHER_OUT'],
};

interface CashOperationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  direction: 'IN' | 'OUT';
}

export function CashOperationDialog({ open, onOpenChange, direction }: CashOperationDialogProps) {
  const createOperation = useCreateCashOperation();
  const kinds = KINDS_BY_DIRECTION[direction];

  const [kind, setKind] = useState<CashOperationKind>(kinds[0]);
  const [account, setAccount] = useState<CashAccount>('CASH');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      setKind(KINDS_BY_DIRECTION[direction][0]);
      setAccount('CASH');
      setAmount('');
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setNotes('');
    }
  }, [open, direction]);

  const numericAmount = parseFloat(amount);
  const canSubmit = Number.isFinite(numericAmount) && numericAmount > 0 && !!date;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      await createOperation.mutateAsync({
        kind,
        account,
        amount: numericAmount,
        date,
        notes: notes.trim() || undefined,
      });
      toast({ title: 'Muvaffaqiyatli', description: 'Kassa operatsiyasi saqlandi', variant: 'success' });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Xatolik',
        description: getErrorMessage(error, 'Kassa operatsiyasini saqlashda xatolik yuz berdi'),
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{direction === 'IN' ? 'Boshqa kirim qo\'shish' : 'Pul yechish / boshqa chiqim'}</DialogTitle>
          <DialogDescription>
            {direction === 'IN'
              ? "Boshlang'ich qoldiq, egasi qo'ygan pul, kredit kabi kirimlar. Kassa qoldig'iga darhol qo'shiladi."
              : "Egasi yechib olgan pul, kredit to'lovi kabi chiqimlar. Kassa qoldig'idan darhol ayiriladi."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Turi</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as CashOperationKind)}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {kinds.map((k) => (
                  <SelectItem key={k} value={k}>
                    {CASH_OPERATION_KIND_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Hisob</Label>
            <Select value={account} onValueChange={(v) => setAccount(v as CashAccount)}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(CASH_ACCOUNT_LABELS) as CashAccount[]).map((a) => (
                  <SelectItem key={a} value={a}>
                    {CASH_ACCOUNT_LABELS[a]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Summa</Label>
              <Input
                type="number"
                min={0.01}
                step="any"
                placeholder="0"
                className="rounded-xl"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Sana</Label>
              <Input
                type="date"
                className="rounded-xl"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Izoh</Label>
            <Textarea
              placeholder="Qo'shimcha izoh (ixtiyoriy)"
              className="rounded-xl"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => onOpenChange(false)}
              disabled={createOperation.isPending}
            >
              Yopish
            </Button>
            <Button type="submit" className="gap-2 rounded-xl" disabled={!canSubmit || createOperation.isPending}>
              {createOperation.isPending && <LoadingSpinner size="sm" className="h-4 w-4" />}
              Saqlash
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
