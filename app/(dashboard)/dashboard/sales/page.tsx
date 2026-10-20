import Link from 'next/link';
import {
  Download,
  ReceiptText,
  Search,
  ShoppingCart,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { getDb } from '@/lib/db';
import { requirePageRole } from '@/lib/auth/session';
import { resolvePeriod } from '@/lib/dates';
import { formatDateTime, formatIDR, formatNumber, toNumber } from '@/lib/format';
import { getPeriodSummary } from '@/lib/services/analytics';
import { getOrderFormOptions } from '@/lib/services/order-data';
import { PageHeader } from '@/components/dashboard/page-header';
import { PeriodTabs } from '@/components/dashboard/period-tabs';
import { StatCard } from '@/components/dashboard/stat-card';
import {
  Badge,
  buttonClass,
  EmptyState,
  Pagination,
  Panel,
  statusMeta,
} from '@/components/dashboard/ui';
import { OrderFormDialog } from '@/components/dashboard/orders/order-form-dialog';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 25;

export default async function SalesPage({
  searchParams,
}: {
  searchParams?: {
    period?: string;
    from?: string;
    to?: string;
    q?: string;
    status?: string;
    payment?: string;
    page?: string;
    new?: string;
  };
}) {
  await requirePageRole(['OWNER', 'STAFF'], '/dashboard/sales');
  const db = await getDb();
  const resolved = resolvePeriod(searchParams?.period, searchParams?.from, searchParams?.to);
  const { range } = resolved;
  const start = new Date(`${range.from}T00:00:00+08:00`);
  const end = new Date(`${range.to}T00:00:00+08:00`);
  end.setUTCDate(end.getUTCDate() + 1);

  const q = (searchParams?.q || '').trim().slice(0, 100);
  const status = searchParams?.status || '';
  const payment = searchParams?.payment || '';
  const page = Math.max(1, Number.parseInt(searchParams?.page || '1', 10) || 1);

  const conditions = ['o.created_at >= $1', 'o.created_at < $2'];
  const params: unknown[] = [start.toISOString(), end.toISOString()];
  if (q) {
    params.push(`%${q}%`);
    conditions.push(
      `(o.order_number ILIKE $${params.length} OR o.customer_name ILIKE $${params.length} OR o.customer_phone ILIKE $${params.length})`
    );
  }
  if (status) {
    params.push(status);
    conditions.push(`o.status = $${params.length}`);
  }
  if (payment) {
    params.push(payment);
    conditions.push(`o.payment_status = $${params.length}`);
  }
  const where = conditions.join(' AND ');

  const [summary, countRows, orderRows, options] = await Promise.all([
    getPeriodSummary(db, start, end),
    db.query<{ count: unknown }>(`SELECT COUNT(*) AS count FROM orders o WHERE ${where}`, params),
    db.query<Record<string, unknown>>(
      `SELECT o.id, o.order_number, o.customer_name, o.channel, ch.name AS channel_name,
              o.status, o.payment_status, o.total, o.amount_paid, o.created_at,
              o.discount, o.delivery_fee, o.subtotal
       FROM orders o LEFT JOIN order_channels ch ON ch.code = o.channel
       WHERE ${where}
       ORDER BY o.created_at DESC
       LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`,
      params
    ),
    getOrderFormOptions(),
  ]);

  const total = toNumber(countRows[0]?.count);
  const buildHref = (nextPage: number) => {
    const sp = new URLSearchParams();
    sp.set('period', resolved.period);
    if (resolved.period === 'custom') {
      sp.set('from', range.from);
      sp.set('to', range.to);
    }
    if (q) sp.set('q', q);
    if (status) sp.set('status', status);
    if (payment) sp.set('payment', payment);
    sp.set('page', String(nextPage));
    return `/dashboard/sales?${sp.toString()}`;
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Transaksi"
        title="PENJUALAN"
        description="Catat penjualan multi-produk, pembayaran, diskon, dan pengiriman. Stok serta kas diperbarui dalam satu transaksi database."
        actions={
          <>
            <a
              href={`/api/export?type=orders&from=${range.from}&to=${range.to}`}
              className={buttonClass('outline', 'md')}
            >
              <Download className="h-4 w-4" /> Ekspor CSV
            </a>
            <OrderFormDialog
              {...options}
              initialOpen={searchParams?.new === '1'}
              label="Penjualan baru"
            />
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Omzet periode"
          value={formatIDR(summary.revenue)}
          hint={`${formatNumber(summary.orders)} transaksi non-batal`}
          icon={<TrendingUp className="h-4 w-4" />}
          emphasis
        />
        <StatCard
          label="Pembayaran diterima"
          value={formatIDR(summary.paymentsReceived)}
          hint="Kas aktual dari pembayaran"
          icon={<Wallet className="h-4 w-4" />}
        />
        <StatCard
          label="Piutang"
          value={formatIDR(summary.receivables)}
          hint="Belum diterima sebagai kas"
          icon={<ReceiptText className="h-4 w-4" />}
        />
        <StatCard
          label="Rata-rata transaksi"
          value={formatIDR(summary.averageOrder)}
          hint={`${formatNumber(summary.units)} unit terjual`}
          icon={<ShoppingCart className="h-4 w-4" />}
        />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-black/[0.06] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-white/[0.07] dark:bg-[#141414]">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {resolved.label} · {range.from} s.d. {range.to} (WITA)
        </p>
        <PeriodTabs
          basePath="/dashboard/sales"
          period={resolved.period}
          from={range.from}
          to={range.to}
          extra={{ q, status, payment }}
        />
      </div>

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
            <input
              name="q"
              defaultValue={q}
              placeholder="Cari nomor transaksi, nama, atau WhatsApp..."
              className="dashboard-input pl-10"
            />
          </div>
          <select name="status" defaultValue={status} className="dashboard-input lg:w-40">
            <option value="">Semua status</option>
            <option value="NEW">Baru</option>
            <option value="PROCESSING">Diproses</option>
            <option value="READY">Siap</option>
            <option value="COMPLETED">Selesai</option>
            <option value="CANCELLED">Dibatalkan</option>
          </select>
          <select name="payment" defaultValue={payment} className="dashboard-input lg:w-40">
            <option value="">Semua pembayaran</option>
            <option value="UNPAID">Belum bayar</option>
            <option value="PARTIAL">Sebagian</option>
            <option value="PAID">Lunas</option>
            <option value="REFUNDED">Refund</option>
          </select>
          <button type="submit" className={buttonClass('secondary', 'md')}>Terapkan</button>
          <Link
            href={`/dashboard/sales?period=${resolved.period}${resolved.period === 'custom' ? `&from=${range.from}&to=${range.to}` : ''}`}
            className={buttonClass('ghost', 'md')}
          >
            Reset
          </Link>
        </form>
      </Panel>

      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="dashboard-table min-w-[900px]">
            <thead>
              <tr>
                <th>Transaksi</th>
                <th>Pelanggan</th>
                <th>Kanal</th>
                <th>Status</th>
                <th>Pembayaran</th>
                <th className="text-right">Total</th>
                <th className="text-right">Dibayar</th>
                <th className="text-right">Sisa</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {orderRows.map((row) => {
                const totalValue = toNumber(row.total);
                const paid = toNumber(row.amount_paid);
                const remaining = Math.max(0, totalValue - paid);
                const orderStatus = String(row.status);
                return (
                  <tr key={String(row.id)}>
                    <td>
                      <Link
                        href={`/dashboard/orders/${String(row.id)}`}
                        className="font-semibold text-gray-900 hover:text-[#FF5A1F] dark:text-white"
                      >
                        {String(row.order_number)}
                      </Link>
                      <p className="mt-0.5 text-[10px] text-gray-400">{formatDateTime(String(row.created_at))}</p>
                    </td>
                    <td className="text-xs">{String(row.customer_name)}</td>
                    <td className="text-xs">{row.channel_name ? String(row.channel_name) : String(row.channel)}</td>
                    <td>
                      <Badge tone={statusMeta[orderStatus]?.tone || 'neutral'}>
                        {statusMeta[orderStatus]?.label || orderStatus}
                      </Badge>
                    </td>
                    <td>
                      <Badge tone={statusMeta[String(row.payment_status)]?.tone || 'neutral'}>
                        {statusMeta[String(row.payment_status)]?.label || String(row.payment_status)}
                      </Badge>
                    </td>
                    <td className="text-right font-semibold tabular-nums text-gray-900 dark:text-white">
                      {formatIDR(totalValue)}
                    </td>
                    <td className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">{formatIDR(paid)}</td>
                    <td className={`text-right tabular-nums ${remaining > 0 ? 'font-semibold text-amber-600 dark:text-amber-400' : 'text-gray-400'}`}>
                      {formatIDR(remaining)}
                    </td>
                    <td className="text-right">
                      <Link href={`/dashboard/orders/${String(row.id)}`} className={buttonClass('outline', 'sm')}>
                        Detail
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {!orderRows.length ? (
                <tr>
                  <td colSpan={9}>
                    <EmptyState
                      icon={<ShoppingCart className="h-5 w-5" />}
                      title="Belum ada transaksi"
                      description="Catat penjualan baru atau ubah filter tanggal dan status."
                    />
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} buildHref={buildHref} />
      </Panel>

      <p className="text-[11px] leading-relaxed text-gray-400">
        Catatan: baris dengan status DIBATALKAN tidak dihitung sebagai omzet. Pembayaran pada pesanan
        aktif dicatat sebagai kas, sedangkan sisa tagihan tetap menjadi piutang hingga dibayar.
      </p>
    </div>
  );
}
