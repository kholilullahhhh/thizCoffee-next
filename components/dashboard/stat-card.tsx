import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPercent } from '@/lib/format';

export function StatCard({
  label,
  value,
  hint,
  delta,
  icon,
  emphasis = false,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  delta?: number | null;
  icon?: React.ReactNode;
  emphasis?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border p-5',
        emphasis
          ? 'border-[#FF5A1F] bg-[#FF5A1F] text-white shadow-[0_10px_30px_rgba(255,90,31,0.2)]'
          : 'dashboard-card',
        className
      )}
    >
      {emphasis ? (
        <div className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full border-[18px] border-white/10" />
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <p
          className={cn(
            'text-[10px] font-bold uppercase tracking-[0.16em]',
            emphasis ? 'text-white/75' : 'text-gray-500 dark:text-gray-400'
          )}
        >
          {label}
        </p>
        {icon ? (
          <span
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl',
              emphasis
                ? 'bg-white/15 text-white'
                : 'bg-[#FF5A1F]/10 text-[#FF5A1F] dark:bg-[#FF5A1F]/15'
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <p
        className={cn(
          'mt-4 truncate text-2xl font-extrabold tracking-tight tabular-nums',
          emphasis ? 'text-white' : 'text-[#0A0A0A] dark:text-white'
        )}
      >
        {value}
      </p>
      <div className="mt-2 flex items-center gap-2">
        {delta !== undefined && delta !== null ? (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold',
              delta > 0
                ? emphasis
                  ? 'bg-white/15 text-white'
                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                : delta < 0
                  ? emphasis
                    ? 'bg-black/15 text-white'
                    : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300'
                  : emphasis
                    ? 'bg-white/15 text-white'
                    : 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400'
            )}
          >
            {delta > 0 ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : delta < 0 ? (
              <ArrowDownRight className="h-3 w-3" />
            ) : (
              <Minus className="h-3 w-3" />
            )}
            {formatPercent(delta)}
          </span>
        ) : null}
        {hint ? (
          <span
            className={cn(
              'truncate text-[10px]',
              emphasis ? 'text-white/70' : 'text-gray-400 dark:text-gray-500'
            )}
          >
            {hint}
          </span>
        ) : null}
      </div>
    </div>
  );
}
