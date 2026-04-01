import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Shield, Plus, Pencil, Trash2, Loader2, Lock } from 'lucide-react';
import {
  useRoles,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
} from '@/hooks/use-roles';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { PermissionMatrix } from '@/components/shared/permission-matrix';
import type { RoleDoc } from '@plastmassa/shared';

export default function RolesPage() {
  const { data: roles, isLoading } = useRoles();
  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole();
  const deleteMutation = useDeleteRole();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleDoc | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openCreate = () => {
    setEditingRole(null);
    setName('');
    setDescription('');
    setPermissions([]);
    setDialogOpen(true);
  };

  const openEdit = (role: RoleDoc) => {
    setEditingRole(role);
    setName(role.name);
    setDescription(role.description || '');
    setPermissions([...role.permissions]);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: 'Rol nomini kiriting', variant: 'destructive' });
      return;
    }

    try {
      if (editingRole) {
        const payload: any = { permissions };
        if (!editingRole.isSystem) {
          payload.name = name.trim();
          payload.description = description.trim() || undefined;
        }
        await updateMutation.mutateAsync({ id: editingRole._id, data: payload });
        toast({ title: 'Rol yangilandi' });
      } else {
        await createMutation.mutateAsync({
          name: name.trim(),
          description: description.trim() || undefined,
          permissions,
        });
        toast({ title: 'Yangi rol yaratildi' });
      }
      setDialogOpen(false);
      setEditingRole(null);
    } catch (err: any) {
      toast({
        title: 'Xatolik',
        description: err?.response?.data?.message || 'Xatolik yuz berdi',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
      toast({ title: "Rol o'chirildi" });
    } catch (err: any) {
      toast({
        title: 'Xatolik',
        description: err?.response?.data?.message || 'Xatolik yuz berdi',
        variant: 'destructive',
      });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Rollar</h1>
          <p className="text-muted-foreground">Rollar va ruxsatlarni boshqarish</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Rol qo'shish
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nomi</TableHead>
              <TableHead>Tavsif</TableHead>
              <TableHead>Ruxsatlar</TableHead>
              <TableHead>Turi</TableHead>
              <TableHead className="w-[100px]">Amallar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(roles || []).map((role) => (
              <TableRow key={role._id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-indigo-400" />
                    {role.name}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {role.description || '—'}
                </TableCell>
                <TableCell>
                  <span className="text-muted-foreground">
                    {role.permissions.length} ta ruxsat
                  </span>
                </TableCell>
                <TableCell>
                  {role.isSystem ? (
                    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                      <Lock className="mr-1 h-3 w-3" />
                      Tizim
                    </Badge>
                  ) : (
                    <Badge variant="outline">Maxsus</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-blue-400"
                      onClick={() => openEdit(role)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {!role.isSystem && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-400 hover:text-red-300"
                        onClick={() => setDeleteId(role._id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {(!roles || roles.length === 0) && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Rollar topilmadi
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDialogOpen(false);
            setEditingRole(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRole ? `Rolni tahrirlash: ${editingRole.name}` : 'Yangi rol'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Name & Description */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Rol nomi <span className="text-red-400">*</span></Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Masalan: Nazoratchi"
                  disabled={editingRole?.isSystem}
                />
              </div>
              <div className="space-y-2">
                <Label>Tavsif</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Qisqacha tavsif"
                  disabled={editingRole?.isSystem}
                />
              </div>
            </div>

            {/* Permission Matrix */}
            <div className="space-y-2">
              <Label>Ruxsatlar ({permissions.length} ta tanlangan)</Label>
              <PermissionMatrix value={permissions} onChange={setPermissions} />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                setEditingRole(null);
              }}
            >
              Bekor qilish
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingRole ? 'Saqlash' : 'Yaratish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rolni o'chirish</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Bu rolni o'chirishni xohlaysizmi? Rolga biriktirilgan foydalanuvchilar ta'sirlanishi mumkin.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Bekor qilish
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              O'chirish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
