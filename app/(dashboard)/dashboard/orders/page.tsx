import Link from 'next/link';
import { ClipboardList, Download, Search } from 'lucide-react';
import { getDb } from '@/lib/db';
import { requirePageRole } from '@/lib/auth/session';
import { formatDateTime, formatIDR, formatNumber, toNumber } from '@/lib/format';
import { getOrderFormOptions } from '@/lib/services/order-data';
import { PageHeader } from '@/components/dashboard/page-header';
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
const validStatuses = ['NEW', 'PROCESSING', 'READY', 'COMPLETED', 'CANCELLED'];
const validPaymentStatuses = ['UNPAID', 'PARTIAL', 'PAID', 'REFUNDED'];
const orderSorts: Record<string, string> = {
  priority:
    "CASE o.status WHEN 'NEW' THEN 1 WHEN 'PROCESSING' THEN 2 WHEN 'READY' THEN 3 WHEN 'COMPLETED' THEN 4 ELSE 5 END, o.created_at ASC",
  newest: 'o.created_at DESC',
  oldest: 'o.created_at ASC',
  'total-desc': 'o.total DESC, o.created_at DESC',
  'total-asc': 'o.total ASC, o.created_at DESC',
};

export default async function OrdersPage({
  searchParams,
}: {
  searchParams?: {
    q?: string;
    status?: string;
    payment?: string;
    sort?: string;
    page?: string;
  };
}) {
  await requirePageRole(['OWNER', 'STAFF'], '/dashboard/orders');
  const db = await getDb();
  const q = (searchParams?.q || '').trim().slice(0, 100);
  const status = searchParams?.status || 'active';
  const payment = validPaymentStatuses.includes(searchParams?.payment || '')
    ? (searchParams?.payment as string)
    : 'all';
  const sortParam = searchParams?.sort || 'priority';
  const sort = Object.prototype.hasOwnProperty.call(orderSorts, sortParam)
    ? sortParam
    : 'priority';
  const page = Math.max(1, Number.parseInt(searchParams?.page || '1', 10) || 1);

  const conditions: string[] = [];
  const params: unknown[] = [];
  if (status === 'active') {
    conditions.push("o.status IN ('NEW','PROCESSING','READY')");
  } else if (validStatuses.includes(status)) {
    params.push(status);
    conditions.push(`o.status = $${params.length}`);
  }
  if (payment !== 'all') {
    params.push(payment);
    conditions.push(`o.payment_status = $${params.length}`);
  }
  if (q) {
    params.push(`%${q}%`);
    conditions.push(
      `(o.order_number ILIKE $${params.length} OR o.customer_name ILIKE $${params.length} OR o.customer_phone ILIKE $${params.length})`
    );
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [orderRows, countRows, statusRows, options] = await Promise.all([
    db.query<Record<string, unknown>>(
      `SELECT o.id, o.order_number, o.customer_name, o.customer_phone, o.channel,
              ch.name AS channel_name, o.status, o.payment_status, o.total, o.amount_paid,
              o.created_at, o.notes,
              COALESCE((SELECT SUM(oi.quantity) FROM order_items oi WHERE oi.order_id = o.id), 0) AS item_count
       FROM orders o LEFT JOIN order_channels ch ON ch.code = o.channel
       ${where}
       ORDER BY ${orderSorts[sort]}
       LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`,
      params
    ),
    db.query<{ count: unknown }>(`SELECT COUNT(*) AS count FROM orders o ${where}`, params),
    db.query<Record<string, unknown>>(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'NEW') AS new_count,
         COUNT(*) FILTER (WHERE status = 'PROCESSING') AS processing_count,
         COUNT(*) FILTER (WHERE status = 'READY') AS ready_count,
         COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed_count,
         COUNT(*) FILTER (WHERE status = 'CANCELLED') AS cancelled_count
       FROM orders`
    ),
    getOrderFormOptions(),
  ]);

  const total = toNumber(countRows[0]?.count);
  const counts = statusRows[0] || {};
  const filterParams = () => {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    if (payment !== 'all') sp.set('payment', payment);
    if (sort !== 'priority') sp.set('sort', sort);
    return sp;
  };
  const buildHref = (nextPage: number) => {
    const sp = filterParams();
    if (status) sp.set('status', status);
    sp.set('page', String(nextPage));
    return `/dashboard/orders?${sp.toString()}`;
  };
  const tabHref = (nextStatus: string) => {
    const sp = filterParams();
    sp.set('status', nextStatus);
    return `/dashboard/orders?${sp.toString()}`;
  };

  const tabs = [
    { key: 'active', label: 'Aktif', count: toNumber(counts.new_count) + toNumber(counts.processing_count) + toNumber(counts.ready_count) },
    { key: 'NEW', label: 'Baru', count: toNumber(counts.new_count) },
    { key: 'PROCESSING', label: 'Diproses', count: toNumber(counts.processing_count) },
    { key: 'READY', label: 'Siap', count: toNumber(counts.ready_count) },
    { key: 'COMPLETED', label: 'Selesai', count: toNumber(counts.completed_count) },
    { key: 'CANCELLED', label: 'Dibatalkan', count: toNumber(counts.cancelled_count) },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Fulfillment"
        title="PESANAN"
        description="Pantau antrean pesanan dari WhatsApp, penjualan langsung, dan kanal lain. Perubahan status tercatat pada riwayat audit."
        actions={
          <>
            <a href="/api/export?type=orders" className={buttonClass('outline', 'md')}>
              <Download className="h-4 w-4" /> Ekspor CSV
            </a>
            <OrderFormDialog {...options} label="Pesanan baru" />
          </>
        }
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {tabs.map((tab) => {
          const active = status === tab.key;
          return (
            <Link
              key={tab.key}
              href={tabHref(tab.key)}
              className={`rounded-xl border p-3 transition ${
                active
                  ? 'border-[#FF5A1F] bg-[#FF5A1F] text-white shadow-lg shadow-[#FF5A1F]/15'
                  : 'dashboard-card hover:border-[#FF5A1F]/30'
              }`}
            >
              <p className={`text-[10px] font-bold uppercase tracking-[0.14em] ${active ? 'text-white/75' : 'text-gray-400'}`}>
                {tab.label}
              </p>
              <p className={`mt-1 text-xl font-extrabold tabular-nums ${active ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                {formatNumber(tab.count)}
              </p>
            </Link>
          );
        })}
      </div>

      <Panel className="p-4">
        <form className="flex flex-col gap-2 lg:flex-row">
          <input type="hidden" name="status" value={status} />
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Cari nomor pesanan, nama, atau WhatsApp..."
              className="dashboard-input pl-10"
            />
          </div>
          <select
            name="payment"
            defaultValue={payment === 'all' ? '' : payment}
            className="dashboard-input lg:w-40"
            aria-label="Filter pembayaran"
          >
            <option value="">Semua pembayaran</option>
            <option value="UNPAID">Belum bayar</option>
            <option value="PARTIAL">Sebagian</option>
            <option value="PAID">Lunas</option>
            <option value="REFUNDED">Refund</option>
          </select>
          <select
            name="sort"
            defaultValue={sort}
            className="dashboard-input lg:w-44"
            aria-label="Urutkan pesanan"
          >
            <option value="priority">Prioritas antrean</option>
            <option value="newest">Terbaru</option>
            <option value="oldest">Terlama</option>
            <option value="total-desc">Total tertinggi</option>
            <option value="total-asc">Total terendah</option>
          </select>
          <button type="submit" className={buttonClass('secondary', 'md')}>Cari</button>
          <Link href={`/dashboard/orders?status=${status}`} className={buttonClass('ghost', 'md')}>Reset</Link>
        </form>
      </Panel>

      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="dashboard-table min-w-[860px]">
            <thead>
              <tr>
                <th>Pesanan</th>
                <th>Pelanggan</th>
                <th>Kanal</th>
                <th className="text-right">Item</th>
                <th>Status</th>
                <th>Pembayaran</th>
                <th className="text-right">Total</th>
                <th className="text-right">Sisa</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {orderRows.map((row) => {
                const totalValue = toNumber(row.total);
                const paid = toNumber(row.amount_paid);
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
                    <td>
                      <p className="text-xs font-medium text-gray-800 dark:text-gray-100">{String(row.customer_name)}</p>
                      {row.customer_phone ? <p className="text-[10px] text-gray-400">{String(row.customer_phone)}</p> : null}
                    </td>
                    <td className="text-xs">{row.channel_name ? String(row.channel_name) : String(row.channel)}</td>
                    <td className="text-right text-xs">{formatNumber(row.item_count)}</td>
                    <td>
                      <Badge tone={statusMeta[String(row.status)]?.tone || 'neutral'}>
                        {statusMeta[String(row.status)]?.label || String(row.status)}
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
                    <td className={`text-right tabular-nums ${totalValue - paid > 0 ? 'font-semibold text-amber-600 dark:text-amber-400' : 'text-gray-400'}`}>
                      {formatIDR(Math.max(0, totalValue - paid))}
                    </td>
                    <td className="text-right">
                      <Link href={`/dashboard/orders/${String(row.id)}`} className={buttonClass('outline', 'sm')}>
                        Kelola
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {!orderRows.length ? (
                <tr>
                  <td colSpan={9}>
                    <EmptyState
                      icon={<ClipboardList className="h-5 w-5" />}
                      title={status === 'active' ? 'Tidak ada pesanan aktif' : 'Pesanan tidak ditemukan'}
                      description={
                        status === 'active'
                          ? 'Semua pesanan sudah selesai atau dibatalkan. Buat pesanan baru bila diperlukan.'
                          : 'Ubah filter status atau kata kunci pencarian.'
                      }
                      action={
                        <Link href="/dashboard/orders" className={buttonClass('outline', 'sm')}>
                          Lihat semua status
                        </Link>
                      }
                    />
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} buildHref={buildHref} />
      </Panel>
    </div>
  );
}
