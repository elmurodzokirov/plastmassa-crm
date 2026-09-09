import { useState, useMemo, useEffect } from 'react';
import { Search } from 'lucide-react';
import type { Product, Unit } from '@plastmassa/shared';
import { cn, formatNumber } from '@/lib/utils';
import { useCreateStockMovement } from '@/hooks/use-stock';
import { toast } from '@/components/ui/use-toast';

import { Button } from '@/components/ui/button';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

interface StockTakeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
}

export function StockTakeDialog({ open, onOpenChange, products }: StockTakeDialogProps) {
  const [counted, setCounted] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const createMutation = useCreateStockMovement();

  useEffect(() => {
    if (open) {
      const initial: Record<string, string> = {};
      products.forEach((p) => {
        initial[p._id] = String(p.currentStock);
      });
      setCounted(initial);
      setSearch('');
    }
  }, [open, products]);

  // Filters the visible rows only — entered counts for hidden rows are kept intact.
  const visibleProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, search]);

  const getUnitSymbol = (product: Product): string => {
    if (typeof product.baseUnit === 'object' && product.baseUnit !== null) {
      return (product.baseUnit as Unit).symbol;
    }
    return '';
  };

  const getUnitId = (product: Product): string => {
    if (typeof product.baseUnit === 'object' && product.baseUnit !== null) {
      return (product.baseUnit as Unit)._id;
    }
    return product.baseUnit as string;
  };

  const changedCount = useMemo(() => {
    return products.filter((p) => {
      const value = counted[p._id];
      if (value === undefined || value === '') return false;
      return Number(value) !== p.currentStock;
    }).length;
  }, [products, counted]);

  const handleSubmit = async () => {
    const changedProducts = products.filter((p) => {
      const value = counted[p._id];
      if (value === undefined || value === '') return false;
      return Number(value) !== p.currentStock;
    });

    if (changedProducts.length === 0) {
      toast({ title: 'Farq topilmadi', description: 'Hech qanday qoldiq o\'zgartirilmadi' });
      return;
    }

    setSubmitting(true);
    let successCount = 0;
    let failCount = 0;

    for (const product of changedProducts) {
      try {
        await createMutation.mutateAsync({
          type: 'ADJUSTMENT',
          product: product._id,
          quantity: Number(counted[product._id]),
          unit: getUnitId(product),
          reason: 'Inventarizatsiya natijasida tuzatish',
        });
        successCount += 1;
      } catch {
        failCount += 1;
      }
    }

    setSubmitting(false);
    onOpenChange(false);

    if (failCount === 0) {
      toast({
        title: 'Muvaffaqiyatli',
        description: `${successCount} ta mahsulot qoldig'i yangilandi`,
      });
    } else {
      toast({
        title: 'Qisman bajarildi',
        description: `${successCount} ta muvaffaqiyatli, ${failCount} ta xatolik bilan`,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Inventarizatsiya</DialogTitle>
          <DialogDescription>
            Har bir mahsulot uchun haqiqiy (hisoblangan) qoldiqni kiriting. Tizimdagi qoldiqdan
            farq qilganlar uchun avtomatik tuzatish (ADJUSTMENT) harakati yaratiladi.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Mahsulot qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <div className="rounded-xl border border-border/60 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Mahsulot</TableHead>
                <TableHead>Tizimdagi qoldiq</TableHead>
                <TableHead className="w-40">Haqiqiy qoldiq</TableHead>
                <TableHead>Farq</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">
                    Mahsulot topilmadi
                  </TableCell>
                </TableRow>
              ) : (
              visibleProducts.map((product) => {
                const value = counted[product._id] ?? '';
                const diff = value === '' ? 0 : Number(value) - product.currentStock;
                return (
                  <TableRow key={product._id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatNumber(product.currentStock)} {getUnitSymbol(product)}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="any"
                        value={value}
                        onChange={(e) =>
                          setCounted((prev) => ({ ...prev, [product._id]: e.target.value }))
                        }
                        className="h-9"
                      />
                    </TableCell>
                    <TableCell
                      className={cn(
                        'font-medium',
                        diff > 0 && 'text-emerald-400',
                        diff < 0 && 'text-destructive',
                      )}
                    >
                      {diff === 0 ? '-' : `${diff > 0 ? '+' : ''}${formatNumber(diff)}`}
                    </TableCell>
                  </TableRow>
                );
              })
              )}
            </TableBody>
          </Table>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Bekor qilish
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting || changedCount === 0}>
            {submitting && <LoadingSpinner size="sm" className="mr-2 h-4 w-4" />}
            Tuzatishlarni saqlash {changedCount > 0 && `(${changedCount})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
