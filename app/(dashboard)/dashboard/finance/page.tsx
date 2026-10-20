import Link from 'next/link';
import {
  ArrowDownRight,
  ArrowUpRight,
  Download,
  Landmark,
  Search,
  Wallet,
} from 'lucide-react';
import { getDb } from '@/lib/db';
import { requirePageRole } from '@/lib/auth/session';
import { eachDay, formatDayShort, resolvePeriod } from '@/lib/dates';
import { formatDateTime, formatIDR, formatNumber, toNumber } from '@/lib/format';
import { getCumulativeCash, getDailyTrend, getPeriodSummary } from '@/lib/services/analytics';
import { PageHeader } from '@/components/dashboard/page-header';
import { PeriodTabs } from '@/components/dashboard/period-tabs';
import { StatCard } from '@/components/dashboard/stat-card';
import { CashFlowChart } from '@/components/dashboard/charts';
import {
  Badge,
  buttonClass,
  EmptyState,
  Pagination,
  Panel,
  SectionTitle,
  statusMeta,
} from '@/components/dashboard/ui';
import { FinanceEntryDialog } from '@/components/dashboard/finance/finance-entry-dialog';
import { VoidEntryButton } from '@/components/dashboard/finance/void-entry-button';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 25;

export default async function FinancePage({
  searchParams,
}: {
  searchParams?: {
    period?: string;
    from?: string;
    to?: string;
    type?: string;
    category?: string;
    status?: string;
    q?: string;
    page?: string;
  };
}) {
  await requirePageRole(['OWNER'], '/dashboard/finance');
  const db = await getDb();
  const resolved = resolvePeriod(searchParams?.period, searchParams?.from, searchParams?.to);
  const { range } = resolved;
  const start = new Date(`${range.from}T00:00:00+08:00`);
  const end = new Date(`${range.to}T00:00:00+08:00`);
  end.setUTCDate(end.getUTCDate() + 1);
  const previousStart = new Date(`${range.previousFrom}T00:00:00+08:00`);
  const previousEnd = new Date(`${range.previousTo}T00:00:00+08:00`);
  previousEnd.setUTCDate(previousEnd.getUTCDate() + 1);

  const type = ['INCOME', 'EXPENSE'].includes(searchParams?.type || '') ? searchParams?.type : '';
  const category = searchParams?.category || '';
  const status = searchParams?.status || 'active';
  const q = (searchParams?.q || '').trim().slice(0, 100);
  const page = Math.max(1, Number.parseInt(searchParams?.page || '1', 10) || 1);
  const days = eachDay(range.from, range.to);

  const conditions = ['f.occurred_at >= $1', 'f.occurred_at < $2'];
  const params: unknown[] = [start.toISOString(), end.toISOString()];
  if (type) {
    params.push(type);
    conditions.push(`f.type = $${params.length}`);
  }
  if (category) {
    params.push(category);
    conditions.push(`f.category_id = $${params.length}`);
  }
  if (status === 'active') conditions.push('f.is_voided = FALSE');
  if (status === 'void') conditions.push('f.is_voided = TRUE');
  if (q) {
    params.push(`%${q}%`);
    conditions.push(
      `(f.description ILIKE $${params.length} OR f.notes ILIKE $${params.length} OR o.order_number ILIKE $${params.length})`
    );
  }
  const where = conditions.join(' AND ');

  const [summary, previous, cashBalance, trend, categoryRows, methodRows, supplierRows, entryRows, countRows] =
    await Promise.all([
      getPeriodSummary(db, start, end),
      getPeriodSummary(db, previousStart, previousEnd),
      getCumulativeCash(db, end),
      getDailyTrend(db, start, end, days, days.map(formatDayShort)),
      db.query<{ id: string; name: string; kind: string; active: boolean; is_system: boolean }>(
        'SELECT id, name, kind, active, is_system FROM financial_categories ORDER BY kind, name'
      ),
      db.query<{ code: string; name: string }>(
        'SELECT code, name FROM payment_methods WHERE active = TRUE ORDER BY sort_order'
      ),
      db.query<{ id: string; name: string }>('SELECT id, name FROM suppliers WHERE active = TRUE ORDER BY name'),
      db.query<Record<string, unknown>>(
        `SELECT f.id, f.type, f.amount, f.method, f.occurred_at, f.description, f.notes,
                f.is_voided, f.payment_id, f.dedupe_key, f.void_reason,
                c.name AS category_name, c.kind, s.name AS supplier_name, o.order_number
         FROM financial_entries f
         JOIN financial_categories c ON c.id = f.category_id
         LEFT JOIN suppliers s ON s.id = f.supplier_id
         LEFT JOIN orders o ON o.id = f.order_id
         WHERE ${where}
         ORDER BY f.occurred_at DESC
         LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`,
        params
      ),
      db.query<{ count: unknown }>(
        `SELECT COUNT(*) AS count FROM financial_entries f
         LEFT JOIN orders o ON o.id = f.order_id
         WHERE ${where}`,
        params
      ),
    ]);

  const total = toNumber(countRows[0]?.count);
  const buildHref = (nextPage: number) => {
    const sp = new URLSearchParams();
    sp.set('period', resolved.period);
    if (resolved.period === 'custom') {
      sp.set('from', range.from);
      sp.set('to', range.to);
    }
    if (type) sp.set('type', String(type));
    if (category) sp.set('category', category);
    if (status) sp.set('status', status);
    if (q) sp.set('q', q);
    sp.set('page', String(nextPage));
    return `/dashboard/finance?${sp.toString()}`;
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Finance"
        title="KEUANGAN"
        description="Buku kas, pemasukan, pengeluaran, dan rekonsiliasi. Penjualan kredit tidak dihitung sebagai kas sampai pembayaran diterima."
        actions={
          <>
            <a
              href={`/api/export?type=finance&from=${range.from}&to=${range.to}`}
              className={buttonClass('outline', 'md')}
            >
              <Download className="h-4 w-4" /> Ekspor CSV
            </a>
            <FinanceEntryDialog
              categories={categoryRows}
              methods={methodRows}
              suppliers={supplierRows}
            />
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Kas masuk"
          value={formatIDR(summary.cashIn)}
          hint="Pembayaran penjualan + pemasukan lain"
          delta={
            previous.cashIn > 0
              ? ((summary.cashIn - previous.cashIn) / previous.cashIn) * 100
              : summary.cashIn > 0
                ? 100
                : 0
          }
          icon={<ArrowUpRight className="h-4 w-4" />}
        />
        <StatCard
          label="Kas keluar"
          value={formatIDR(summary.cashOut)}
          hint="Termasuk pembelian persediaan & refund"
          delta={
            previous.cashOut > 0
              ? ((summary.cashOut - previous.cashOut) / previous.cashOut) * 100
              : summary.cashOut > 0
                ? 100
                : 0
          }
          icon={<ArrowDownRight className="h-4 w-4" />}
        />
        <StatCard
          label="Arus kas bersih"
          value={formatIDR(summary.netCash)}
          hint="Kas masuk − kas keluar periode"
          icon={<Wallet className="h-4 w-4" />}
          emphasis
        />
        <StatCard
          label="Saldo kas kumulatif"
          value={formatIDR(cashBalance)}
          hint="Semua transaksi hingga akhir periode"
          icon={<Landmark className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Panel className="px-4 py-3.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">Laba kotor</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-gray-900 dark:text-white">{formatIDR(summary.grossProfit)}</p>
          <p className="mt-0.5 text-[10px] text-gray-400">Omzet − HPP {formatIDR(summary.cogs)}</p>
        </Panel>
        <Panel className="px-4 py-3.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">Laba bersih</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-gray-900 dark:text-white">{formatIDR(summary.netProfit)}</p>
          <p className="mt-0.5 text-[10px] text-gray-400">Setelah biaya operasional + pemasukan lain</p>
        </Panel>
        <Panel className="px-4 py-3.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">Pembelian persediaan</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-gray-900 dark:text-white">{formatIDR(summary.inventoryPurchases)}</p>
          <p className="mt-0.5 text-[10px] text-gray-400">Kas keluar, bukan biaya penuh periode</p>
        </Panel>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-black/[0.06] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-white/[0.07] dark:bg-[#141414]">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {resolved.label} · {range.from} s.d. {range.to} (WITA)
        </p>
        <PeriodTabs
          basePath="/dashboard/finance"
          period={resolved.period}
          from={range.from}
          to={range.to}
          extra={{ type: type || '', category, status, q }}
        />
      </div>

      <Panel className="p-5">
        <SectionTitle
          title="ARUS KAS HARIAN"
          description="Kas masuk oranye, kas keluar hitam. Termasuk pembayaran pesanan dan transaksi manual."
        />
        <div className="mt-5">
          <CashFlowChart data={trend} />
        </div>
      </Panel>

      <Panel className="p-4">
        <form className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <input type="hidden" name="period" value={resolved.period} />
          {resolved.period === 'custom' ? (
            <>
              <input type="hidden" name="from" value={range.from} />
              <input type="hidden" name="to" value={range.to} />
            </>
          ) : null}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input name="q" defaultValue={q} placeholder="Cari keterangan atau no. pesanan..." className="dashboard-input pl-10" />
          </div>
          <select name="type" defaultValue={type || ''} className="dashboard-input lg:w-36">
            <option value="">Semua tipe</option>
            <option value="INCOME">Pemasukan</option>
            <option value="EXPENSE">Pengeluaran</option>
          </select>
          <select name="category" defaultValue={category} className="dashboard-input lg:w-52">
            <option value="">Semua kategori</option>
            {categoryRows.map((row) => (
              <option key={row.id} value={row.id}>{row.name}</option>
            ))}
          </select>
          <select name="status" defaultValue={status} className="dashboard-input lg:w-36">
            <option value="active">Aktif</option>
            <option value="void">Void</option>
            <option value="all">Semua</option>
          </select>
          <button type="submit" className={buttonClass('secondary', 'md')}>Terapkan</button>
          <Link
            href={`/dashboard/finance?period=${resolved.period}${resolved.period === 'custom' ? `&from=${range.from}&to=${range.to}` : ''}`}
            className={buttonClass('ghost', 'md')}
          >
            Reset
          </Link>
        </form>
      </Panel>

      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="dashboard-table min-w-[920px]">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Keterangan</th>
                <th>Kategori</th>
                <th>Metode</th>
                <th>Referensi</th>
                <th>Status</th>
                <th className="text-right">Nominal</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {entryRows.map((row) => {
                const isVoided = Boolean(row.is_voided);
                const canVoid =
                  !isVoided && !row.payment_id && !String(row.dedupe_key).startsWith('adjustment:');
                return (
                  <tr key={String(row.id)} className={isVoided ? 'opacity-50' : undefined}>
                    <td className="whitespace-nowrap text-xs">{formatDateTime(String(row.occurred_at))}</td>
                    <td className="max-w-[260px]">
                      <p className={`truncate text-xs font-semibold ${isVoided ? 'line-through' : ''} text-gray-800 dark:text-gray-100`}>
                        {String(row.description)}
                      </p>
                      {row.notes ? <p className="truncate text-[10px] text-gray-400">{String(row.notes)}</p> : null}
                    </td>
                    <td className="text-xs">{String(row.category_name)}</td>
                    <td className="text-xs">{String(row.method)}</td>
                    <td className="text-xs text-gray-400">
                      {row.order_number ? String(row.order_number) : row.supplier_name ? String(row.supplier_name) : '-'}
                    </td>
                    <td>
                      {isVoided ? (
                        <Badge tone="red">Void</Badge>
                      ) : (
                        <Badge tone={statusMeta[String(row.type)]?.tone || 'neutral'}>
                          {statusMeta[String(row.type)]?.label || String(row.type)}
                        </Badge>
                      )}
                    </td>
                    <td className={`text-right font-bold tabular-nums ${String(row.type) === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {String(row.type) === 'INCOME' ? '+' : '−'} {formatIDR(row.amount)}
                    </td>
                    <td className="text-right">
                      <VoidEntryButton
                        entryId={String(row.id)}
                        description={String(row.description)}
                        amount={formatIDR(row.amount)}
                        canVoid={canVoid}
                        isVoided={isVoided}
                      />
                    </td>
                  </tr>
                );
              })}
              {!entryRows.length ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState
                      icon={<Wallet className="h-5 w-5" />}
                      title="Belum ada transaksi keuangan"
                      description="Catat pemasukan lain atau pengeluaran operasional, atau ubah filter periode."
                    />
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} buildHref={buildHref} />
      </Panel>

      <div className="grid gap-3 sm:grid-cols-3">
        <Panel className="px-4 py-3.5">
          <p className="text-[10px] uppercase tracking-wider text-gray-400">Piutang penjualan</p>
          <p className="mt-1 font-bold tabular-nums">{formatIDR(summary.receivables)}</p>
          <p className="text-[10px] text-gray-400">Bukan kas — belum diterima</p>
        </Panel>
        <Panel className="px-4 py-3.5">
          <p className="text-[10px] uppercase tracking-wider text-gray-400">Pembayaran diterima</p>
          <p className="mt-1 font-bold tabular-nums">{formatIDR(summary.paymentsReceived)}</p>
          <p className="text-[10px] text-gray-400">Hanya pembayaran aktual</p>
        </Panel>
        <Panel className="px-4 py-3.5">
          <p className="text-[10px] uppercase tracking-wider text-gray-400">Pemasukan lain</p>
          <p className="mt-1 font-bold tabular-nums">{formatIDR(summary.otherIncome)}</p>
          <p className="text-[10px] text-gray-400">Di luar penjualan</p>
        </Panel>
      </div>
    </div>
  );
}
