import Link from 'next/link';
import { Boxes, Download, PackageSearch, Search } from 'lucide-react';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { toNumber, formatIDR, formatNumber } from '@/lib/format';
import { PageHeader } from '@/components/dashboard/page-header';
import { Pagination, Panel, buttonClass, EmptyState } from '@/components/dashboard/ui';
import { ProductManager } from '@/components/dashboard/products/product-manager';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams?: {
    q?: string;
    category?: string;
    stock?: string;
    sort?: string;
    page?: string;
  };
}) {
  const user = await getCurrentUser();
  const canManage = user?.role === 'OWNER' || user?.role === 'INVENTORY';
  const db = await getDb();
  const q = (searchParams?.q || '').trim().slice(0, 100);
  const category = searchParams?.category || '';
  const stockFilter = ['low', 'out', 'archived'].includes(searchParams?.stock || '')
    ? searchParams?.stock
    : '';
  const sort = ['name', 'stock', 'price', 'margin'].includes(searchParams?.sort || '')
    ? (searchParams?.sort as string)
    : 'name';
  const page = Math.max(1, Number.parseInt(searchParams?.page || '1', 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const conditions: string[] = [];
  const params: unknown[] = [];
  if (stockFilter === 'archived') {
    conditions.push('p.active = FALSE');
  } else {
    conditions.push('p.active = TRUE');
  }
  if (q) {
    params.push(`%${q}%`);
    conditions.push(`(p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length})`);
  }
  if (category) {
    params.push(category);
    conditions.push(`p.category_id = $${params.length}`);
  }
  if (stockFilter === 'low') conditions.push('p.stock <= p.min_stock AND p.stock > 0');
  if (stockFilter === 'out') conditions.push('p.stock <= 0');
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const orderBy =
    sort === 'stock'
      ? 'p.stock ASC, p.name ASC'
      : sort === 'price'
        ? 'p.price DESC, p.name ASC'
        : sort === 'margin'
          ? '(p.price - p.cost) DESC, p.name ASC'
          : 'p.name ASC';

  const [countRows, productRows, categoryRows, ingredientRows, recipeRows, statsRows] =
    await Promise.all([
      db.query<{ count: unknown }>(`SELECT COUNT(*) AS count FROM products p ${where}`, params),
      db.query<Record<string, unknown>>(
        `SELECT p.id, p.sku, p.name, p.category_id, p.volume_ml, p.price, p.cost,
                p.stock, p.min_stock, p.active, c.name AS category_name
         FROM products p LEFT JOIN product_categories c ON c.id = p.category_id
         ${where} ORDER BY ${orderBy} LIMIT ${PAGE_SIZE} OFFSET ${offset}`,
        params
      ),
      db.query<{ id: string; name: string }>(
        'SELECT id, name FROM product_categories WHERE active = TRUE ORDER BY name'
      ),
      db.query<{ id: string; name: string; unit: string; unit_cost: unknown }>(
        'SELECT id, name, unit, unit_cost FROM ingredients WHERE active = TRUE ORDER BY name'
      ),
      db.query<{ product_id: string; ingredient_id: string; quantity: unknown; name: string; unit: string; unit_cost: unknown }>(
        `SELECT r.product_id, r.ingredient_id, r.quantity, i.name, i.unit, i.unit_cost
         FROM recipe_items r JOIN ingredients i ON i.id = r.ingredient_id`
      ),
      db.query<{
        active_count: unknown;
        low_count: unknown;
        out_count: unknown;
        stock_value: unknown;
      }>(
        `SELECT
           COUNT(*) FILTER (WHERE active = TRUE) AS active_count,
           COUNT(*) FILTER (WHERE active = TRUE AND stock <= min_stock AND stock > 0) AS low_count,
           COUNT(*) FILTER (WHERE active = TRUE AND stock <= 0) AS out_count,
           COALESCE(SUM(CASE WHEN active = TRUE THEN stock * cost ELSE 0 END), 0) AS stock_value
         FROM products`
      ),
    ]);

  const recipes = new Map<string, Array<{ ingredientId: string; quantity: number; name: string; unit: string; cost: number }>>();
  for (const row of recipeRows) {
    const list = recipes.get(row.product_id) || [];
    list.push({
      ingredientId: row.ingredient_id,
      quantity: toNumber(row.quantity),
      name: row.name,
      unit: row.unit,
      cost: toNumber(row.unit_cost),
    });
    recipes.set(row.product_id, list);
  }

  const products = productRows.map((row) => ({
    id: String(row.id),
    sku: String(row.sku),
    name: String(row.name),
    categoryId: row.category_id ? String(row.category_id) : null,
    categoryName: row.category_name ? String(row.category_name) : null,
    volumeMl: row.volume_ml ? Number(row.volume_ml) : null,
    price: toNumber(row.price),
    cost: toNumber(row.cost),
    stock: toNumber(row.stock),
    minStock: toNumber(row.min_stock),
    active: Boolean(row.active),
    recipe: recipes.get(String(row.id)) || [],
  }));
  const total = toNumber(countRows[0]?.count);
  const stats = statsRows[0] || {};

  const buildHref = (nextPage: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    if (category) sp.set('category', category);
    if (stockFilter) sp.set('stock', String(stockFilter));
    if (sort) sp.set('sort', sort);
    sp.set('page', String(nextPage));
    return `/dashboard/products?${sp.toString()}`;
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Katalog"
        title="PRODUK"
        description="Kelola katalog kopi botolan, harga jual, HPP, batas stok, dan resep bahan (BOM)."
        actions={
          <a
            href={`/api/export?type=products`}
            className={buttonClass('outline', 'md')}
          >
            <Download className="h-4 w-4" /> Ekspor produk
          </a>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Produk aktif', value: formatNumber(stats.active_count) + ' SKU', icon: Boxes },
          { label: 'Stok menipis', value: formatNumber(stats.low_count) + ' SKU', icon: PackageSearch },
          { label: 'Stok habis', value: formatNumber(stats.out_count) + ' SKU', icon: PackageSearch },
          { label: 'Nilai stok produk', value: formatIDR(stats.stock_value), icon: Boxes },
        ].map((item) => (
          <Panel key={item.label} className="flex items-center justify-between px-4 py-3.5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 dark:text-gray-500">
                {item.label}
              </p>
              <p className="mt-1 text-lg font-bold tabular-nums text-gray-900 dark:text-white">
                {item.value}
              </p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FF5A1F]/10 text-[#FF5A1F]">
              <item.icon className="h-4 w-4" />
            </span>
          </Panel>
        ))}
      </div>

      <Panel className="p-4">
        <form className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Cari nama atau SKU produk..."
              className="dashboard-input pl-10"
            />
          </div>
          <select name="category" defaultValue={category} className="dashboard-input lg:w-44">
            <option value="">Semua kategori</option>
            {categoryRows.map((row) => (
              <option key={row.id} value={row.id}>{row.name}</option>
            ))}
          </select>
          <select name="stock" defaultValue={stockFilter || ''} className="dashboard-input lg:w-40">
            <option value="">Semua status</option>
            <option value="low">Stok menipis</option>
            <option value="out">Stok habis</option>
            <option value="archived">Diarsipkan</option>
          </select>
          <select name="sort" defaultValue={sort} className="dashboard-input lg:w-40">
            <option value="name">Nama A–Z</option>
            <option value="stock">Stok terendah</option>
            <option value="price">Harga tertinggi</option>
            <option value="margin">Margin tertinggi</option>
          </select>
          <button type="submit" className={buttonClass('secondary', 'md')}>Terapkan</button>
          <Link href="/dashboard/products" className={buttonClass('ghost', 'md')}>Reset</Link>
        </form>
      </Panel>

      <div className="space-y-3">
        <ProductManager
          products={products}
          categories={categoryRows}
          ingredients={ingredientRows.map((row) => ({
            id: row.id,
            name: row.name,
            unit: row.unit,
            cost: toNumber(row.unit_cost),
          }))}
          canManage={canManage}
        />
        {total > 0 ? (
          <div className="dashboard-card">
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} buildHref={buildHref} />
          </div>
        ) : null}
      </div>

      {!products.length && total === 0 && q ? (
        <EmptyState
          icon={<PackageSearch className="h-5 w-5" />}
          title="Produk tidak ditemukan"
          description="Ubah kata kunci atau filter untuk menemukan produk lain."
          action={<Link href="/dashboard/products" className={buttonClass('outline', 'sm')}>Hapus filter</Link>}
        />
      ) : null}
    </div>
  );
}
