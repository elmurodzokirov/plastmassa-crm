import { useState, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  Search,
  Settings2,
  PackageCheck,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { Machine } from '@plastmassa/shared';
import {
  useMachines,
  useCreateMachine,
  useUpdateMachine,
  useDeleteMachine,
} from '@/hooks/use-machines';
import { toast } from '@/components/ui/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { StatCard } from '@/components/shared/stat-card';
import { DataTableWrapper } from '@/components/shared/data-table';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

const machineSchema = z.object({
  name: z.string().min(1, 'Nomi kiritish majburiy'),
  model: z.string().optional(),
  notes: z.string().optional(),
});

type MachineFormData = z.infer<typeof machineSchema>;

const EMPTY_FORM_VALUES: MachineFormData = {
  name: '',
  model: '',
  notes: '',
};

export default function MachinesPage() {
  const [search, setSearch] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingMachine, setDeletingMachine] = useState<Machine | null>(null);

  const { data: machines, isLoading } = useMachines();
  const createMutation = useCreateMachine();
  const updateMutation = useUpdateMachine();
  const deleteMutation = useDeleteMachine();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MachineFormData>({
    resolver: zodResolver(machineSchema),
    defaultValues: EMPTY_FORM_VALUES,
  });

  const allMachines = machines || [];
  const filteredMachines = useMemo(() => {
    if (!search.trim()) return allMachines;
    const q = search.toLowerCase();
    return allMachines.filter(
      (m) => m.name.toLowerCase().includes(q) || (m.model || '').toLowerCase().includes(q),
    );
  }, [allMachines, search]);

  const activeCount = useMemo(() => allMachines.filter((m) => m.isActive).length, [allMachines]);

  const openCreateDialog = useCallback(() => {
    setEditingMachine(null);
    reset(EMPTY_FORM_VALUES);
    setDialogOpen(true);
  }, [reset]);

  const openEditDialog = useCallback(
    (machine: Machine) => {
      setEditingMachine(machine);
      reset({
        name: machine.name,
        model: machine.model || '',
        notes: machine.notes || '',
      });
      setDialogOpen(true);
    },
    [reset],
  );

  const openDeleteDialog = useCallback((machine: Machine) => {
    setDeletingMachine(machine);
    setDeleteDialogOpen(true);
  }, []);

  const onSubmit = useCallback(
    async (data: MachineFormData) => {
      try {
        const payload = {
          name: data.name,
          model: data.model || undefined,
          notes: data.notes || undefined,
        };

        if (editingMachine) {
          await updateMutation.mutateAsync({ id: editingMachine._id, data: payload });
          toast({ title: 'Muvaffaqiyatli', description: 'Stanok muvaffaqiyatli yangilandi' });
        } else {
          await createMutation.mutateAsync(payload);
          toast({ title: 'Muvaffaqiyatli', description: 'Yangi stanok muvaffaqiyatli qo\'shildi' });
        }
        setDialogOpen(false);
        reset(EMPTY_FORM_VALUES);
      } catch {
        toast({ title: 'Xatolik', description: 'Amalni bajarishda xatolik yuz berdi', variant: 'destructive' });
      }
    },
    [editingMachine, createMutation, updateMutation, reset],
  );

  const handleDelete = useCallback(async () => {
    if (!deletingMachine) return;
    try {
      await deleteMutation.mutateAsync(deletingMachine._id);
      toast({ title: 'Muvaffaqiyatli', description: 'Stanok muvaffaqiyatli o\'chirildi' });
      setDeleteDialogOpen(false);
      setDeletingMachine(null);
    } catch {
      toast({ title: 'Xatolik', description: 'O\'chirishda xatolik yuz berdi', variant: 'destructive' });
    }
  }, [deletingMachine, deleteMutation]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Stanoklar</h1>
          <p className="text-sm text-muted-foreground mt-1">Jami {allMachines.length} ta stanok</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            Yangi stanok
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          title="Jami stanoklar"
          value={isLoading ? '...' : allMachines.length}
          icon={Settings2}
          iconColor="text-indigo-400"
          iconBg="bg-indigo-500/20"
          index={0}
        />
        <StatCard
          title="Faol"
          value={isLoading ? '...' : activeCount}
          icon={PackageCheck}
          iconColor="text-green-400"
          iconBg="bg-green-500/20"
          index={1}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Stanok nomi bo'yicha qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </motion.div>

      <DataTableWrapper
        isLoading={isLoading}
        isEmpty={!isLoading && filteredMachines.length === 0}
        emptyTitle="Stanoklar topilmadi"
        emptyDescription="Hozircha hech qanday stanok qo'shilmagan yoki qidiruv natijasi topilmadi"
      >
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Nomi</TableHead>
              <TableHead className="hidden sm:table-cell">Model</TableHead>
              <TableHead className="hidden md:table-cell">Izoh</TableHead>
              <TableHead className="hidden sm:table-cell">Holat</TableHead>
              <TableHead className="w-12">Amallar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMachines.map((machine) => (
              <TableRow key={machine._id}>
                <TableCell className="font-medium text-foreground">{machine.name}</TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground">
                  {machine.model || '-'}
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">
                  {machine.notes || '-'}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge variant={machine.isActive ? 'success' : 'secondary'}>
                    {machine.isActive ? 'Faol' : 'Nofaol'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(machine)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Tahrirlash
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => openDeleteDialog(machine)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        O'chirish
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableWrapper>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingMachine ? 'Stanokni tahrirlash' : 'Yangi stanok qo\'shish'}</DialogTitle>
            <DialogDescription>
              {editingMachine ? 'Stanok ma\'lumotlarini yangilang' : 'Yangi stanok ma\'lumotlarini kiriting'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nomi <span className="text-destructive">*</span></Label>
              <Input id="name" placeholder="Masalan: Ekstruder-1" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Input id="model" placeholder="Masalan: SJ-120" {...register('model')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Izoh</Label>
              <Input id="notes" placeholder="Qo'shimcha izoh" {...register('notes')} />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Bekor qilish</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) && <LoadingSpinner size="sm" className="mr-2 h-4 w-4" />}
                {editingMachine ? 'Saqlash' : 'Qo\'shish'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Ishonchingiz kommi?"
        description={`"${deletingMachine?.name}" stanogini o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi.`}
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
        variant="destructive"
      />
    </div>
  );
}
