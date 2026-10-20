import Link from 'next/link';
import { ArrowLeft, ScrollText, Search } from 'lucide-react';
import { getDb } from '@/lib/db';
import { requirePageRole } from '@/lib/auth/session';
import { businessDayRange, makassarToday } from '@/lib/dates';
import { formatDateTime, formatNumber, toNumber } from '@/lib/format';
import { PageHeader } from '@/components/dashboard/page-header';
import { Badge, buttonClass, EmptyState, Pagination, Panel } from '@/components/dashboard/ui';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 30;

const actionTones: Record<string, 'green' | 'red' | 'orange' | 'blue' | 'purple' | 'neutral'> = {
  ORDER_CREATED: 'green',
  ORDER_STATUS_CHANGED: 'blue',
  ORDER_CANCELLED: 'red',
  PAYMENT_RECORDED: 'green',
  PRODUCT_CREATED: 'orange',
  PRODUCT_UPDATED: 'orange',
  INGREDIENT_CREATED: 'orange',
  INGREDIENT_UPDATED: 'orange',
  STOCK_ADJUSTED: 'purple',
  INCOME_CREATED: 'green',
  EXPENSE_CREATED: 'red',
  FINANCIAL_ENTRY_VOIDED: 'red',
  SETTINGS_UPDATED: 'blue',
  USER_CREATED: 'purple',
  USER_UPDATED: 'purple',
  CONFIG_CREATED: 'neutral',
  CONFIG_UPDATED: 'neutral',
};

export default async function AuditPage({
  searchParams,
}: {
  searchParams?: { q?: string; action?: string; entity?: string; page?: string };
}) {
  await requirePageRole(['OWNER'], '/dashboard/settings/audit');
  const db = await getDb();
  const q = (searchParams?.q || '').trim().slice(0, 100);
  const action = searchParams?.action || '';
  const entity = searchParams?.entity || '';
  const page = Math.max(1, Number.parseInt(searchParams?.page || '1', 10) || 1);

  const conditions: string[] = [];
  const params: unknown[] = [];
  if (q) {
    params.push(`%${q}%`);
    conditions.push(
      `(a.summary ILIKE $${params.length} OR a.entity_id ILIKE $${params.length} OR u.name ILIKE $${params.length})`
    );
  }
  if (action) {
    params.push(action);
    conditions.push(`a.action = $${params.length}`);
  }
  if (entity) {
    params.push(entity);
    conditions.push(`a.entity_type = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const todayRange = businessDayRange(makassarToday(), makassarToday());

  const [rows, countRows, actions, entities, stats] = await Promise.all([
    db.query<Record<string, unknown>>(
      `SELECT a.*, u.name AS actor_name, u.role AS actor_role
       FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_id
       ${where}
       ORDER BY a.created_at DESC
       LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`,
      params
    ),
    db.query<{ count: unknown }>(
      `SELECT COUNT(*) AS count FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_id ${where}`,
      params
    ),
    db.query<{ action: string }>('SELECT DISTINCT action FROM audit_logs ORDER BY action'),
    db.query<{ entity_type: string }>('SELECT DISTINCT entity_type FROM audit_logs ORDER BY entity_type'),
    db.query<Record<string, unknown>>(
      `SELECT
         (SELECT COUNT(*) FROM audit_logs) AS total_count,
         (SELECT COUNT(*) FROM audit_logs WHERE created_at >= $1 AND created_at < $2) AS today_count,
         (SELECT COUNT(DISTINCT actor_id) FROM audit_logs) AS actor_count`,
      [todayRange.start.toISOString(), todayRange.end.toISOString()]
    ),
  ]);

  const total = toNumber(countRows[0]?.count);
  const summary = stats[0] || {};
  const buildHref = (nextPage: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    if (action) sp.set('action', action);
    if (entity) sp.set('entity', entity);
    sp.set('page', String(nextPage));
    return `/dashboard/settings/audit?${sp.toString()}`;
  };

  return (
    <div className="space-y-5">
      <Link
        href="/dashboard/settings"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 transition hover:text-[#FF5A1F] dark:text-gray-400"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke pengaturan
      </Link>
      <PageHeader
        eyebrow="Governance"
        title="AUDIT LOG"
        description="Jejak append-only untuk perubahan transaksi, stok, keuangan, akun, dan konfigurasi. Gunakan untuk investigasi selisih atau aktivitas mencurigakan."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Total catatan', value: formatNumber(summary.total_count) },
          { label: 'Catatan hari ini', value: formatNumber(summary.today_count) },
          { label: 'Pelaku unik', value: formatNumber(summary.actor_count) },
        ].map((item) => (
          <Panel key={item.label} className="px-4 py-3.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">{item.label}</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-gray-900 dark:text-white">{item.value}</p>
          </Panel>
        ))}
      </div>

      <Panel className="p-4">
        <form className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input name="q" defaultValue={q} placeholder="Cari ringkasan, entity ID, atau nama pelaku..." className="dashboard-input pl-10" />
          </div>
          <select name="action" defaultValue={action} className="dashboard-input lg:w-56">
            <option value="">Semua aksi</option>
            {actions.map((row) => (
              <option key={row.action} value={row.action}>{row.action}</option>
            ))}
          </select>
          <select name="entity" defaultValue={entity} className="dashboard-input lg:w-44">
            <option value="">Semua entity</option>
            {entities.map((row) => (
              <option key={row.entity_type} value={row.entity_type}>{row.entity_type}</option>
            ))}
          </select>
          <button type="submit" className={buttonClass('secondary', 'md')}>Terapkan</button>
          <Link href="/dashboard/settings/audit" className={buttonClass('ghost', 'md')}>Reset</Link>
        </form>
      </Panel>

      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="dashboard-table min-w-[900px]">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Aksi</th>
                <th>Entity</th>
                <th>Ringkasan</th>
                <th>Pelaku</th>
                <th>Metadata</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={String(row.id)}>
                  <td className="whitespace-nowrap text-xs">{formatDateTime(String(row.created_at))}</td>
                  <td>
                    <Badge tone={actionTones[String(row.action)] || 'neutral'}>
                      {String(row.action)}
                    </Badge>
                  </td>
                  <td className="text-xs">
                    <p className="font-semibold">{String(row.entity_type)}</p>
                    <p className="max-w-[150px] truncate text-[10px] text-gray-400">{String(row.entity_id)}</p>
                  </td>
                  <td className="max-w-[360px] text-xs">{String(row.summary)}</td>
                  <td className="text-xs">
                    <p>{row.actor_name ? String(row.actor_name) : 'Sistem'}</p>
                    {row.actor_role ? <p className="text-[10px] text-gray-400">{String(row.actor_role)}</p> : null}
                  </td>
                  <td className="max-w-[180px] text-[10px] text-gray-400">
                    {row.metadata ? (
                      <details>
                        <summary className="cursor-pointer text-[#FF5A1F]">Lihat</summary>
                        <pre className="mt-1 max-h-28 overflow-auto whitespace-pre-wrap break-all">
                          {String(row.metadata)}
                        </pre>
                      </details>
                    ) : '-'}
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={<ScrollText className="h-5 w-5" />}
                      title="Audit log tidak ditemukan"
                      description="Ubah filter atau lakukan aktivitas baru untuk menghasilkan catatan."
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
