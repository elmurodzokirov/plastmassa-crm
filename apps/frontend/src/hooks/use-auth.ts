import { useMutation, useQuery } from '@tanstack/react-query';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from '@/components/ui/use-toast';
import type {
  LoginDto,
  SendOtpDto,
  VerifyOtpDto,
  SetupSuperAdminDto,
  ChangePasswordDto,
} from '@plastmassa/shared';

export function useLogin() {
  const login = useAuthStore((s) => s.login);

  return useMutation({
    mutationFn: (data: LoginDto) => authApi.login(data),
    onSuccess: (data) => {
      login(data.accessToken, data.refreshToken, data.user);
    },
  });
}

export function useSendOtp() {
  return useMutation({
    mutationFn: (data: SendOtpDto) => authApi.sendOtp(data),
  });
}

export function useVerifyOtp() {
  const login = useAuthStore((s) => s.login);

  return useMutation({
    mutationFn: (data: VerifyOtpDto) => authApi.verifyOtp(data),
    onSuccess: (data) => {
      login(data.accessToken, data.refreshToken, data.user);
    },
  });
}

export function useSetupStatus() {
  return useQuery({
    queryKey: ['auth', 'setup-status'],
    queryFn: () => authApi.setupStatus(),
    retry: false,
    staleTime: 0,
  });
}

export function useSetupSuperAdmin() {
  const login = useAuthStore((s) => s.login);

  return useMutation({
    mutationFn: (data: SetupSuperAdminDto) => authApi.setup(data),
    onSuccess: (data) => {
      login(data.accessToken, data.refreshToken, data.user);
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: ChangePasswordDto) => authApi.changePassword(data),
    onSuccess: () => {
      toast({
        title: 'Muvaffaqiyatli',
        description: "Parol muvaffaqiyatli o'zgartirildi",
        variant: 'success',
      });
    },
    onError: (err: any) => {
      toast({
        title: 'Xatolik',
        description: err?.response?.data?.message || 'Parolni o\'zgartirishda xatolik yuz berdi',
        variant: 'destructive',
      });
    },
  });
}
