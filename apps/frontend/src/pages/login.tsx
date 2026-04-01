import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Phone, KeyRound, Loader2, ArrowLeft, RefreshCw } from 'lucide-react';
import { useLogin, useSendOtp, useVerifyOtp } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

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
    const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
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

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      {/* Decorative background blurs */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute top-1/2 -left-40 h-96 w-96 rounded-full bg-purple-500/15 blur-3xl" />
        <div className="absolute -bottom-40 right-1/4 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-border/50 bg-card/80 backdrop-blur-2xl shadow-2xl">
          <CardHeader className="space-y-4 text-center pb-2">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/20"
            >
              <span className="text-2xl font-bold text-indigo-400">SB</span>
            </motion.div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                SaidBaraka CRM
              </h1>
              <p className="mt-2 text-muted-foreground">Tizimga kirish</p>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-4 rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-red-400"
              >
                {error}
              </motion.div>
            )}

            {!showAdminLogin ? (
              <>
                {step === 'phone' ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefon raqam</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <div className="absolute left-10 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                          +998
                        </div>
                        <Input
                          id="phone"
                          value={formatPhone(phone)}
                          onChange={handlePhoneChange}
                          placeholder="90 123 45 67"
                          className="pl-[4.5rem]"
                          maxLength={12}
                        />
                      </div>
                    </div>

                    <Button
                      className="w-full h-11 text-base font-semibold"
                      onClick={handleSendOtp}
                      disabled={phone.length !== 9 || sendOtpMutation.isPending}
                    >
                      {sendOtpMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Yuborilmoqda...
                        </>
                      ) : (
                        'Kod yuborish'
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <button
                      onClick={() => { setStep('phone'); setError(null); setCode(''); }}
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      +998 {formatPhone(phone)}
                    </button>

                    <div className="space-y-2">
                      <Label htmlFor="code">Tasdiqlash kodi</Label>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="code"
                          value={code}
                          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="000000"
                          className="pl-10 text-center text-lg tracking-[0.5em] font-mono"
                          maxLength={6}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Telegram orqali yuborildi</span>
                        {timer > 0 ? (
                          <span>{formatTimer(timer)}</span>
                        ) : (
                          <button
                            onClick={handleResend}
                            disabled={sendOtpMutation.isPending}
                            className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors"
                          >
                            <RefreshCw className="h-3 w-3" />
                            Qayta yuborish
                          </button>
                        )}
                      </div>
                    </div>

                    <Button
                      className="w-full h-11 text-base font-semibold"
                      onClick={handleVerifyOtp}
                      disabled={code.length !== 6 || verifyOtpMutation.isPending}
                    >
                      {verifyOtpMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Tekshirilmoqda...
                        </>
                      ) : (
                        'Tasdiqlash'
                      )}
                    </Button>
                  </div>
                )}

                <div className="mt-4 text-center">
                  <button
                    onClick={() => { setShowAdminLogin(true); setError(null); }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Login/Parol bilan kirish
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Foydalanuvchi nomi</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="username"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Parol</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="********"
                  />
                </div>

                <Button
                  className="w-full h-11 text-base font-semibold"
                  onClick={handleAdminLogin}
                  disabled={!username || !password || loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Kirish...
                    </>
                  ) : (
                    'Kirish'
                  )}
                </Button>

                <div className="text-center">
                  <button
                    onClick={() => { setShowAdminLogin(false); setError(null); }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Telefon orqali kirish
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
