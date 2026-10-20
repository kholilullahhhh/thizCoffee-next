import Link from 'next/link';
import { Search, UserCheck, Users } from 'lucide-react';
import { getDb } from '@/lib/db';
import { requirePageRole } from '@/lib/auth/session';
import { formatNumber, toNumber } from '@/lib/format';
import { PageHeader } from '@/components/dashboard/page-header';
import { buttonClass, Pagination, Panel } from '@/components/dashboard/ui';
import { CustomerManager } from '@/components/dashboard/customers/customer-manager';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 25;

export default async function CustomersPage({
  searchParams,
}: {
  searchParams?: { q?: string; status?: string; page?: string };
}) {
  await requirePageRole(['OWNER', 'STAFF'], '/dashboard/customers');
  const db = await getDb();
  const q = (searchParams?.q || '').trim().slice(0, 100);
  const status = searchParams?.status || 'active';
  const page = Math.max(1, Number.parseInt(searchParams?.page || '1', 10) || 1);

  const conditions: string[] = [];
  const params: unknown[] = [];
  if (status === 'active') conditions.push('c.active = TRUE');
  if (status === 'inactive') conditions.push('c.active = FALSE');
  if (q) {
    params.push(`%${q}%`);
    conditions.push(
      `(c.name ILIKE $${params.length} OR c.phone ILIKE $${params.length} OR c.email ILIKE $${params.length})`
    );
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [customerRows, countRows, statsRows] = await Promise.all([
    db.query<Record<string, unknown>>(
      `SELECT c.id, c.name, c.phone, c.email, c.address, c.notes, c.active,
              COUNT(o.id) FILTER (WHERE o.status <> 'CANCELLED') AS order_count,
              COALESCE(SUM(o.total) FILTER (WHERE o.status <> 'CANCELLED'), 0) AS total_spent,
              MAX(o.created_at) FILTER (WHERE o.status <> 'CANCELLED') AS last_order
       FROM customers c LEFT JOIN orders o ON o.customer_id = c.id
       ${where}
       GROUP BY c.id
       ORDER BY c.active DESC, total_spent DESC, c.name ASC
       LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`,
      params
    ),
    db.query<{ count: unknown }>(`SELECT COUNT(*) AS count FROM customers c ${where}`, params),
    db.query<Record<string, unknown>>(
      `SELECT
         COUNT(*) FILTER (WHERE active = TRUE) AS active_count,
         COUNT(*) AS total_count,
         COUNT(*) FILTER (
           WHERE (SELECT COUNT(*) FROM orders o WHERE o.customer_id = customers.id AND o.status <> 'CANCELLED') > 1
         ) AS returning_count
       FROM customers`
    ),
  ]);

  const ids = customerRows.map((row) => String(row.id));
  const historyRows = ids.length
    ? await db.query<Record<string, unknown>>(
        `SELECT id, customer_id, order_number, status, total, created_at
         FROM orders WHERE customer_id IN (${ids.map((_, index) => `$${index + 1}`).join(',')})
         ORDER BY created_at DESC`,
        ids
      )
    : [];
  const history: Record<string, Array<{ id: string; orderNumber: string; status: string; total: number; createdAt: string }>> = {};
  for (const row of historyRows) {
    const customerId = String(row.customer_id);
    const list = history[customerId] || [];
    if (list.length < 5) {
      list.push({
        id: String(row.id),
        orderNumber: String(row.order_number),
        status: String(row.status),
        total: toNumber(row.total),
        createdAt: String(row.created_at),
      });
      history[customerId] = list;
    }
  }

  const total = toNumber(countRows[0]?.count);
  const stats = statsRows[0] || {};
  const buildHref = (nextPage: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    if (status) sp.set('status', status);
    sp.set('page', String(nextPage));
    return `/dashboard/customers?${sp.toString()}`;
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="CRM"
        title="PELANGGAN"
        description="Basis pelanggan, kontak WhatsApp, alamat, nilai belanja, dan riwayat pesanan."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Pelanggan aktif', value: formatNumber(stats.active_count), icon: UserCheck },
          { label: 'Total pelanggan', value: formatNumber(stats.total_count), icon: Users },
          { label: 'Pelanggan berulang', value: formatNumber(stats.returning_count), icon: Users },
        ].map((item) => (
          <Panel key={item.label} className="flex items-center justify-between px-4 py-3.5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 dark:text-gray-500">{item.label}</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-gray-900 dark:text-white">{item.value}</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FF5A1F]/10 text-[#FF5A1F]">
              <item.icon className="h-4 w-4" />
            </span>
          </Panel>
        ))}
      </div>

      <Panel className="p-4">
        <form className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input name="q" defaultValue={q} placeholder="Cari nama, WhatsApp, atau email..." className="dashboard-input pl-10" />
          </div>
          <select name="status" defaultValue={status} className="dashboard-input sm:w-44">
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
            <option value="all">Semua</option>
          </select>
          <button type="submit" className={buttonClass('secondary', 'md')}>Terapkan</button>
          <Link href="/dashboard/customers" className={buttonClass('ghost', 'md')}>Reset</Link>
        </form>
      </Panel>

      <div className="space-y-3">
        <CustomerManager
          customers={customerRows.map((row) => ({
            id: String(row.id),
            name: String(row.name),
            phone: row.phone ? String(row.phone) : null,
            email: row.email ? String(row.email) : null,
            address: row.address ? String(row.address) : null,
            notes: row.notes ? String(row.notes) : null,
            active: Boolean(row.active),
            orderCount: toNumber(row.order_count),
            totalSpent: toNumber(row.total_spent),
            lastOrder: row.last_order ? String(row.last_order) : null,
          }))}
          history={history}
          canManage
        />
        {total > 0 ? (
          <div className="dashboard-card">
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} buildHref={buildHref} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
