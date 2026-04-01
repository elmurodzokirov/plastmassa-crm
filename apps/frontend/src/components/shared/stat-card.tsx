import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: LucideIcon;
  label?: string;
  title?: string;
  value: string | number;
  description?: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  iconColor?: string;
  iconBg?: string;
  className?: string;
  index?: number;
}

export function StatCard({
  icon: Icon,
  label,
  title,
  value,
  description,
  trend,
  iconColor = 'text-indigo-600 dark:text-indigo-400',
  iconBg,
  className,
  index = 0,
}: StatCardProps) {
  const displayLabel = label || title || '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className={cn(
        'rounded-xl border border-border/80 bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_30px_rgba(15,23,42,0.05)]',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {displayLabel}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground tabular-nums">
            {value}
          </p>
          {description && (
            <div className="mt-2 space-y-0.5 text-xs leading-5 text-muted-foreground">
              {description}
            </div>
          )}
          {trend && (
            <div className="mt-3 flex items-center gap-2">
              <span
                className={cn(
                  'rounded-full px-2 py-1 text-[11px] font-semibold',
                  trend.isPositive
                    ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'
                    : 'bg-red-500/12 text-red-700 dark:text-red-300',
                )}
              >
                {trend.isPositive ? '+' : ''}{trend.value}%
              </span>
              <span className="text-xs text-muted-foreground">
                oldingi davrga nisbatan
              </span>
            </div>
          )}
        </div>
        <div
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-muted/35',
            iconBg,
            iconColor,
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  );
}
