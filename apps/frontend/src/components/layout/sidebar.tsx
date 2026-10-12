import { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Package,
  Factory,
  CalendarCheck,
  Banknote,
  Wallet,
  BarChart3,
  Shield,
  UserCog,
  ChevronLeft,
  ChevronDown,
  X,
  Warehouse,
  Plus,
  RotateCcw,
  Boxes,
  Calculator,
  Truck,
  Settings2,
  TrendingUp,
  TrendingDown,
  Sun,
  Moon,
  Monitor,
  LogOut,
  KeyRound,
  type LucideIcon,
} from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { useUIStore } from '@/stores/ui.store';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthStore } from '@/stores/auth.store';
import { useChangePassword } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// ── Change password form ────────────────────────────────────────────────
// "Joriy parol" faqat foydalanuvchida parol allaqachon mavjud bo'lsa talab
// qilinadi. Telegram OTP orqali kirib, hali parol o'rnatmagan foydalanuvchi
// uchun bu birinchi marta parol o'rnatish bo'ladi — joriy parol so'ralmaydi.
function buildChangePasswordSchema(requireCurrentPassword: boolean) {
  return z
    .object({
      currentPassword: z.string().optional(),
      newPassword: z.string().min(6, "Yangi parol kamida 6 belgidan iborat bo'lishi kerak"),
      confirmPassword: z.string().min(1, 'Yangi parolni tasdiqlang'),
    })
    .superRefine((data, ctx) => {
      if (requireCurrentPassword && !data.currentPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Joriy parolni kiriting',
          path: ['currentPassword'],
        });
      }
      if (data.newPassword !== data.confirmPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Parollar mos kelmadi',
          path: ['confirmPassword'],
        });
      }
    });
}

type ChangePasswordFormData = {
  currentPassword?: string;
  newPassword: string;
  confirmPassword: string;
};

interface NavItem {
  icon: LucideIcon;
  name: string;
  path: string;
  actionPath?: string;
  actionLabel?: string;
  actionPermission?: string;
  permission?: string;
}

interface NavGroup {
  icon: LucideIcon;
  name: string;
  children: NavItem[];
}

type NavigationEntry = NavItem | NavGroup;

function isNavGroup(entry: NavigationEntry): entry is NavGroup {
  return 'children' in entry;
}

const navigation: NavigationEntry[] = [
  // Asosiy
  { icon: LayoutDashboard, name: 'Bosh sahifa', path: '/' },

  // Sotuv
  {
    icon: ShoppingCart,
    name: 'Sotuv',
    children: [
      { icon: ShoppingCart, name: 'Buyurtmalar', path: '/orders', actionPath: '/orders/new', actionLabel: 'Yangi', actionPermission: 'orders:create', permission: 'orders:read' },
      { icon: Users, name: 'Mijozlar', path: '/customers', permission: 'customers:read' },
      { icon: RotateCcw, name: 'Qaytarishlar', path: '/returns', permission: 'returns:read' },
    ],
  },

  // Ombor
  {
    icon: Warehouse,
    name: 'Ombor',
    children: [
      { icon: Calculator, name: 'Kalkulyatsiya', path: '/calculations', permission: 'products:read' },
      { icon: Package, name: 'Mahsulotlar', path: '/products', actionPath: '/products/lots', actionLabel: 'Kirim', permission: 'products:read' },
      { icon: Boxes, name: 'Xom-ashyo', path: '/materials', permission: 'products:read' },
      { icon: Truck, name: 'Yetkazib beruvchilar', path: '/suppliers', permission: 'products:read' },
      { icon: Warehouse, name: 'Ombor harakatlari', path: '/stock/movements', permission: 'stock:read' },
      { icon: Factory, name: 'Ishlab chiqarish', path: '/production', permission: 'production:read' },
      { icon: Settings2, name: 'Stanoklar', path: '/machines', permission: 'production:read' },
    ],
  },

  // Kadrlar
  {
    icon: UserCog,
    name: 'Kadrlar',
    children: [
      { icon: CalendarCheck, name: 'Davomat', path: '/attendance', permission: 'attendance:read' },
      { icon: Banknote, name: 'Maosh', path: '/payroll', permission: 'payroll:read' },
      { icon: UserCog, name: 'Xodimlar', path: '/users', permission: 'users:read' },
    ],
  },

  // Moliya
  {
    icon: Wallet,
    name: 'Moliya',
    children: [
      { icon: Wallet, name: 'Pul oqimi', path: '/finance', permission: 'finance:read' },
      { icon: TrendingUp, name: 'Kirim', path: '/finance/kirim', permission: 'finance:read' },
      { icon: TrendingDown, name: 'Chiqim', path: '/finance/chiqim', permission: 'finance:read' },
    ],
  },

  // Hisobotlar
  { icon: BarChart3, name: 'Hisobotlar', path: '/reports', permission: 'reports:read' },

  // Tizim
  {
    icon: Shield,
    name: 'Tizim',
    children: [
      { icon: Shield, name: 'Rollar', path: '/roles', permission: 'users:create' },
    ],
  },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { sidebarOpen, sidebarCollapsed, setSidebarOpen, toggleCollapse, theme, setTheme } = useUIStore();
  const { can } = usePermissions();
  const { user, logout } = useAuthStore();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // `hasPassword` eski (ushbu o'zgarishdan oldingi) saqlangan sessiyalarda
  // mavjud bo'lmasligi mumkin — bunday holda xavfsiz tomonga o'tib, joriy
  // parol talab qilinadi (oldingi xatti-harakat).
  const hasPassword = user?.hasPassword !== false;

  const changePassword = useChangePassword();
  const changePasswordForm = useForm<ChangePasswordFormData>({
    resolver: zodResolver(buildChangePasswordSchema(hasPassword)),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const openChangePasswordDialog = () => {
    changePasswordForm.reset({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setChangePasswordOpen(true);
  };

  const handleChangePassword = async (data: ChangePasswordFormData) => {
    try {
      await changePassword.mutateAsync({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      setChangePasswordOpen(false);
    } catch {
      // xatolik haqida toast useChangePassword ichida ko'rsatiladi
    }
  };

  // Filter navigation items by permission
  const filteredNavigation = navigation
    .map((entry) => {
      if (isNavGroup(entry)) {
        const filteredChildren = entry.children.filter(
          (child) => !child.permission || can(child.permission),
        );
        if (filteredChildren.length === 0) return null;
        return { ...entry, children: filteredChildren };
      }
      if (entry.permission && !can(entry.permission)) return null;
      return entry;
    })
    .filter(Boolean) as NavigationEntry[];

  // Auto-expand group when active child is present
  useEffect(() => {
    navigation.forEach((entry) => {
      if (isNavGroup(entry)) {
        const hasActiveChild = entry.children.some((child) =>
          child.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(child.path),
        );
        if (hasActiveChild) {
          setExpandedGroups((prev) => {
            if (prev.has(entry.name)) return prev;
            const next = new Set(prev);
            next.add(entry.name);
            return next;
          });
        }
      }
    });
  }, [location.pathname]);

  const toggleGroup = (name: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const isItemActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const isGroupActive = (group: NavGroup) =>
    group.children.some((child) => isItemActive(child.path));

  const renderNavItem = (item: NavItem, nested = false) => {
    const active = isItemActive(item.path);
    const canUseAction =
      item.actionPath &&
      (!item.actionPermission || can(item.actionPermission));

    const linkContent = (
      <div key={item.path} className="flex items-center">
        <NavLink
          to={item.path}
          onClick={() => setSidebarOpen(false)}
          className={cn(
            'flex flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
            nested && !sidebarCollapsed && 'pl-10',
            active
              ? 'bg-indigo-500/20 text-indigo-300 border-l-2 border-indigo-400'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
        >
          <item.icon className={cn('h-5 w-5 shrink-0', active && 'text-indigo-400')} />
          {!sidebarCollapsed && <span className="truncate">{item.name}</span>}
        </NavLink>
        {!sidebarCollapsed && canUseAction && (
          <NavLink
            to={item.actionPath!}
            onClick={(e) => { e.stopPropagation(); setSidebarOpen(false); }}
            className="ml-auto mr-1 p-1 rounded-lg hover:bg-indigo-500/20 text-muted-foreground hover:text-indigo-400 transition-colors"
            title={item.actionLabel || 'Kirim'}
          >
            <Plus className="h-4 w-4" />
          </NavLink>
        )}
      </div>
    );

    if (sidebarCollapsed) {
      return (
        <Tooltip key={item.path} delayDuration={0}>
          <TooltipTrigger asChild>
            <NavLink
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                active
                  ? 'bg-indigo-500/20 text-indigo-300 border-l-2 border-indigo-400'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              <item.icon className={cn('h-5 w-5 shrink-0', active && 'text-indigo-400')} />
            </NavLink>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.name}
          </TooltipContent>
        </Tooltip>
      );
    }

    return linkContent;
  };

  const renderNavGroup = (group: NavGroup) => {
    const expanded = expandedGroups.has(group.name);
    const groupActive = isGroupActive(group);

    if (sidebarCollapsed) {
      return (
        <Tooltip key={group.name} delayDuration={0}>
          <TooltipTrigger asChild>
            <button
              onClick={() => toggleGroup(group.name)}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                groupActive
                  ? 'text-indigo-300'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              <group.icon className={cn('h-5 w-5 shrink-0', groupActive && 'text-indigo-400')} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            <div className="space-y-1">
              <p className="font-semibold">{group.name}</p>
              {group.children.map((child) => (
                <div key={child.path} className="flex items-center gap-2">
                  <NavLink
                    to={child.path}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'flex-1 block px-2 py-1 rounded text-sm transition-colors',
                      isItemActive(child.path)
                        ? 'text-indigo-300'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {child.name}
                  </NavLink>
                  {child.actionPath && (
                    <NavLink
                      to={child.actionPath}
                      onClick={() => setSidebarOpen(false)}
                      className="p-0.5 rounded hover:bg-indigo-500/20 text-muted-foreground hover:text-indigo-400 transition-colors"
                      title={child.actionLabel || 'Kirim'}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </NavLink>
                  )}
                </div>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <div key={group.name}>
        <button
          onClick={() => toggleGroup(group.name)}
          className={cn(
            'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
            groupActive
              ? 'text-indigo-300'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
        >
          <group.icon className={cn('h-5 w-5 shrink-0', groupActive && 'text-indigo-400')} />
          <span className="truncate flex-1 text-left">{group.name}</span>
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 transition-transform duration-200',
              expanded && 'rotate-180',
            )}
          />
        </button>
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="space-y-0.5 mt-0.5">
                {group.children.map((child) => renderNavItem(child, true))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-border/50">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20">
            <span className="text-sm font-bold text-indigo-400">SKP</span>
          </div>
          {!sidebarCollapsed && (
            <span className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent whitespace-nowrap">
              Sardoba Ko'za Plast CRM
            </span>
          )}
        </div>
        {/* Collapse toggle - desktop only */}
        <Button
          variant="ghost"
          size="icon"
          className="hidden lg:flex h-8 w-8 shrink-0"
          onClick={toggleCollapse}
        >
          <ChevronLeft
            className={cn(
              'h-4 w-4 transition-transform',
              sidebarCollapsed && 'rotate-180',
            )}
          />
        </Button>
        {/* Close button - mobile only */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden h-8 w-8"
          onClick={() => setSidebarOpen(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {filteredNavigation.map((entry) =>
          isNavGroup(entry) ? renderNavGroup(entry) : renderNavItem(entry),
        )}
      </nav>

      {/* User & theme footer */}
      <div className="border-t border-border/50 p-2">
        {!sidebarCollapsed ? (
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1.5 py-1.5 text-sm hover:bg-accent transition-colors">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="bg-indigo-500/20 text-indigo-300 text-xs font-medium">
                      {user ? getInitials(user.fullName) : '??'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1 truncate text-left text-sm font-medium text-foreground">
                    {user?.fullName || 'Foydalanuvchi'}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-52" align="start" side="top" forceMount>
                <DropdownMenuLabel className="py-1 text-xs font-normal text-muted-foreground">
                  {user?.role ? (typeof user.role === 'object' ? user.role.name : user.role) : 'Foydalanuvchi'}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={openChangePasswordDialog}>
                  <KeyRound className="mr-2 h-4 w-4" />
                  <span>Parolni o'zgartirish</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-400 focus:text-red-400">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Chiqish</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex items-center gap-0.5 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className={cn('h-7 w-7 rounded-lg', theme === 'light' && 'bg-accent')}
                onClick={() => setTheme('light')}
              >
                <Sun className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn('h-7 w-7 rounded-lg', theme === 'dark' && 'bg-accent')}
                onClick={() => setTheme('dark')}
              >
                <Moon className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn('h-7 w-7 rounded-lg', theme === 'system' && 'bg-accent')}
                onClick={() => setTheme('system')}
              >
                <Monitor className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-indigo-500/20 text-indigo-300 text-xs font-medium">
                      {user ? getInitials(user.fullName) : '??'}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-52" align="start" side="right" forceMount>
                <DropdownMenuLabel className="py-1 text-xs font-normal text-muted-foreground">
                  {user?.fullName || 'Foydalanuvchi'}
                  {user?.role && (
                    <span className="block text-muted-foreground/80">
                      {typeof user.role === 'object' ? user.role.name : user.role}
                    </span>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={openChangePasswordDialog}>
                  <KeyRound className="mr-2 h-4 w-4" />
                  <span>Parolni o'zgartirish</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-400 focus:text-red-400">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Chiqish</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex flex-col items-center gap-1 rounded-xl border border-border/50 bg-muted/50 p-1">
              <Button
                variant="ghost"
                size="icon"
                className={cn('h-7 w-7 rounded-lg', theme === 'light' && 'bg-background shadow-sm')}
                onClick={() => setTheme('light')}
              >
                <Sun className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn('h-7 w-7 rounded-lg', theme === 'dark' && 'bg-background shadow-sm')}
                onClick={() => setTheme('dark')}
              >
                <Moon className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn('h-7 w-7 rounded-lg', theme === 'system' && 'bg-background shadow-sm')}
                onClick={() => setTheme('system')}
              >
                <Monitor className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col border-r border-border/50 bg-card/80 backdrop-blur-2xl transition-all duration-300',
          sidebarCollapsed ? 'lg:w-[72px]' : 'lg:w-64',
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-64 border-r border-border/50 bg-card/95 backdrop-blur-2xl lg:hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Change password dialog */}
      <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{hasPassword ? "Parolni o'zgartirish" : 'Parol o\'rnatish'}</DialogTitle>
            <DialogDescription>
              {hasPassword
                ? 'Joriy parolingizni va yangi parolingizni kiriting.'
                : 'Tizimga login va parol bilan kirish uchun parol o\'rnating.'}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Login: </span>
            <span className="font-medium text-foreground">{user?.username || '—'}</span>
          </div>

          <form
            onSubmit={changePasswordForm.handleSubmit(handleChangePassword)}
            className="space-y-4"
          >
            {hasPassword && (
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Joriy parol</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  {...changePasswordForm.register('currentPassword')}
                />
                {changePasswordForm.formState.errors.currentPassword && (
                  <p className="text-xs text-red-400">
                    {changePasswordForm.formState.errors.currentPassword.message}
                  </p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="newPassword">Yangi parol</Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                {...changePasswordForm.register('newPassword')}
              />
              {changePasswordForm.formState.errors.newPassword && (
                <p className="text-xs text-red-400">
                  {changePasswordForm.formState.errors.newPassword.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Yangi parolni tasdiqlang</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                {...changePasswordForm.register('confirmPassword')}
              />
              {changePasswordForm.formState.errors.confirmPassword && (
                <p className="text-xs text-red-400">
                  {changePasswordForm.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setChangePasswordOpen(false)}
              >
                Bekor qilish
              </Button>
              <Button type="submit" disabled={changePassword.isPending}>
                {changePassword.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
