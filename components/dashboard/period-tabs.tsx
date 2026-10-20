import Link from 'next/link';
import { cn } from '@/lib/utils';
import { buttonClass } from '@/components/dashboard/ui';

const options = [
  { key: 'today', label: 'Hari ini' },
  { key: '7d', label: '7 hari' },
  { key: '30d', label: '30 hari' },
  { key: '90d', label: '90 hari' },
  { key: 'month', label: 'Bulan ini' },
];

export function PeriodTabs({
  basePath,
  period,
  from,
  to,
  extra = {},
}: {
  basePath: string;
  period: string;
  from?: string;
  to?: string;
  extra?: Record<string, string | undefined>;
}) {
  const build = (key: string) => {
    const params = new URLSearchParams();
    if (key === 'custom') {
      params.set('period', 'custom');
      if (from) params.set('from', from);
      if (to) params.set('to', to);
    } else {
      params.set('period', key);
    }
    Object.entries(extra).forEach(([param, value]) => {
      if (value) params.set(param, value);
    });
    return `${basePath}?${params.toString()}`;
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 print-hidden">
      {options.map((option) => (
        <Link
          key={option.key}
          href={build(option.key)}
          className={cn(
            'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
            period === option.key
              ? 'bg-[#0A0A0A] text-white dark:bg-white dark:text-black'
              : 'text-gray-500 hover:bg-black/[0.05] hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.07] dark:hover:text-white'
          )}
        >
          {option.label}
        </Link>
      ))}
      <span className="mx-1 hidden h-4 w-px bg-black/10 sm:block dark:bg-white/10" />
      <details className="relative">
        <summary
          className={cn(
            buttonClass('ghost', 'sm'),
            'cursor-pointer list-none',
            period === 'custom' && 'bg-[#0A0A0A] text-white dark:bg-white dark:text-black'
          )}
        >
          Kustom
        </summary>
        <form
          action={basePath}
          className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-black/10 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-[#181818]"
        >
          <input type="hidden" name="period" value="custom" />
          {Object.entries(extra).map(([param, value]) =>
            value ? <input key={param} type="hidden" name={param} value={value} /> : null
          )}
          <label className="dashboard-label" htmlFor="period-from">
            Dari
          </label>
          <input
            id="period-from"
            type="date"
            name="from"
            defaultValue={from}
            className="dashboard-input mb-3"
            required
          />
          <label className="dashboard-label" htmlFor="period-to">
            Sampai
          </label>
          <input
            id="period-to"
            type="date"
            name="to"
            defaultValue={to}
            className="dashboard-input mb-3"
            required
          />
          <button type="submit" className={buttonClass('primary', 'sm', 'w-full')}>
            Terapkan
          </button>
        </form>
      </details>
    </div>
  );
}
