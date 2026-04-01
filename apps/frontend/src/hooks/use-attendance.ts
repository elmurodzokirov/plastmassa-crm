import { useQueryClient } from '@tanstack/react-query';
import { useMockableQuery, useMockableMutation } from '@/mocks/mock-query';
import { mockData } from '@/mocks/data';
import { attendanceApi, AttendanceQuery, BulkAttendanceData } from '@/api/attendance';

export function useAttendance(params?: AttendanceQuery) {
  return useMockableQuery({
    queryKey: ['attendance', params],
    queryFn: () => attendanceApi.getAll(params),
    mockData: mockData.attendance,
  });
}

export function useAttendanceByDate(date: string) {
  return useMockableQuery({
    queryKey: ['attendance', 'date', date],
    queryFn: () => attendanceApi.getByDate(date),
    enabled: !!date,
    mockData: mockData.attendanceByDate,
  });
}

export function useAttendanceSummary(date: string) {
  return useMockableQuery({
    queryKey: ['attendance', 'summary', date],
    queryFn: () => attendanceApi.getDateSummary(date),
    enabled: !!date,
    mockData: mockData.attendanceSummary,
  });
}

export function useCreateAttendance() {
  const queryClient = useQueryClient();
  return useMockableMutation({
    mutationFn: attendanceApi.create,
    mockResult: {} as any,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}

export function useBulkAttendance() {
  const queryClient = useQueryClient();
  return useMockableMutation({
    mutationFn: (data: BulkAttendanceData) => attendanceApi.bulkCreate(data),
    mockResult: {} as any,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}

export function useAttendanceByUser(userId: string, params?: AttendanceQuery) {
  return useMockableQuery({
    queryKey: ['attendance', 'user', userId, params],
    queryFn: () => attendanceApi.getByUser(userId, params),
    enabled: !!userId,
    mockData: mockData.attendanceByUser,
  });
}

export function useMonthlyReport(userId: string, year: number, month: number) {
  return useMockableQuery({
    queryKey: ['attendance', 'monthly', userId, year, month],
    queryFn: () => attendanceApi.getMonthlyReport(userId, year, month),
    enabled: !!userId && !!year && !!month,
    mockData: mockData.monthlyReport,
  });
}
