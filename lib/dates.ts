export const BUSINESS_TIMEZONE = 'Asia/Makassar';
export const BUSINESS_OFFSET = '+08:00';

export type PeriodKey = 'today' | '7d' | '30d' | '90d' | 'month' | 'custom';

export interface DateRange {
  from: string;
  to: string;
  previousFrom: string;
  previousTo: string;
  days: number;
}

export function makassarToday(): string {
  return formatDateInTimeZone(new Date());
}

export function formatDateInTimeZone(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function isDateString(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function dateParam(value: unknown, fallback = makassarToday()): string {
  return isDateString(value) ? value : fallback;
}

export function addDays(dateString: string, days: number): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

export function addMonths(dateString: string, months: number): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + months, day));
  return date.toISOString().slice(0, 10);
}

export function startOfBusinessDay(dateString: string): Date {
  return new Date(`${dateString}T00:00:00${BUSINESS_OFFSET}`);
}

export function endOfBusinessDayExclusive(dateString: string): Date {
  return startOfBusinessDay(addDays(dateString, 1));
}

export function businessDayRange(from: string, to: string) {
  return {
    start: startOfBusinessDay(from),
    end: endOfBusinessDayExclusive(to),
  };
}

export function daysBetween(from: string, to: string): number {
  const start = new Date(`${from}T00:00:00Z`).getTime();
  const end = new Date(`${to}T00:00:00Z`).getTime();
  return Math.max(1, Math.round((end - start) / 86_400_000) + 1);
}

export function resolvePeriod(
  periodParam: unknown,
  fromParam?: unknown,
  toParam?: unknown
): { period: PeriodKey; range: DateRange; label: string } {
  const today = makassarToday();
  let period: PeriodKey = 'today';
  if (
    periodParam === '7d' ||
    periodParam === '30d' ||
    periodParam === '90d' ||
    periodParam === 'month' ||
    periodParam === 'custom'
  ) {
    period = periodParam;
  }
  if (periodParam === 'today') period = 'today';

  let from = today;
  let to = today;

  if (period === '7d') {
    from = addDays(today, -6);
  } else if (period === '30d') {
    from = addDays(today, -29);
  } else if (period === '90d') {
    from = addDays(today, -89);
  } else if (period === 'month') {
    from = `${today.slice(0, 8)}01`;
  } else if (period === 'custom') {
    from = dateParam(fromParam, addDays(today, -6));
    to = dateParam(toParam, today);
    if (from > to) [from, to] = [to, from];
  }

  const days = daysBetween(from, to);
  const previousTo = addDays(from, -1);
  const previousFrom = addDays(previousTo, -(days - 1));

  const labels: Record<PeriodKey, string> = {
    today: 'Hari ini',
    '7d': '7 hari terakhir',
    '30d': '30 hari terakhir',
    '90d': '90 hari terakhir',
    month: 'Bulan ini',
    custom: 'Rentang khusus',
  };

  return {
    period,
    range: { from, to, previousFrom, previousTo, days },
    label: labels[period],
  };
}

export function eachDay(from: string, to: string, max = 120): string[] {
  const days: string[] = [];
  let cursor = from;
  while (cursor <= to && days.length < max) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}

export function formatDayShort(dateString: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'UTC',
    day: '2-digit',
    month: 'short',
  }).format(new Date(`${dateString}T00:00:00Z`));
}

export function formatMonthShort(dateString: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'UTC',
    month: 'short',
    year: '2-digit',
  }).format(new Date(`${dateString}T00:00:00Z`));
}

export function growthPercent(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}
