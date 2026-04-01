import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/stores/auth.store';
import type { LoginDto, SendOtpDto, VerifyOtpDto } from '@plastmassa/shared';

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
