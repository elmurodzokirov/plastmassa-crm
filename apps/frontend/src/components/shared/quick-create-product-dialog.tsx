import { useCallback, useEffect, useState, type ChangeEvent } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Product } from '@plastmassa/shared';
import { useUnits } from '@/hooks/use-units';
import { useCreateProduct } from '@/hooks/use-products';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { ProductImage } from '@/components/shared/product-image';

const quickProductSchema = z.object({
  name: z.string().min(1, 'Nomi kiritish majburiy'),
  baseUnit: z.string().min(1, "O'lchov birligini tanlang"),
  price: z.coerce.number().min(0, "Narx 0 dan kam bo'lmasligi kerak"),
  category: z.string().optional(),
});

type QuickProductFormData = z.infer<typeof quickProductSchema>;

interface QuickCreateProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName?: string;
  onCreated: (product: Product) => void;
}

export function QuickCreateProductDialog({
  open,
  onOpenChange,
  initialName,
  onCreated,
}: QuickCreateProductDialogProps) {
  const { data: units } = useUnits();
  const createMutation = useCreateProduct();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<QuickProductFormData>({
    resolver: zodResolver(quickProductSchema),
    defaultValues: { name: '', baseUnit: '', price: 0, category: '' },
  });

  useEffect(() => {
    if (open) {
      reset({ name: initialName || '', baseUnit: '', price: 0, category: '' });
      setImageFile(null);
      setPreviewUrl(null);
    }
  }, [open, initialName, reset]);

  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(imageFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  const handleImageChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setImageFile(e.target.files?.[0] || null);
    e.target.value = '';
  }, []);

  const onSubmit = useCallback(
    async (data: QuickProductFormData) => {
      try {
        const product = await createMutation.mutateAsync({
          name: data.name,
          baseUnit: data.baseUnit,
          price: data.price,
          category: data.category || undefined,
          image: imageFile,
        });
        toast({ title: 'Muvaffaqiyatli', description: 'Yangi mahsulot yaratildi' });
        onCreated(product);
        onOpenChange(false);
      } catch {
        toast({ title: 'Xatolik', description: 'Mahsulot yaratishda xatolik yuz berdi', variant: 'destructive' });
      }
    },
    [createMutation, imageFile, onCreated, onOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Yangi mahsulot yaratish</DialogTitle>
          <DialogDescription>
            Kirim oynasini yopmasdan yangi mahsulot qo'shing — yaratilgach avtomatik tanlanadi
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex items-center gap-4">
            <ProductImage
              src={previewUrl}
              alt={initialName || 'Yangi mahsulot'}
              className="h-16 w-16 shrink-0 rounded-2xl border border-border/70 bg-background"
              iconClassName="h-6 w-6 text-muted-foreground"
            />
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs">Rasm (ixtiyoriy)</Label>
              <Input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleImageChange}
                className="h-9 cursor-pointer text-xs"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="qc-name">
              Nomi <span className="text-destructive">*</span>
            </Label>
            <Input id="qc-name" placeholder="Mahsulot nomi" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>
              O'lchov birligi <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="baseUnit"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="O'lchov birligini tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    {units?.map((unit) => (
                      <SelectItem key={unit._id} value={unit._id}>
                        {unit.name} ({unit.symbol})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.baseUnit && <p className="text-xs text-destructive">{errors.baseUnit.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="qc-price">
              Sotish narxi <span className="text-destructive">*</span>
            </Label>
            <Input id="qc-price" type="number" step="any" min={0} placeholder="0" {...register('price')} />
            {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="qc-category">Kategoriya</Label>
            <Input id="qc-category" placeholder="Masalan: Idishlar" {...register('category')} />
          </div>

          <p className="text-xs text-muted-foreground">
            Qo'shimcha maydonlar (tannarx, ishbay narxi, sotuv birliklari) uchun mahsulotni keyinroq
            "Mahsulotlar" bo'limida tahrirlashingiz mumkin.
          </p>

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
