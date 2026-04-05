import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';

interface AccessDeniedState {
  from?: string;
  requiredPermission?: string;
}

export default function AccessDeniedPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const state = (location.state as AccessDeniedState | null) || null;

  const roleName =
    user?.role && typeof user.role === 'object' ? user.role.name : "Noma'lum rol";

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-2xl rounded-3xl border border-border/60 bg-card/70 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur xl:p-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
          <ShieldAlert className="h-7 w-7" />
        </div>

        <div className="mt-5 space-y-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Bu bo&apos;limga ruxsat yo&apos;q
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Foydalanuvchini bosh sahifaga tashlab yubormasdan, aynan nima yetishmayotganini ko&apos;rsatdik.
            </p>
          </div>

          <div className="grid gap-3 rounded-2xl border border-border/60 bg-background/70 p-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Sizning rolingiz
              </p>
              <p className="mt-1 font-medium text-foreground">{roleName}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Kerakli ruxsat
              </p>
              <p className="mt-1 font-mono text-foreground">
                {state?.requiredPermission || 'Aniqlanmadi'}
              </p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                So&apos;nggi uringan sahifa
              </p>
              <p className="mt-1 break-all text-foreground">
                {state?.from || '/'}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button onClick={() => navigate('/')} className="gap-2">
            <Home className="h-4 w-4" />
            Bosh sahifaga qaytish
          </Button>
          <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Orqaga qaytish
          </Button>
        </div>
      </div>
    </div>
  );
}
