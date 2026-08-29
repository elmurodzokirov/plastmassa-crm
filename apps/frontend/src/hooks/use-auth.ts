import { useMutation, useQuery } from '@tanstack/react-query';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/stores/auth.store';
import type { LoginDto, SendOtpDto, VerifyOtpDto, SetupSuperAdminDto } from '@plastmassa/shared';

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
