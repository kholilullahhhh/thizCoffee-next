const TZ = 'Asia/Makassar';

export function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'bigint') return Number(value);
  const parsed = Number(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatIDR(value: unknown, compact = false): string {
  const amount = toNumber(value);
  if (compact) {
    if (Math.abs(amount) >= 1_000_000_000) {
      return `Rp ${(amount / 1_000_000_000).toLocaleString('id-ID', {
        maximumFractionDigits: 1,
      })} M`;
    }
    if (Math.abs(amount) >= 1_000_000) {
      return `Rp ${(amount / 1_000_000).toLocaleString('id-ID', {
        maximumFractionDigits: 1,
      })} jt`;
    }
    if (Math.abs(amount) >= 1_000) {
      return `Rp ${(amount / 1_000).toLocaleString('id-ID', {
        maximumFractionDigits: 0,
      })} rb`;
    }
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(value: unknown, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits }).format(
    toNumber(value)
  );
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: TZ,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: TZ,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function formatTime(value: Date | string | null | undefined): string {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function formatDateInputInTz(value: Date | string | null | undefined): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function formatPercent(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toLocaleString('id-ID', {
    maximumFractionDigits: 1,
  })}%`;
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function truncate(text: string, max = 40): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
