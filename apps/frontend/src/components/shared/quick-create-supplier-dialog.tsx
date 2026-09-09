import { useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Supplier } from '@plastmassa/shared';
import { useCreateSupplier } from '@/hooks/use-suppliers';
import { toast } from '@/components/ui/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

const quickSupplierSchema = z.object({
  name: z.string().min(1, 'Nomi kiritish majburiy'),
  phone: z.string().optional(),
  address: z.string().optional(),
});

type QuickSupplierFormData = z.infer<typeof quickSupplierSchema>;

interface QuickCreateSupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName?: string;
  onCreated: (supplier: Supplier) => void;
}

export function QuickCreateSupplierDialog({
  open,
  onOpenChange,
  initialName,
  onCreated,
}: QuickCreateSupplierDialogProps) {
  const createMutation = useCreateSupplier();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<QuickSupplierFormData>({
    resolver: zodResolver(quickSupplierSchema),
    defaultValues: { name: '', phone: '', address: '' },
  });

  useEffect(() => {
    if (open) {
      reset({ name: initialName || '', phone: '', address: '' });
    }
  }, [open, initialName, reset]);

  const onSubmit = useCallback(
    async (data: QuickSupplierFormData) => {
      try {
        const supplier = await createMutation.mutateAsync({
          name: data.name,
          phone: data.phone || undefined,
          address: data.address || undefined,
        });
        toast({ title: 'Muvaffaqiyatli', description: 'Yangi yetkazib beruvchi yaratildi' });
        onCreated(supplier);
        onOpenChange(false);
      } catch {
        toast({ title: 'Xatolik', description: 'Yetkazib beruvchi yaratishda xatolik yuz berdi', variant: 'destructive' });
      }
    },
    [createMutation, onCreated, onOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Yangi yetkazib beruvchi yaratish</DialogTitle>
          <DialogDescription>
            Kirim oynasini yopmasdan yangi yetkazib beruvchi qo'shing — yaratilgach avtomatik tanlanadi
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="qs-name">
              Nomi <span className="text-destructive">*</span>
            </Label>
            <Input id="qs-name" placeholder="Yetkazib beruvchi nomi" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="qs-phone">Telefon</Label>
            <Input id="qs-phone" placeholder="+998 90 123 45 67" {...register('phone')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="qs-address">Manzil</Label>
            <Input id="qs-address" placeholder="Manzil" {...register('address')} />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Bekor qilish
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <LoadingSpinner size="sm" className="mr-2 h-4 w-4" />}
              Yaratish
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
