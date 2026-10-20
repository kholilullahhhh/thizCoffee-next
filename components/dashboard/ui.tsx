import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'dark';
type ButtonSize = 'sm' | 'md' | 'icon';

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-[#FF5A1F] text-white hover:bg-[#E04A10] focus-visible:ring-[#FF5A1F]/40',
  secondary:
    'bg-[#0A0A0A] text-white hover:bg-black focus-visible:ring-black/30 dark:bg-white dark:text-black dark:hover:bg-gray-200',
  ghost:
    'bg-transparent text-gray-600 hover:bg-black/[0.05] hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/[0.07] dark:hover:text-white',
  danger:
    'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500/40',
  outline:
    'border border-black/10 bg-white text-gray-700 hover:border-black/20 hover:bg-gray-50 dark:border-white/15 dark:bg-transparent dark:text-gray-200 dark:hover:bg-white/[0.06]',
  dark: 'bg-[#0A0A0A] text-white hover:bg-[#222] dark:bg-white dark:text-black dark:hover:bg-gray-200',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  icon: 'h-9 w-9',
};

export function buttonClass(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string
) {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-55',
    variants[variant],
    sizes[size],
    className
  );
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  children,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}) {
  return (
    <button
      className={buttonClass(variant, size, className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
}

export function Panel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn('dashboard-card', className)}>{children}</div>;
}

export function SectionTitle({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-2xl leading-none text-[#0A0A0A] dark:text-white">
          {title}
        </h2>
        {description ? (
          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

const badgeTones = {
  neutral: 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300',
  orange: 'bg-[#FF5A1F]/10 text-[#D8430C] dark:bg-[#FF5A1F]/15 dark:text-[#FF9B78]',
  green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  blue: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300',
  yellow: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  red: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300',
  purple: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300',
} as const;

export type BadgeTone = keyof typeof badgeTones;

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em]',
        badgeTones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('px-6 py-14 text-center', className)}>
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FF5A1F]/10 text-[#FF5A1F]">
        {icon}
      </div>
      <p className="mt-4 text-sm font-semibold text-gray-800 dark:text-gray-100">{title}</p>
      {description ? (
        <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-gray-500 dark:text-gray-400">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = 'Data gagal dimuat',
  description,
}: {
  title?: string;
  description?: string;
}) {
  return (
    <Panel className="border-red-200 p-6 dark:border-red-500/25">
      <p className="text-sm font-bold text-red-700 dark:text-red-300">{title}</p>
      <p className="mt-1 text-xs text-red-600/80 dark:text-red-300/70">
        {description || 'Terjadi kesalahan saat mengambil data. Muat ulang halaman atau coba lagi.'}
      </p>
    </Panel>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  buildHref,
}: {
  page: number;
  pageSize: number;
  total: number;
  buildHref: (page: number) => string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.06] px-4 py-3.5 dark:border-white/[0.06]">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Menampilkan <span className="font-semibold text-gray-700 dark:text-gray-200">{from}</span>
        {'–'}
        <span className="font-semibold text-gray-700 dark:text-gray-200">{to}</span> dari{' '}
        <span className="font-semibold text-gray-700 dark:text-gray-200">{total}</span>
      </p>
      <div className="flex items-center gap-1.5">
        <a
          href={buildHref(Math.max(1, page - 1))}
          aria-disabled={page <= 1}
          className={cn(
            buttonClass('outline', 'sm'),
            page <= 1 && 'pointer-events-none opacity-40'
          )}
        >
          Sebelumnya
        </a>
        <span className="px-2 text-xs tabular-nums text-gray-500 dark:text-gray-400">
          {page} / {totalPages}
        </span>
        <a
          href={buildHref(Math.min(totalPages, page + 1))}
          aria-disabled={page >= totalPages}
          className={cn(
            buttonClass('outline', 'sm'),
            page >= totalPages && 'pointer-events-none opacity-40'
          )}
        >
          Berikutnya
        </a>
      </div>
    </div>
  );
}

export function ProgressBar({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return (
    <div className={cn('h-1.5 overflow-hidden rounded-full bg-black/[0.07] dark:bg-white/10', className)}>
      <div
        className="h-full rounded-full bg-[#FF5A1F] transition-all"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export const statusMeta: Record<
  string,
  { label: string; tone: BadgeTone }
> = {
  NEW: { label: 'Baru', tone: 'blue' },
  PROCESSING: { label: 'Diproses', tone: 'yellow' },
  READY: { label: 'Siap', tone: 'purple' },
  COMPLETED: { label: 'Selesai', tone: 'green' },
  CANCELLED: { label: 'Dibatalkan', tone: 'red' },
  UNPAID: { label: 'Belum bayar', tone: 'red' },
  PARTIAL: { label: 'Sebagian', tone: 'yellow' },
  PAID: { label: 'Lunas', tone: 'green' },
  REFUNDED: { label: 'Refund', tone: 'purple' },
  INCOME: { label: 'Masuk', tone: 'green' },
  EXPENSE: { label: 'Keluar', tone: 'red' },
};
