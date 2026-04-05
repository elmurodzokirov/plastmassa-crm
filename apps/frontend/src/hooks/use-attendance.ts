import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { attendanceApi, AttendanceQuery, BulkAttendanceData } from '@/api/attendance';

export function useAttendance(params?: AttendanceQuery) {
  return useQuery({
    queryKey: ['attendance', params],
    queryFn: () => attendanceApi.getAll(params),
  });
}

export function useAttendanceByDate(date: string) {
  return useQuery({
    queryKey: ['attendance', 'date', date],
    queryFn: () => attendanceApi.getByDate(date),
    enabled: !!date,
  });
}

export function useAttendanceSummary(date: string) {
  return useQuery({
    queryKey: ['attendance', 'summary', date],
    queryFn: () => attendanceApi.getDateSummary(date),
    enabled: !!date,
  });
}

export function useCreateAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: attendanceApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}

export function useBulkAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: BulkAttendanceData) => attendanceApi.bulkCreate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}

export function useAttendanceByUser(userId: string, params?: AttendanceQuery) {
  return useQuery({
    queryKey: ['attendance', 'user', userId, params],
    queryFn: () => attendanceApi.getByUser(userId, params),
    enabled: !!userId,
  });
}

export function useMonthlyReport(userId: string, year: number, month: number) {
  return useQuery({
    queryKey: ['attendance', 'monthly', userId, year, month],
    queryFn: () => attendanceApi.getMonthlyReport(userId, year, month),
    enabled: !!userId && !!year && !!month,
  });
}
