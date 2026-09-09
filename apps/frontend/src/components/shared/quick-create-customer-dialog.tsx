import { useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Customer } from '@plastmassa/shared';
import { useCreateCustomer } from '@/hooks/use-customers';
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

const quickCustomerSchema = z.object({
  name: z.string().min(1, 'Nomi kiritish majburiy'),
  phone: z.string().optional(),
  address: z.string().optional(),
});

type QuickCustomerFormData = z.infer<typeof quickCustomerSchema>;

interface QuickCreateCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName?: string;
  onCreated: (customer: Customer) => void;
}

export function QuickCreateCustomerDialog({
  open,
  onOpenChange,
  initialName,
  onCreated,
}: QuickCreateCustomerDialogProps) {
  const createMutation = useCreateCustomer();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<QuickCustomerFormData>({
    resolver: zodResolver(quickCustomerSchema),
    defaultValues: { name: '', phone: '', address: '' },
  });

  useEffect(() => {
    if (open) {
      reset({ name: initialName || '', phone: '', address: '' });
    }
  }, [open, initialName, reset]);

  const onSubmit = useCallback(
    async (data: QuickCustomerFormData) => {
      try {
        const customer = await createMutation.mutateAsync({
          name: data.name,
          phone: data.phone || undefined,
          address: data.address || undefined,
        });
        toast({ title: 'Muvaffaqiyatli', description: 'Yangi mijoz yaratildi' });
        onCreated(customer);
        onOpenChange(false);
      } catch {
        toast({ title: 'Xatolik', description: 'Mijoz yaratishda xatolik yuz berdi', variant: 'destructive' });
      }
    },
    [createMutation, onCreated, onOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Yangi mijoz yaratish</DialogTitle>
          <DialogDescription>
            Sotuv oynasini yopmasdan yangi mijoz qo'shing — yaratilgach avtomatik tanlanadi
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="qc-name">
              Nomi <span className="text-destructive">*</span>
            </Label>
            <Input id="qc-name" placeholder="Mijoz nomi" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="qc-phone">Telefon</Label>
            <Input id="qc-phone" placeholder="+998 90 123 45 67" {...register('phone')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="qc-address">Manzil</Label>
            <Input id="qc-address" placeholder="Manzil" {...register('address')} />
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
