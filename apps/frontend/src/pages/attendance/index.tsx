import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { format, getDaysInMonth, isToday as checkIsToday, isSunday } from 'date-fns';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Users,
  UserCheck,
  UserX,
  Clock,
  UserMinus,
  Save,
  CheckCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAttendance, useBulkAttendance } from '@/hooks/use-attendance';
import { useUsers } from '@/hooks/use-users';
import { toast } from '@/components/ui/use-toast';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatCard } from '@/components/shared/stat-card';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'LEAVE';

const STATUS_SHORT: Record<AttendanceStatus, string> = {
  PRESENT: 'K',
  ABSENT: 'Y',
  LATE: 'C',
  HALF_DAY: '½',
  LEAVE: 'T',
};

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  PRESENT: 'bg-green-500/20 text-green-300 border-green-500/40',
  ABSENT: 'bg-red-500/20 text-red-300 border-red-500/40',
  LATE: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  HALF_DAY: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  LEAVE: 'bg-gray-500/20 text-gray-400 border-gray-500/40',
};

const STATUS_CYCLE: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'LEAVE'];

const STATUS_HOURS: Record<AttendanceStatus, number> = {
  PRESENT: 8,
  ABSENT: 0,
  LATE: 7,
  HALF_DAY: 4,
  LEAVE: 0,
};

const MONTH_NAMES = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr',
];

const WEEKDAY_SHORT = ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'];

// Cell data: userId -> day -> status
type CellMap = Record<string, Record<number, { status: AttendanceStatus; hoursWorked: number; overtimeHours: number }>>;

export default function AttendancePage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [cells, setCells] = useState<CellMap>({});
  const [dirty, setDirty] = useState(false);
  const [savingDay, setSavingDay] = useState<number | null>(null);
  const [confirmCell, setConfirmCell] = useState<{ userId: string; day: number; fullName: string } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const daysInMonth = getDaysInMonth(new Date(year, month - 1));
  const dateFrom = `${year}-${String(month).padStart(2, '0')}-01`;
  const dateTo = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

  const { data: usersData, isLoading: usersLoading } = useUsers({ limit: 9999, isActive: true });
  const { data: attendanceData, isLoading: attendanceLoading } = useAttendance({
    dateFrom,
    dateTo,
    limit: 99999,
  });
  const bulkMutation = useBulkAttendance();

  const users = useMemo(
    () => (usersData?.items || []).filter((u: any) => u.showInAttendance !== false),
    [usersData],
  );
  const records = attendanceData?.items || [];

  // Build cell map from records
  useEffect(() => {
    if (usersLoading || attendanceLoading) return;

    const map: CellMap = {};

    // Init all users with empty days
    for (const user of users) {
      map[user._id] = {};
    }

    // Fill from existing records
    for (const record of records) {
      const userId = typeof record.user === 'string' ? record.user : record.user?._id;
      if (!userId || !map[userId]) continue;
      const day = new Date(record.date).getDate();
      map[userId][day] = {
        status: record.status as AttendanceStatus,
        hoursWorked: record.hoursWorked,
        overtimeHours: record.overtimeHours,
      };
    }

    setCells(map);
    setDirty(false);
  }, [users, records, usersLoading, attendanceLoading, year, month]);

  // Get weekday for a day of month
  const getWeekday = useCallback(
    (day: number) => {
      const date = new Date(year, month - 1, day);
      return date.getDay(); // 0=Sunday
    },
    [year, month],
  );

  // Toggle cell status on click (cycles through statuses, then back to the initial/unmarked state)
  const toggleCell = useCallback((userId: string, day: number) => {
    setCells((prev) => {
      const userCells = { ...prev[userId] };
      const current = userCells[day];

      if (current && STATUS_CYCLE.indexOf(current.status) === STATUS_CYCLE.length - 1) {
        // Last status in the cycle -> clear the cell back to the initial (unmarked) state
        delete userCells[day];
      } else {
        const nextStatus = current
          ? STATUS_CYCLE[STATUS_CYCLE.indexOf(current.status) + 1]
          : 'PRESENT';

        userCells[day] = {
          status: nextStatus,
          hoursWorked: STATUS_HOURS[nextStatus],
          overtimeHours: current?.overtimeHours || 0,
        };
      }

      return { ...prev, [userId]: userCells };
    });
    setDirty(true);
  }, []);

  // Kun turi: bugungi / o'tgan / kelajakdagi
  const isFutureDay = useCallback(
    (day: number) => {
      const cellDate = new Date(year, month - 1, day);
      cellDate.setHours(0, 0, 0, 0);
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      return cellDate.getTime() > todayStart.getTime();
    },
    [year, month],
  );

  const isPastDay = useCallback(
    (day: number) => {
      const cellDate = new Date(year, month - 1, day);
      cellDate.setHours(0, 0, 0, 0);
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      return cellDate.getTime() < todayStart.getTime();
    },
    [year, month],
  );

  // Yacheyka bosilganda: bugungi kun — darhol o'zgaradi, o'tgan kun — tasdiqlash so'raladi,
  // kelajakdagi kun — o'zgartirib bo'lmaydi
  const handleCellClick = useCallback(
    (userId: string, day: number, fullName: string) => {
      if (isFutureDay(day)) return;
      if (isPastDay(day)) {
        setConfirmCell({ userId, day, fullName });
        return;
      }
      toggleCell(userId, day);
    },
    [isFutureDay, isPastDay, toggleCell],
  );

  const confirmPastEdit = useCallback(() => {
    if (confirmCell) {
      toggleCell(confirmCell.userId, confirmCell.day);
    }
    setConfirmCell(null);
  }, [confirmCell, toggleCell]);

  // Set all users for a specific day
  const markDayAllPresent = useCallback((day: number) => {
    setCells((prev) => {
      const next = { ...prev };
      for (const userId of Object.keys(next)) {
        next[userId] = {
          ...next[userId],
          [day]: { status: 'PRESENT', hoursWorked: 8, overtimeHours: 0 },
        };
      }
      return next;
    });
    setDirty(true);
  }, []);

  // Save a specific day
  const saveDay = useCallback(
    async (day: number) => {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayRecords = users
        .filter((u) => cells[u._id]?.[day])
        .map((u) => {
          const cell = cells[u._id][day];
          return {
            user: u._id,
            status: cell.status,
            hoursWorked: cell.hoursWorked,
            overtimeHours: cell.overtimeHours,
          };
        });

      if (dayRecords.length === 0) return;

      setSavingDay(day);
      try {
        await bulkMutation.mutateAsync({ date: dateStr, records: dayRecords });
        toast({ title: `${day}-kun saqlandi`, variant: 'success' });
      } catch {
        toast({ title: 'Xatolik', variant: 'destructive' });
      }
      setSavingDay(null);
    },
    [year, month, users, cells, bulkMutation],
  );

  // Save entire month (day by day for days that have data)
  const saveAll = useCallback(async () => {
    const daysWithData = new Set<number>();
    for (const userId of Object.keys(cells)) {
      for (const day of Object.keys(cells[userId])) {
        daysWithData.add(Number(day));
      }
    }

    setSavingDay(-1);
    try {
      for (const day of Array.from(daysWithData).sort((a, b) => a - b)) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayRecords = users
          .filter((u) => cells[u._id]?.[day])
          .map((u) => {
            const cell = cells[u._id][day];
            return {
              user: u._id,
              status: cell.status,
              hoursWorked: cell.hoursWorked,
              overtimeHours: cell.overtimeHours,
            };
          });

        if (dayRecords.length > 0) {
          await bulkMutation.mutateAsync({ date: dateStr, records: dayRecords });
        }
      }
      toast({ title: 'Barcha davomat saqlandi', variant: 'success' });
      setDirty(false);
    } catch {
      toast({ title: 'Xatolik yuz berdi', variant: 'destructive' });
    }
    setSavingDay(null);
  }, [year, month, users, cells, bulkMutation]);

  // Summary for entire month
  const summary = useMemo(() => {
    let present = 0, absent = 0, late = 0, halfDay = 0, leave = 0;
    for (const userId of Object.keys(cells)) {
      for (const day of Object.keys(cells[userId])) {
        const s = cells[userId][Number(day)]?.status;
        if (s === 'PRESENT') present++;
        else if (s === 'ABSENT') absent++;
        else if (s === 'LATE') late++;
        else if (s === 'HALF_DAY') halfDay++;
        else if (s === 'LEAVE') leave++;
      }
    }
    return { present, absent, late, halfDay, leave, total: present + absent + late + halfDay + leave };
  }, [cells]);

  // Per-user summary
  const getUserSummary = useCallback(
    (userId: string) => {
      const userCells = cells[userId] || {};
      let p = 0, a = 0, l = 0, h = 0;
      for (const day of Object.keys(userCells)) {
        const s = userCells[Number(day)]?.status;
        if (s === 'PRESENT') p++;
        else if (s === 'ABSENT') a++;
        else if (s === 'LATE') l++;
        else if (s === 'HALF_DAY') h++;
      }
      return { present: p, absent: a, late: l, halfDay: h, total: p + a + l + h };
    },
    [cells],
  );

  const isLoading = usersLoading || attendanceLoading;

  // Scroll to today's column
  useEffect(() => {
    if (!isLoading && gridRef.current && year === now.getFullYear() && month === now.getMonth() + 1) {
      const todayCol = gridRef.current.querySelector('[data-today="true"]');
      if (todayCol) {
        todayCol.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [isLoading, year, month]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
      >
        <h1 className="text-2xl font-bold text-foreground">Davomat</h1>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Year selector */}
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-[100px] h-9 rounded-xl text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[year - 1, year, year + 1].map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Month navigation */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-xl"
              onClick={() => {
                if (month === 1) { setMonth(12); setYear(year - 1); }
                else setMonth(month - 1);
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="w-[130px] h-9 rounded-xl text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTH_NAMES.map((name, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-xl"
              onClick={() => {
                if (month === 12) { setMonth(1); setYear(year + 1); }
                else setMonth(month + 1);
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Actions */}
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl gap-1.5 h-9"
            onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth() + 1); }}
          >
            Joriy oy
          </Button>

          {dirty && (
            <Button
              size="sm"
              className="rounded-xl gap-1.5 h-9"
              onClick={saveAll}
              disabled={savingDay !== null}
            >
              {savingDay !== null ? (
                <LoadingSpinner size="sm" className="h-3.5 w-3.5" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Saqlash
            </Button>
          )}
        </div>
      </motion.div>

      {/* Summary Cards */}
      {!isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard title="Kelgan" value={summary.present} icon={UserCheck} iconColor="text-green-400" iconBg="bg-green-500/20" index={0} />
          <StatCard title="Kelmagan" value={summary.absent} icon={UserX} iconColor="text-red-400" iconBg="bg-red-500/20" index={1} />
          <StatCard title="Kechikkan" value={summary.late} icon={Clock} iconColor="text-yellow-400" iconBg="bg-yellow-500/20" index={2} />
          <StatCard title="Yarim kun" value={summary.halfDay} icon={UserMinus} iconColor="text-blue-400" iconBg="bg-blue-500/20" index={3} />
          <StatCard title="Jami" value={summary.total} icon={Users} iconColor="text-indigo-400" iconBg="bg-indigo-500/20" index={4} />
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users className="h-10 w-10 text-muted-foreground mb-3" />
          <h3 className="text-lg font-semibold">Xodimlar topilmadi</h3>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-xl overflow-hidden"
        >
          <div ref={gridRef} className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                {/* Day numbers row */}
                <tr className="border-b border-border/50">
                  <th className="sticky left-0 z-20 bg-card/95 backdrop-blur-xl px-3 py-2 text-left font-semibold text-foreground min-w-[160px] border-r border-border/30">
                    Xodim
                  </th>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                    const wd = getWeekday(day);
                    const isSun = wd === 0;
                    const today = checkIsToday(new Date(year, month - 1, day));
                    return (
                      <th
                        key={day}
                        data-today={today || undefined}
                        className={cn(
                          'px-0 py-1.5 text-center font-semibold min-w-[36px] w-[36px] border-r border-border/20',
                          isSun ? 'text-red-400' : 'text-foreground',
                          today && 'bg-indigo-500/10',
                        )}
                      >
                        <div className="leading-tight">{day}</div>
                        <div className={cn('text-[10px] font-normal', isSun ? 'text-red-400/60' : 'text-muted-foreground')}>
                          {WEEKDAY_SHORT[wd]}
                        </div>
                      </th>
                    );
                  })}
                  {/* Summary columns */}
                  <th className="px-2 py-1.5 text-center font-semibold min-w-[36px] text-green-400 border-l border-border/50">K</th>
                  <th className="px-2 py-1.5 text-center font-semibold min-w-[36px] text-red-400">Y</th>
                  <th className="px-2 py-1.5 text-center font-semibold min-w-[36px] text-yellow-400">C</th>
                </tr>
              </thead>

              <tbody>
                {users.map((user, userIdx) => {
                  const roleName = typeof user.role === 'object' ? user.role?.name : user.role;
                  const userSummary = getUserSummary(user._id);

                  return (
                    <tr
                      key={user._id}
                      className={cn(
                        'border-b border-border/20 hover:bg-muted/10',
                        userIdx % 2 === 0 ? 'bg-transparent' : 'bg-muted/5',
                      )}
                    >
                      {/* Employee name (sticky) */}
                      <td className="sticky left-0 z-10 bg-card/95 backdrop-blur-xl px-3 py-1.5 border-r border-border/30">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate text-xs">{user.fullName}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{roleName}</p>
                        </div>
                      </td>

                      {/* Day cells */}
                      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                        const cell = cells[user._id]?.[day];
                        const status = cell?.status;
                        const wd = getWeekday(day);
                        const isSun = wd === 0;
                        const today = checkIsToday(new Date(year, month - 1, day));

                        return (
                          <td
                            key={day}
                            className={cn(
                              'px-0 py-0 text-center border-r border-border/10',
                              today && 'bg-indigo-500/5',
                              isSun && !status && 'bg-red-500/5',
                            )}
                          >
                            <button
                              onClick={() => handleCellClick(user._id, day, user.fullName)}
                              disabled={isFutureDay(day)}
                              className={cn(
                                'w-full h-[32px] flex items-center justify-center text-[11px] font-bold transition-all duration-100',
                                status
                                  ? STATUS_COLORS[status]
                                  : 'text-muted-foreground/30 hover:bg-muted/20',
                                isFutureDay(day) && 'opacity-30 cursor-not-allowed hover:bg-transparent',
                              )}
                              title={
                                isFutureDay(day)
                                  ? "Kelajakdagi kunni belgilab bo'lmaydi"
                                  : isPastDay(day)
                                    ? "O'tgan kun — o'zgartirish tasdiqlashni talab qiladi"
                                    : status
                                      ? `${STATUS_SHORT[status]} — bosib o'zgartiring`
                                      : 'Bosib belgilang'
                              }
                            >
                              {status ? STATUS_SHORT[status] : isSun ? '—' : '·'}
                            </button>
                          </td>
                        );
                      })}

                      {/* Summary cells */}
                      <td className="px-2 py-1.5 text-center font-semibold text-green-400 border-l border-border/50">
                        {userSummary.present || ''}
                      </td>
                      <td className="px-2 py-1.5 text-center font-semibold text-red-400">
                        {userSummary.absent || ''}
                      </td>
                      <td className="px-2 py-1.5 text-center font-semibold text-yellow-400">
                        {userSummary.late || ''}
                      </td>
                    </tr>
                  );
                })}

                {/* Day totals row */}
                <tr className="border-t-2 border-border/50 bg-muted/10">
                  <td className="sticky left-0 z-10 bg-card/95 backdrop-blur-xl px-3 py-2 font-semibold text-foreground text-xs border-r border-border/30">
                    Jami kelgan
                  </td>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                    let count = 0;
                    for (const userId of Object.keys(cells)) {
                      const s = cells[userId]?.[day]?.status;
                      if (s === 'PRESENT' || s === 'LATE' || s === 'HALF_DAY') count++;
                    }
                    const today = checkIsToday(new Date(year, month - 1, day));
                    return (
                      <td
                        key={day}
                        className={cn(
                          'px-0 py-2 text-center text-[11px] font-semibold border-r border-border/10',
                          today && 'bg-indigo-500/5',
                          count > 0 ? 'text-foreground' : 'text-muted-foreground/30',
                        )}
                      >
                        {count || ''}
                      </td>
                    );
                  })}
                  <td className="px-2 py-2 text-center font-bold text-green-400 border-l border-border/50">
                    {summary.present}
                  </td>
                  <td className="px-2 py-2 text-center font-bold text-red-400">
                    {summary.absent}
                  </td>
                  <td className="px-2 py-2 text-center font-bold text-yellow-400">
                    {summary.late}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 px-4 py-3 border-t border-border/30 text-xs text-muted-foreground">
            <span className="font-medium text-foreground/70">Belgilar:</span>
            {STATUS_CYCLE.map((s) => (
              <div key={s} className="flex items-center gap-1.5">
                <span className={cn('inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold', STATUS_COLORS[s])}>
                  {STATUS_SHORT[s]}
                </span>
                <span>
                  {s === 'PRESENT' ? 'Keldi' : s === 'ABSENT' ? 'Kelmadi' : s === 'LATE' ? 'Kechikdi' : s === 'HALF_DAY' ? 'Yarim kun' : "Ta'til"}
                </span>
              </div>
            ))}
            <span className="ml-auto text-[10px]">Yacheykani bosib statusni o'zgartiring</span>
          </div>
        </motion.div>
      )}

      {/* O'tgan kunni o'zgartirishni tasdiqlash oynasi */}
      <Dialog open={!!confirmCell} onOpenChange={(open) => { if (!open) setConfirmCell(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>O'tgan kunni o'zgartirish</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{confirmCell?.fullName}</span> uchun{' '}
            <span className="font-medium text-foreground">{confirmCell?.day}-{MONTH_NAMES[month - 1]}</span>{' '}
            kunidagi davomatni o'zgartirmoqchimisiz?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmCell(null)} className="rounded-xl">
              Bekor qilish
            </Button>
            <Button onClick={confirmPastEdit} className="rounded-xl">
              Tasdiqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
