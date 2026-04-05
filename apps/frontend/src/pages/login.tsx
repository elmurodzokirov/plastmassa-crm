import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Phone, KeyRound, Loader2, ArrowLeft, ArrowRight, RefreshCw, ShieldCheck } from 'lucide-react';
import { useLogin, useSendOtp, useVerifyOtp } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

type Step = 'phone' | 'otp';

export default function LoginPage() {
  const navigate = useNavigate();
  const sendOtpMutation = useSendOtp();
  const verifyOtpMutation = useVerifyOtp();
  const loginMutation = useLogin();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Admin fallback state
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startTimer = (seconds: number) => {
    setTimer(seconds);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
    if (digits.length <= 7) return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
    return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawDigits = e.target.value.replace(/\D/g, '');
    const digits = rawDigits.startsWith('998') ? rawDigits.slice(3, 12) : rawDigits.slice(0, 9);
    setPhone(digits);
  };

  const handleSendOtp = async () => {
    setError(null);
    const fullPhone = `+998${phone}`;
    try {
      const result = await sendOtpMutation.mutateAsync({ phone: fullPhone });
      startTimer(result.expiresIn || 300);
      setStep('otp');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Xatolik yuz berdi');
    }
  };

  const handleVerifyOtp = async () => {
    setError(null);
    const fullPhone = `+998${phone}`;
    try {
      await verifyOtpMutation.mutateAsync({ phone: fullPhone, code });
      navigate('/');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Noto\'g\'ri kod');
    }
  };

  const handleResend = async () => {
    setError(null);
    setCode('');
    const fullPhone = `+998${phone}`;
    try {
      const result = await sendOtpMutation.mutateAsync({ phone: fullPhone });
      startTimer(result.expiresIn || 300);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Xatolik yuz berdi');
    }
  };

  const handleAdminLogin = async () => {
    setError(null);
    try {
      await loginMutation.mutateAsync({ username, password });
      navigate('/');
    } catch (err: any) {
      setError(err?.response?.data?.message || "Login yoki parol noto'g'ri");
    }
  };

  const formatTimer = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const resetPhoneFlow = () => {
    setStep('phone');
    setError(null);
    setCode('');
  };

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
              SaidBaraka CRM
            </p>
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-2 text-3xl font-semibold tracking-tight text-foreground"
            >
              Tizimga kirish
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-3 text-sm leading-6 text-muted-foreground"
            >
              {showAdminLogin
                ? 'Admin login va parol bilan tizimga kiring'
                : 'Tizimga ulangan telefon raqamingizni kiriting'}
            </motion.p>
          </div>

          <CardContent className="p-0">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-6 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-red-500"
              >
                {error}
              </motion.div>
            )}

            {!showAdminLogin ? (
              <AnimatePresence mode="wait">
                {step === 'phone' ? (
                  <motion.form
                    key="phone"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendOtp();
                    }}
                    className="space-y-6"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefon raqam</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="90 123 45 67"
                          value={phone}
                          onChange={handlePhoneChange}
                          inputMode="numeric"
                          autoComplete="tel-national"
                          className="pl-10"
                          maxLength={9}
                          autoFocus
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="h-10 w-full"
                      disabled={phone.length !== 9 || sendOtpMutation.isPending}
                    >
                      {sendOtpMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowRight className="mr-2 h-4 w-4" />
                      )}
                      Kod yuborish
                    </Button>
                  </motion.form>
                ) : (
                  <motion.form
                    key="otp"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleVerifyOtp();
                    }}
                    className="space-y-6"
                  >
                    <button
                      type="button"
                      onClick={resetPhoneFlow}
                      className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      {formatPhone(phone)}
                    </button>

                    <div className="space-y-2">
                      <Label htmlFor="code">Tasdiqlash kodi</Label>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="code"
                          value={code}
                          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="123456"
                          className="pl-10 text-center text-lg tracking-widest"
                          maxLength={6}
                          autoFocus
                        />
                      </div>
                      <div className="space-y-2 text-xs text-muted-foreground">
                        <p>{formatPhone(phone)} raqamiga Telegram orqali yuborildi</p>
                        <div className="flex items-center justify-between gap-3">
                          <span>Kodni kiriting va tizimga kiring</span>
                          {timer > 0 ? (
                            <span>{formatTimer(timer)}</span>
                          ) : (
                            <button
                              type="button"
                              onClick={handleResend}
                              disabled={sendOtpMutation.isPending}
                              className="flex items-center gap-1 text-primary transition-colors hover:text-primary/80"
                            >
                              <RefreshCw className="h-3 w-3" />
                              Qayta yuborish
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="h-10 w-full"
                      disabled={code.length !== 6 || verifyOtpMutation.isPending}
                    >
                      {verifyOtpMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <ShieldCheck className="mr-2 h-4 w-4" />
                      )}
                      Tasdiqlash
                    </Button>
                  </motion.form>
                )}
              </AnimatePresence>
            ) : (
              <motion.form
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAdminLogin();
                }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <Label htmlFor="username">Foydalanuvchi nomi</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="username"
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Parol</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Parolni kiriting"
                  />
                </div>

                <Button
                  type="submit"
                  className="h-10 w-full"
                  disabled={!username || !password || loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="mr-2 h-4 w-4" />
                  )}
                  Kirish
                </Button>
              </motion.form>
            )}

            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setShowAdminLogin((prev) => !prev);
                  setError(null);
                }}
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {showAdminLogin ? 'Telefon orqali kirish' : 'Login/Parol bilan kirish'}
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
