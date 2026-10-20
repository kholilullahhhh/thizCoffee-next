import Link from 'next/link';
import { AlertTriangle, ArrowDownUp, Download, Search, Warehouse } from 'lucide-react';
import { getDb } from '@/lib/db';
import { requirePageRole } from '@/lib/auth/session';
import { addDays, makassarToday } from '@/lib/dates';
import { formatDateTime, formatIDR, formatNumber, toNumber } from '@/lib/format';
import { PageHeader } from '@/components/dashboard/page-header';
import {
  Badge,
  buttonClass,
  EmptyState,
  Pagination,
  Panel,
  SectionTitle,
} from '@/components/dashboard/ui';
import { IngredientManager } from '@/components/dashboard/inventory/ingredient-manager';
import { StockAdjustmentDialog } from '@/components/dashboard/inventory/stock-adjustment-dialog';

export const dynamic = 'force-dynamic';

const MOVEMENT_PAGE_SIZE = 25;

export default async function InventoryPage({
  searchParams,
}: {
  searchParams?: {
    iq?: string;
    icat?: string;
    iarch?: string;
    mtype?: string;
    mq?: string;
    mpage?: string;
  };
}) {
  await requirePageRole(['OWNER', 'INVENTORY'], '/dashboard/inventory');
  const db = await getDb();

  const iq = (searchParams?.iq || '').trim().slice(0, 100);
  const icat = searchParams?.icat || '';
  const iarch = searchParams?.iarch === '1';
  const mtype = searchParams?.mtype || '';
  const mq = (searchParams?.mq || '').trim().slice(0, 100);
  const mpage = Math.max(1, Number.parseInt(searchParams?.mpage || '1', 10) || 1);

  const ingredientConditions = [iarch ? 'i.active = FALSE' : 'i.active = TRUE'];
  const ingredientParams: unknown[] = [];
  if (iq) {
    ingredientParams.push(`%${iq}%`);
    ingredientConditions.push(
      `(i.name ILIKE $${ingredientParams.length} OR i.sku ILIKE $${ingredientParams.length})`
    );
  }
  if (icat) {
    ingredientParams.push(icat);
    ingredientConditions.push(`i.category = $${ingredientParams.length}`);
  }

  const movementConditions: string[] = [];
  const movementParams: unknown[] = [];
  if (mtype) {
    movementParams.push(mtype);
    movementConditions.push(`m.type = $${movementParams.length}`);
  }
  if (mq) {
    movementParams.push(`%${mq}%`);
    movementConditions.push(
      `(COALESCE(p.name, i.name) ILIKE $${movementParams.length} OR COALESCE(p.sku, i.sku) ILIKE $${movementParams.length})`
    );
  }
  const movementWhere = movementConditions.length ? `WHERE ${movementConditions.join(' AND ')}` : '';

  const [
    ingredientRows,
    supplierRows,
    productRows,
    methodRows,
    adjustmentIngredients,
    statsRows,
    lowStockRows,
    movementRows,
    movementCount,
  ] = await Promise.all([
    db.query<Record<string, unknown>>(
      `SELECT i.id, i.sku, i.name, i.category, i.unit, i.stock, i.min_stock, i.unit_cost,
              i.supplier_id, i.active, s.name AS supplier_name
       FROM ingredients i LEFT JOIN suppliers s ON s.id = i.supplier_id
       WHERE ${ingredientConditions.join(' AND ')}
       ORDER BY i.active DESC, i.name ASC LIMIT 200`,
      ingredientParams
    ),
    db.query<{ id: string; name: string }>(
      'SELECT id, name FROM suppliers WHERE active = TRUE ORDER BY name'
    ),
    db.query<Record<string, unknown>>(
      `SELECT id, sku, name, stock, price, cost, min_stock FROM products
       WHERE active = TRUE ORDER BY name`
    ),
    db.query<{ code: string; name: string }>(
      'SELECT code, name FROM payment_methods WHERE active = TRUE ORDER BY sort_order'
    ),
    db.query<Record<string, unknown>>(
      `SELECT id, sku, name, unit, stock, unit_cost FROM ingredients
       WHERE active = TRUE ORDER BY name`
    ),
    db.query<Record<string, unknown>>(
      `SELECT
         (SELECT COUNT(*) FROM ingredients WHERE active = TRUE) AS ingredient_count,
         (SELECT COUNT(*) FROM ingredients WHERE active = TRUE AND stock <= min_stock) AS ingredient_low,
         (SELECT COUNT(*) FROM products WHERE active = TRUE AND stock <= min_stock) AS product_low,
         (SELECT COALESCE(SUM(stock * unit_cost), 0) FROM ingredients WHERE active = TRUE) AS ingredient_value,
         (SELECT COALESCE(SUM(stock * cost), 0) FROM products WHERE active = TRUE) AS product_value`
    ),
    db.query<Record<string, unknown>>(
      `SELECT 'product' AS kind, id, name, sku, stock, min_stock, 'pcs' AS unit FROM products
        WHERE active = TRUE AND stock <= min_stock
       UNION ALL
       SELECT 'ingredient' AS kind, id, name, sku, stock, min_stock, unit FROM ingredients
        WHERE active = TRUE AND stock <= min_stock
       ORDER BY stock ASC LIMIT 8`
    ),
    db.query<Record<string, unknown>>(
      `SELECT m.id, m.type, m.quantity, m.unit_cost, m.reason, m.created_at,
              COALESCE(p.name, i.name) AS item_name,
              COALESCE(p.sku, i.sku) AS item_sku,
              COALESCE(i.unit, 'pcs') AS unit,
              u.name AS actor_name
       FROM stock_movements m
       LEFT JOIN products p ON p.id = m.product_id
       LEFT JOIN ingredients i ON i.id = m.ingredient_id
       LEFT JOIN users u ON u.id = m.created_by
       ${movementWhere}
       ORDER BY m.created_at DESC
       LIMIT ${MOVEMENT_PAGE_SIZE} OFFSET ${(mpage - 1) * MOVEMENT_PAGE_SIZE}`,
      movementParams
    ),
    db.query<{ count: unknown }>(
      `SELECT COUNT(*) AS count FROM stock_movements m
       LEFT JOIN products p ON p.id = m.product_id
       LEFT JOIN ingredients i ON i.id = m.ingredient_id
       ${movementWhere}`,
      movementParams
    ),
  ]);

  const stats = statsRows[0] || {};
  const inventoryValue = toNumber(stats.ingredient_value) + toNumber(stats.product_value);
  const movementsTotal = toNumber(movementCount[0]?.count);
  const today = makassarToday();

  const buildMovementHref = (page: number) => {
    const sp = new URLSearchParams();
    if (iq) sp.set('iq', iq);
    if (icat) sp.set('icat', icat);
    if (iarch) sp.set('iarch', '1');
    if (mtype) sp.set('mtype', mtype);
    if (mq) sp.set('mq', mq);
    sp.set('mpage', String(page));
    return `/dashboard/inventory?${sp.toString()}`;
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Supply chain"
        title="INVENTARIS"
        description="Stok bahan baku, kemasan, dan produk jadi. Penerimaan, pemakaian resep, kerusakan, dan koreksi tercatat sebagai mutasi."
        actions={
          <>
            <a
              href={`/api/export?type=stock&from=${addDays(today, -30)}&to=${today}`}
              className={buttonClass('outline', 'md')}
            >
              <Download className="h-4 w-4" /> Ekspor mutasi
            </a>
            <StockAdjustmentDialog
              suppliers={supplierRows}
              methods={methodRows}
              items={[
                ...productRows.map((row) => ({
                  value: `product:${String(row.id)}`,
                  label: `${String(row.name)} (${String(row.sku)})`,
                  unit: 'pcs',
                  cost: toNumber(row.cost),
                  stock: toNumber(row.stock),
                  kind: 'product' as const,
                })),
                ...adjustmentIngredients.map((row) => ({
                  value: `ingredient:${String(row.id)}`,
                  label: `${String(row.name)} (${String(row.sku)})`,
                  unit: String(row.unit),
                  cost: toNumber(row.unit_cost),
                  stock: toNumber(row.stock),
                  kind: 'ingredient' as const,
                })),
              ]}
            />
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Jenis bahan aktif', value: `${formatNumber(stats.ingredient_count)} item` },
          { label: 'Nilai persediaan', value: formatIDR(inventoryValue) },
          { label: 'Bahan menipis', value: `${formatNumber(stats.ingredient_low)} item` },
          { label: 'Produk menipis', value: `${formatNumber(stats.product_low)} SKU` },
        ].map((item) => (
          <Panel key={item.label} className="px-4 py-3.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 dark:text-gray-500">
              {item.label}
            </p>
            <p className="mt-1 text-lg font-bold tabular-nums text-gray-900 dark:text-white">
              {item.value}
            </p>
          </Panel>
        ))}
      </div>

      {lowStockRows.length ? (
        <Panel className="border-amber-200/80 bg-amber-50/50 p-4 dark:border-amber-500/20 dark:bg-amber-500/[0.05]">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-amber-800 dark:text-amber-200">
                {lowStockRows.length} item di bawah stok minimum
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {lowStockRows.map((item) => (
                  <span
                    key={`${String(item.kind)}-${String(item.id)}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-white px-2.5 py-1 text-[10px] text-amber-800 dark:border-amber-500/20 dark:bg-[#141414] dark:text-amber-200"
                  >
                    {String(item.name)}
                    <strong>{formatNumber(item.stock)} {String(item.unit)}</strong>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Panel>
      ) : null}

      <section className="space-y-3">
        <SectionTitle
          title="BAHAN & KEMASAN"
          description="Bahan baku, susu, pemanis, botol, tutup, dan label."
        />
        <Panel className="p-4">
          <form className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input name="iq" defaultValue={iq} placeholder="Cari nama atau SKU bahan..." className="dashboard-input pl-10" />
            </div>
            <select name="icat" defaultValue={icat} className="dashboard-input lg:w-44">
              <option value="">Semua kategori</option>
              <option value="COFFEE">Kopi</option>
              <option value="DAIRY">Susu</option>
              <option value="SWEETENER">Pemanis</option>
              <option value="PACKAGING">Kemasan</option>
              <option value="OTHER">Lainnya</option>
            </select>
            <select name="iarch" defaultValue={iarch ? '1' : ''} className="dashboard-input lg:w-40">
              <option value="">Aktif</option>
              <option value="1">Termasuk arsip</option>
            </select>
            <button type="submit" className={buttonClass('secondary', 'md')}>Terapkan</button>
            <Link href="/dashboard/inventory" className={buttonClass('ghost', 'md')}>Reset</Link>
          </form>
        </Panel>
        <IngredientManager
          suppliers={supplierRows}
          ingredients={ingredientRows.map((row) => ({
            id: String(row.id),
            sku: String(row.sku),
            name: String(row.name),
            category: String(row.category),
            unit: String(row.unit),
            stock: toNumber(row.stock),
            minStock: toNumber(row.min_stock),
            unitCost: toNumber(row.unit_cost),
            supplierId: row.supplier_id ? String(row.supplier_id) : null,
            supplierName: row.supplier_name ? String(row.supplier_name) : null,
            active: Boolean(row.active),
          }))}
        />
      </section>

      <section className="space-y-3">
        <SectionTitle
          title="RIWAYAT MUTASI STOK"
          description="Jejak semua perubahan stok dari penjualan, pembelian, dan penyesuaian."
          action={
            <Link href="/dashboard/inventory" className={buttonClass('ghost', 'sm')}>
              <ArrowDownUp className="h-3.5 w-3.5" /> Reset filter
            </Link>
          }
        />
        <Panel className="p-4">
          <form className="flex flex-col gap-2 sm:flex-row">
            <input name="iq" type="hidden" value={iq} />
            <input name="icat" type="hidden" value={icat} />
            {iarch ? <input name="iarch" type="hidden" value="1" /> : null}
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input name="mq" defaultValue={mq} placeholder="Cari item mutasi..." className="dashboard-input pl-10" />
            </div>
            <select name="mtype" defaultValue={mtype} className="dashboard-input sm:w-44">
              <option value="">Semua tipe</option>
              <option value="PURCHASE">Pembelian</option>
              <option value="SALE">Penjualan</option>
              <option value="ADJUSTMENT">Penyesuaian</option>
              <option value="WASTAGE">Rusak / terbuang</option>
              <option value="RETURN">Pengembalian</option>
              <option value="PRODUCTION">Produksi</option>
            </select>
            <button type="submit" className={buttonClass('secondary', 'md')}>Terapkan</button>
          </form>
        </Panel>
        <Panel className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Item</th>
                  <th>Tipe</th>
                  <th className="text-right">Perubahan</th>
                  <th>Alasan</th>
                  <th>Oleh</th>
                </tr>
              </thead>
              <tbody>
                {movementRows.map((row) => {
                  const quantity = toNumber(row.quantity);
                  return (
                    <tr key={String(row.id)}>
                      <td className="whitespace-nowrap text-xs">{formatDateTime(String(row.created_at))}</td>
                      <td>
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">{String(row.item_name)}</p>
                        <p className="text-[10px] text-gray-400">{String(row.item_sku)}</p>
                      </td>
                      <td><Badge tone="neutral">{String(row.type)}</Badge></td>
                      <td className={`text-right font-bold tabular-nums ${quantity >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {quantity >= 0 ? '+' : ''}{formatNumber(quantity)} {String(row.unit)}
                      </td>
                      <td className="max-w-[260px] text-xs">{String(row.reason)}</td>
                      <td className="text-xs">{row.actor_name ? String(row.actor_name) : '-'}</td>
                    </tr>
                  );
                })}
                {!movementRows.length ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState
                        icon={<Warehouse className="h-5 w-5" />}
                        title="Belum ada mutasi stok"
                        description="Mutasi akan muncul setelah penjualan, pembelian, atau penyesuaian dicatat."
                      />
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <Pagination page={mpage} pageSize={MOVEMENT_PAGE_SIZE} total={movementsTotal} buildHref={buildMovementHref} />
        </Panel>
      </section>
    </div>
  );
}
