import { useState, useMemo, useEffect } from 'react';
import { Search } from 'lucide-react';
import type { Material, Unit } from '@plastmassa/shared';
import { cn, formatNumber } from '@/lib/utils';
import { useMaterialStockTake } from '@/hooks/use-materials';
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

interface MaterialStockTakeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  materials: Material[];
}

export function MaterialStockTakeDialog({ open, onOpenChange, materials }: MaterialStockTakeDialogProps) {
  const [counted, setCounted] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const stockTakeMutation = useMaterialStockTake();

  useEffect(() => {
    if (open) {
      const initial: Record<string, string> = {};
      materials.forEach((m) => {
        initial[m._id] = String(m.currentStock);
      });
      setCounted(initial);
      setSearch('');
    }
  }, [open, materials]);

  // Filters the visible rows only — entered counts for hidden rows are kept intact.
  const visibleMaterials = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return materials;
    return materials.filter((m) => m.name.toLowerCase().includes(q));
  }, [materials, search]);

  const getUnitSymbol = (material: Material): string => {
    if (typeof material.baseUnit === 'object' && material.baseUnit !== null) {
      return (material.baseUnit as Unit).symbol;
    }
    return '';
  };

  const changedCount = useMemo(() => {
    return materials.filter((m) => {
      const value = counted[m._id];
      if (value === undefined || value === '') return false;
      return Number(value) !== m.currentStock;
    }).length;
  }, [materials, counted]);

  const handleSubmit = async () => {
    const changedMaterials = materials.filter((m) => {
      const value = counted[m._id];
      if (value === undefined || value === '') return false;
      return Number(value) !== m.currentStock;
    });

    if (changedMaterials.length === 0) {
      toast({ title: 'Farq topilmadi', description: 'Hech qanday qoldiq o\'zgartirilmadi' });
      return;
    }

    setSubmitting(true);
    let successCount = 0;
    let failCount = 0;

    for (const material of changedMaterials) {
      try {
        await stockTakeMutation.mutateAsync({
          id: material._id,
          quantity: Number(counted[material._id]),
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
        description: `${successCount} ta xom-ashyo qoldig'i yangilandi`,
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
            Har bir xom-ashyo uchun haqiqiy (hisoblangan) qoldiqni kiriting. Tizimdagi qoldiqdan
            farq qilganlar uchun qoldiq avtomatik tuzatiladi.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Xom-ashyo qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <div className="rounded-xl border border-border/60 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Xom-ashyo</TableHead>
                <TableHead>Tizimdagi qoldiq</TableHead>
                <TableHead className="w-40">Haqiqiy qoldiq</TableHead>
                <TableHead>Farq</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleMaterials.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">
                    Xom-ashyo topilmadi
                  </TableCell>
                </TableRow>
              ) : (
              visibleMaterials.map((material) => {
                const value = counted[material._id] ?? '';
                const diff = value === '' ? 0 : Number(value) - material.currentStock;
                return (
                  <TableRow key={material._id}>
                    <TableCell className="font-medium">{material.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatNumber(material.currentStock)} {getUnitSymbol(material)}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="any"
                        value={value}
                        onChange={(e) =>
                          setCounted((prev) => ({ ...prev, [material._id]: e.target.value }))
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
