import Link from 'next/link';
import { Search, Truck } from 'lucide-react';
import { getDb } from '@/lib/db';
import { requirePageRole } from '@/lib/auth/session';
import { formatNumber, toNumber } from '@/lib/format';
import { PageHeader } from '@/components/dashboard/page-header';
import { buttonClass, Pagination, Panel } from '@/components/dashboard/ui';
import { SupplierManager } from '@/components/dashboard/suppliers/supplier-manager';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 25;

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams?: { q?: string; status?: string; page?: string };
}) {
  await requirePageRole(['OWNER', 'INVENTORY'], '/dashboard/suppliers');
  const db = await getDb();
  const q = (searchParams?.q || '').trim().slice(0, 100);
  const status = searchParams?.status || 'active';
  const page = Math.max(1, Number.parseInt(searchParams?.page || '1', 10) || 1);

  const conditions: string[] = [];
  const params: unknown[] = [];
  if (status === 'active') conditions.push('s.active = TRUE');
  if (status === 'inactive') conditions.push('s.active = FALSE');
  if (q) {
    params.push(`%${q}%`);
    conditions.push(
      `(s.name ILIKE $${params.length} OR s.contact ILIKE $${params.length} OR s.phone ILIKE $${params.length})`
    );
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows, countRows, statsRows] = await Promise.all([
    db.query<Record<string, unknown>>(
      `SELECT s.*, COUNT(i.id) FILTER (WHERE i.active = TRUE) AS ingredient_count
       FROM suppliers s LEFT JOIN ingredients i ON i.supplier_id = s.id
       ${where}
       GROUP BY s.id
       ORDER BY s.active DESC, s.name ASC
       LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`,
      params
    ),
    db.query<{ count: unknown }>(`SELECT COUNT(*) AS count FROM suppliers s ${where}`, params),
    db.query<Record<string, unknown>>(
      `SELECT
         COUNT(*) FILTER (WHERE active = TRUE) AS active_count,
         COUNT(*) AS total_count,
         (SELECT COUNT(DISTINCT supplier_id) FROM ingredients WHERE supplier_id IS NOT NULL AND active = TRUE) AS linked_count
       FROM suppliers`
    ),
  ]);

  const total = toNumber(countRows[0]?.count);
  const stats = statsRows[0] || {};
  const buildHref = (nextPage: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    if (status) sp.set('status', status);
    sp.set('page', String(nextPage));
    return `/dashboard/suppliers?${sp.toString()}`;
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Supply chain"
        title="PEMASOK"
        description="Daftar pemasok bahan baku dan kemasan beserta kontak dan bahan yang terhubung."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Pemasok aktif', value: formatNumber(stats.active_count) },
          { label: 'Total pemasok', value: formatNumber(stats.total_count) },
          { label: 'Pemasok terhubung bahan', value: formatNumber(stats.linked_count) },
        ].map((item) => (
          <Panel key={item.label} className="flex items-center justify-between px-4 py-3.5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 dark:text-gray-500">{item.label}</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-gray-900 dark:text-white">{item.value}</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FF5A1F]/10 text-[#FF5A1F]">
              <Truck className="h-4 w-4" />
            </span>
          </Panel>
        ))}
      </div>

      <Panel className="p-4">
        <form className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input name="q" defaultValue={q} placeholder="Cari nama, kontak, atau telepon..." className="dashboard-input pl-10" />
          </div>
          <select name="status" defaultValue={status} className="dashboard-input sm:w-44">
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
            <option value="all">Semua</option>
          </select>
          <button type="submit" className={buttonClass('secondary', 'md')}>Terapkan</button>
          <Link href="/dashboard/suppliers" className={buttonClass('ghost', 'md')}>Reset</Link>
        </form>
      </Panel>

      <div className="space-y-3">
        <SupplierManager
          suppliers={rows.map((row) => ({
            id: String(row.id),
            name: String(row.name),
            contact: row.contact ? String(row.contact) : null,
            phone: row.phone ? String(row.phone) : null,
            email: row.email ? String(row.email) : null,
            address: row.address ? String(row.address) : null,
            notes: row.notes ? String(row.notes) : null,
            active: Boolean(row.active),
            ingredientCount: toNumber(row.ingredient_count),
          }))}
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
