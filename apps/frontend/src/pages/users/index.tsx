import { useState, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { uz } from 'date-fns/locale';
import { motion } from 'framer-motion';
import {
  Users,
  Plus,
  Pencil,
  Loader2,
  Phone,
  Shield,
  UserCheck,
  UserX,
  Search,
  Power,
  Banknote,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUsers, useCreateUser, useUpdateUser } from '@/hooks/use-users';
import { useRoles } from '@/hooks/use-roles';
import { usePayrolls } from '@/hooks/use-payroll';
import { formatCurrency } from '@/lib/utils';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { StatCard } from '@/components/shared/stat-card';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

function formatTimeAgo(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true, locale: uz });
}

const SALARY_TYPE_LABELS: Record<string, string> = {
  FIXED: 'Oylik',
  PIECE_RATE: 'Ishbay',
};

const INACTIVE_REASONS = [
  { value: 'QUIT', label: 'Ishdan ketdi' },
  { value: 'FIRED', label: 'Ishdan bo\'shatildi' },
  { value: 'VACATION', label: 'Ta\'tilda' },
  { value: 'SICK_LEAVE', label: 'Kasallik ta\'tili' },
  { value: 'MATERNITY', label: 'Dekret ta\'tili' },
  { value: 'SUSPENDED', label: 'Vaqtincha to\'xtatilgan' },
  { value: 'OTHER', label: 'Boshqa' },
];

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const { data: usersData, isLoading } = useUsers({ limit: 9999, search: search || undefined });
  const { data: roles } = useRoles();
  const { data: payrollsData } = usePayrolls({ limit: 9999, sortBy: 'year', sortOrder: 'desc' });
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  // Status dialog
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusUser, setStatusUser] = useState<any>(null);
  const [inactiveReason, setInactiveReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  // Form state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState('');
  const [salaryType, setSalaryType] = useState('FIXED');
  const [baseSalaryInput, setBaseSalaryInput] = useState(0);

  const users = usersData?.items || [];
  const payrolls = payrollsData?.items || [];

  // Har bir user uchun oxirgi payroll'dan remainingBalance
  const userBalanceMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of payrolls as any[]) {
      const userId = typeof p.user === 'string' ? p.user : p.user?._id;
      if (!userId) continue;
      // Payrolls desc sorted, shuning uchun birinchi topilgani eng oxirgi
      if (!(userId in map)) {
        map[userId] = p.remainingBalance || 0;
      }
    }
    return map;
  }, [payrolls]);

  const totalDebt = useMemo(() => {
    return Object.values(userBalanceMap).reduce((sum, v) => sum + v, 0);
  }, [userBalanceMap]);

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u: any) => u.isActive).length;
    const inactive = total - active;
    const fixed = users.filter((u: any) => (u.salaryType || 'FIXED') === 'FIXED').length;
    const pieceRate = users.filter((u: any) => u.salaryType === 'PIECE_RATE').length;
    return { total, active, inactive, fixed, pieceRate };
  }, [users]);

  const resetForm = () => {
    setFullName('');
    setPhone('');
    setPassword('');
    setRoleId('');
    setSalaryType('FIXED');
    setBaseSalaryInput(0);
  };

  const openCreate = () => {
    setEditingUser(null);
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (user: any) => {
    setEditingUser(user);
    setFullName(user.fullName);
    setPhone(user.phone || '');
    setPassword('');
    // Role ID olish — populate qilingan bo'lsa _id, aks holda string
    const userRole = user.role;
    let rId = '';
    if (typeof userRole === 'object' && userRole?._id) {
      // Roles listdan mos keluvchisini name bo'yicha topish (mock data uchun fallback)
      const matchById = (roles || []).find((r: any) => String(r._id) === String(userRole._id));
      if (matchById) {
        rId = String(matchById._id);
      } else {
        // ID mos kelmasa, name bo'yicha topish
        const matchByName = (roles || []).find((r: any) => r.name === userRole.name);
        rId = matchByName ? String(matchByName._id) : String(userRole._id);
      }
    } else {
      rId = String(userRole || '');
    }
    setRoleId(rId);
    setSalaryType(user.salaryType || 'FIXED');
    setBaseSalaryInput(user.baseSalary || 0);
    setDialogOpen(true);
  };

  const openStatusDialog = (user: any) => {
    setStatusUser(user);
    setInactiveReason('');
    setCustomReason('');
    setStatusDialogOpen(true);
  };

  const handleSave = async () => {
    if (!fullName.trim() || !phone.trim() || !roleId) {
      toast({ title: 'Barcha majburiy maydonlarni to\'ldiring', variant: 'destructive' });
      return;
    }

    try {
      if (editingUser) {
        const data: any = { fullName, phone, role: roleId, salaryType, baseSalary: baseSalaryInput };
        if (password) data.password = password;
        await updateMutation.mutateAsync({ id: editingUser._id, data });
        toast({ title: 'Xodim yangilandi' });
      } else {
        if (!password || password.length < 6) {
          toast({ title: 'Parol kamida 6 belgi bo\'lishi kerak', variant: 'destructive' });
          return;
        }
        const autoUsername = phone.replace(/\D/g, '').slice(-9) || `user_${Date.now()}`;
        await createMutation.mutateAsync({ fullName, username: autoUsername, phone, password, role: roleId, salaryType, baseSalary: baseSalaryInput });
        toast({ title: 'Yangi xodim yaratildi' });
      }
      setDialogOpen(false);
      setEditingUser(null);
    } catch (err: any) {
      toast({ title: 'Xatolik', description: err?.response?.data?.message || 'Xatolik yuz berdi', variant: 'destructive' });
    }
  };

  const handleStatusChange = async () => {
    if (!statusUser) return;

    const isCurrentlyActive = statusUser.isActive;

    // Deactivating — need reason
    if (isCurrentlyActive && !inactiveReason) {
      toast({ title: 'Sababni tanlang', variant: 'destructive' });
      return;
    }
    if (isCurrentlyActive && inactiveReason === 'OTHER' && !customReason.trim()) {
      toast({ title: 'Sababni kiriting', variant: 'destructive' });
      return;
    }

    try {
      const data: any = { isActive: !isCurrentlyActive };
      if (isCurrentlyActive) {
        const reason = inactiveReason === 'OTHER'
          ? customReason.trim()
          : INACTIVE_REASONS.find((r) => r.value === inactiveReason)?.label || inactiveReason;
        data.inactiveReason = reason;
      } else {
        data.inactiveReason = '';
      }

      await updateMutation.mutateAsync({ id: statusUser._id, data });
      toast({
        title: isCurrentlyActive ? 'Xodim nofaol qilindi' : 'Xodim faollashtirildi',
      });
      setStatusDialogOpen(false);
      setStatusUser(null);
    } catch (err: any) {
      toast({ title: 'Xatolik', description: err?.response?.data?.message, variant: 'destructive' });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const getRoleName = (user: any) => {
    if (!user.role) return '—';
    if (typeof user.role === 'object') return user.role.name || '—';
    const found = roles?.find((r: any) => r._id === user.role);
    return found?.name || user.role;
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><LoadingSpinner /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Xodimlar</h1>
        <Button onClick={openCreate} size="sm" className="gap-1.5 rounded-xl h-9">
          <Plus className="h-3.5 w-3.5" />
          Yangi xodim
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard title="Jami" value={stats.total} icon={Users} iconColor="text-indigo-400" iconBg="bg-indigo-500/20" index={0} />
        <StatCard title="Faol" value={stats.active} icon={UserCheck} iconColor="text-green-400" iconBg="bg-green-500/20" index={1} />
        <StatCard title="Nofaol" value={stats.inactive} icon={UserX} iconColor="text-red-400" iconBg="bg-red-500/20" index={2} />
        <StatCard title="Oylik" value={stats.fixed} icon={Users} iconColor="text-blue-400" iconBg="bg-blue-500/20" index={3} />
        <StatCard title="Ishbay" value={stats.pieceRate} icon={Users} iconColor="text-amber-400" iconBg="bg-amber-500/20" index={4} />
        {totalDebt > 0 && (
          <StatCard title="Jami qarz" value={formatCurrency(totalDebt)} icon={Banknote} iconColor="text-orange-400" iconBg="bg-orange-500/20" index={5} />
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Xodim qidirish..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 rounded-xl"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/50 hover:bg-transparent">
                <TableHead className="min-w-[180px]">Xodim</TableHead>
                <TableHead className="min-w-[130px]">Telefon</TableHead>
                <TableHead className="min-w-[120px]">Rol</TableHead>
                <TableHead className="min-w-[90px] text-center">Ish haqi</TableHead>
                <TableHead className="min-w-[100px] text-right">Qarz</TableHead>
                <TableHead className="min-w-[110px]">Oxirgi faollik</TableHead>
                <TableHead className="min-w-[100px] text-center">Holat</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user: any) => (
                <TableRow
                  key={user._id}
                  className={cn(
                    'border-b border-border/20 hover:bg-muted/10',
                    !user.isActive && 'opacity-60',
                  )}
                >
                  <TableCell>
                    <span className="font-medium text-foreground text-sm">{user.fullName}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {user.phone || '—'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Shield className="h-3 w-3 text-indigo-400" />
                      <span className="text-sm">{getRoleName(user)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={user.salaryType === 'PIECE_RATE' ? 'outline' : 'secondary'}
                      className="text-[10px] px-1.5 py-0"
                    >
                      {SALARY_TYPE_LABELS[user.salaryType || 'FIXED']}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {(userBalanceMap[user._id] || 0) > 0 ? (
                      <span className="text-sm font-medium text-orange-400">
                        {formatCurrency(userBalanceMap[user._id])}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {user.lastActiveAt ? formatTimeAgo(new Date(user.lastActiveAt)) : '—'}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    {user.isActive ? (
                      <Badge variant="success" className="text-[10px] px-1.5 py-0">Faol</Badge>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 cursor-help">
                            Nofaol
                          </Badge>
                        </TooltipTrigger>
                        {user.inactiveReason && (
                          <TooltipContent>
                            <p className="text-xs">{user.inactiveReason}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-0.5">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-blue-400" onClick={() => openEdit(user)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          'h-7 w-7',
                          user.isActive
                            ? 'text-muted-foreground hover:text-red-400'
                            : 'text-muted-foreground hover:text-green-400',
                        )}
                        onClick={() => openStatusDialog(user)}
                      >
                        <Power className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                    Xodimlar topilmadi
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setDialogOpen(false); setEditingUser(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Xodimni tahrirlash' : 'Yangi xodim'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>To'liq ism <span className="text-red-400">*</span></Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ism Familiya" className="rounded-xl" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Telefon <span className="text-red-400">*</span></Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998901234567" className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>{editingUser ? 'Yangi parol' : 'Parol'} {!editingUser && <span className="text-red-400">*</span>}</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={editingUser ? 'Bo\'sh qoldiring' : 'Kamida 6 belgi'} className="rounded-xl" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Rol <span className="text-red-400">*</span></Label>
                <Select
                  key={roleId || 'empty'}
                  value={roleId || undefined}
                  onValueChange={setRoleId}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Rolni tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    {(roles || []).map((r: any) => (
                      <SelectItem key={String(r._id)} value={String(r._id)}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ish haqi turi</Label>
                <Select value={salaryType} onValueChange={setSalaryType}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIXED">Oylik</SelectItem>
                    <SelectItem value="PIECE_RATE">Ishbay</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {salaryType === 'FIXED' && (
              <div className="space-y-2">
                <Label>Oylik maosh (UZS)</Label>
                <Input
                  type="number"
                  min={0}
                  value={baseSalaryInput}
                  onChange={(e) => setBaseSalaryInput(Number(e.target.value) || 0)}
                  placeholder="5 000 000"
                  className="rounded-xl"
                />
                <p className="text-[10px] text-muted-foreground">Oylik hisoblashda avtomatik ishlatiladi</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); setEditingUser(null); }} className="rounded-xl">
              Bekor qilish
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="gap-1.5 rounded-xl">
              {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {editingUser ? 'Saqlash' : 'Yaratish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Change Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={(open) => { if (!open) { setStatusDialogOpen(false); setStatusUser(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {statusUser?.isActive ? 'Xodimni nofaol qilish' : 'Xodimni faollashtirish'}
            </DialogTitle>
          </DialogHeader>

          {statusUser?.isActive ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{statusUser?.fullName}</span> ni nofaol holatga o'tkazish sababini tanlang:
              </p>
              <div className="space-y-2">
                <Label>Sabab <span className="text-red-400">*</span></Label>
                <Select value={inactiveReason} onValueChange={setInactiveReason}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Sababni tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    {INACTIVE_REASONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {inactiveReason === 'OTHER' && (
                <div className="space-y-2">
                  <Label>Boshqa sabab <span className="text-red-400">*</span></Label>
                  <Input
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Sababni kiriting..."
                    className="rounded-xl"
                  />
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{statusUser?.fullName}</span> ni qayta faollashtirmoqchimisiz?
              {statusUser?.inactiveReason && (
                <span className="block mt-2 text-xs">
                  Nofaollik sababi: <span className="text-foreground">{statusUser.inactiveReason}</span>
                </span>
              )}
            </p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setStatusDialogOpen(false); setStatusUser(null); }} className="rounded-xl">
              Bekor qilish
            </Button>
            <Button
              variant={statusUser?.isActive ? 'destructive' : 'default'}
              onClick={handleStatusChange}
              disabled={updateMutation.isPending}
              className="gap-1.5 rounded-xl"
            >
              {updateMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {statusUser?.isActive ? 'Nofaol qilish' : 'Faollashtirish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
