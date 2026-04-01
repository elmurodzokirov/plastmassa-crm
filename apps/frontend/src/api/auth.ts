import client from './client';
import type { LoginDto, AuthResponse, SendOtpDto, VerifyOtpDto } from '@plastmassa/shared';

export const authApi = {
  login: (data: LoginDto) => client.post<AuthResponse>('/auth/login', data).then((r) => r.data),
  sendOtp: (data: SendOtpDto) => client.post<{ message: string; expiresIn: number }>('/auth/send-otp', data).then((r) => r.data),
  verifyOtp: (data: VerifyOtpDto) => client.post<AuthResponse>('/auth/verify-otp', data).then((r) => r.data),
  refresh: (refreshToken: string) => client.post<AuthResponse>('/auth/refresh', { refreshToken }).then((r) => r.data),
  me: () => client.get('/auth/me').then((r) => r.data),
};
