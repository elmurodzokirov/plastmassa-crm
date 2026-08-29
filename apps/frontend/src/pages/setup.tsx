import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, ShieldCheck } from 'lucide-react';
import { useSetupStatus, useSetupSuperAdmin } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

export default function SetupPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useSetupStatus();
  const setupMutation = useSetupSuperAdmin();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && data && !data.needsSetup) {
      navigate('/login', { replace: true });
    }
  }, [isLoading, data, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Parol kamida 6 belgidan iborat bo'lishi kerak");
      return;
    }
    if (password !== confirmPassword) {
      setError('Parollar mos kelmadi');
      return;
    }

    try {
      await setupMutation.mutateAsync({ fullName, username, phone, password });
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Xatolik yuz berdi');
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoadingSpinner size="sm" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(15,23,42,0.08),transparent_30%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.12)_1px,transparent_1px)] [background-size:40px_40px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        <Card className="rounded-2xl border border-border/80 bg-card p-8 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_20px_40px_rgba(15,23,42,0.08)]">
          <div className="mb-8 text-center">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Sardoba Ko'za Plast CRM
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
              Tizimni sozlash
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Bu tizimda hali foydalanuvchi yo'q. Bosh administrator hisobini yarating.
            </p>
          </div>

          <CardContent className="p-0">
            {error && (
              <div className="mb-6 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-red-500">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="fullName">To'liq ism</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ism Familiya"
                  autoFocus
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Foydalanuvchi nomi</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefon raqam</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+998901234567"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Parol</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Kamida 6 belgi"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Parolni tasdiqlang</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Parolni qayta kiriting"
                  required
                />
              </div>

              <Button
                type="submit"
                className="h-10 w-full"
                disabled={
                  !fullName || !username || !phone || !password || !confirmPassword || setupMutation.isPending
                }
              >
                {setupMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="mr-2 h-4 w-4" />
                )}
                Administratorni yaratish
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Bu forma faqat tizimda hech qanday foydalanuvchi bo'lmaganda ko'rinadi.
              </p>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
