import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  PackageX,
  ReceiptText,
  ShoppingBag,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import {
  getCumulativeCash,
  getDailyTrend,
  getPaymentBreakdown,
  getPeriodSummary,
  getProductPerformance,
} from '@/lib/services/analytics';
import { resolvePeriod, eachDay, formatDayShort, growthPercent } from '@/lib/dates';
import { formatDateTime, formatIDR, formatNumber, toNumber } from '@/lib/format';
import { PageHeader } from '@/components/dashboard/page-header';
import { PeriodTabs } from '@/components/dashboard/period-tabs';
import { StatCard } from '@/components/dashboard/stat-card';
import { SalesTrendChart, PaymentDonut } from '@/components/dashboard/charts';
import {
  Badge,
  buttonClass,
  EmptyState,
  Panel,
  ProgressBar,
  SectionTitle,
  statusMeta,
} from '@/components/dashboard/ui';

export const dynamic = 'force-dynamic';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { period?: string; from?: string; to?: string; denied?: string };
}) {
  const user = await getCurrentUser();
  const resolved = resolvePeriod(searchParams?.period, searchParams?.from, searchParams?.to);
  const { range } = resolved;
  const db = await getDb();
  const start = new Date(`${range.from}T00:00:00+08:00`);
  const end = new Date(`${range.to}T00:00:00+08:00`);
  end.setUTCDate(end.getUTCDate() + 1);
  const previousStart = new Date(`${range.previousFrom}T00:00:00+08:00`);
  const previousEnd = new Date(`${range.previousTo}T00:00:00+08:00`);
  previousEnd.setUTCDate(previousEnd.getUTCDate() + 1);

  const days = eachDay(range.from, range.to);
  const [summary, previous, trend, products, paymentRows, lowProducts, lowIngredients, pending, recentFinance, recentStock, cashBalance, settingsRows] =
    await Promise.all([
      getPeriodSummary(db, start, end),
      getPeriodSummary(db, previousStart, previousEnd),
      getDailyTrend(
        db,
        start,
        end,
        days,
        days.map((day) => formatDayShort(day))
      ),
      getProductPerformance(db, start, end),
      getPaymentBreakdown(db, start, end),
      db.query<{ id: string; name: string; stock: unknown; min_stock: unknown; sku: string }>(
        `SELECT id, name, stock, min_stock, sku FROM products
         WHERE active = TRUE AND stock <= min_stock ORDER BY stock ASC LIMIT 5`
      ),
      db.query<{ id: string; name: string; stock: unknown; min_stock: unknown; unit: string; sku: string }>(
        `SELECT id, name, stock, min_stock, unit, sku FROM ingredients
         WHERE active = TRUE AND stock <= min_stock ORDER BY (stock / NULLIF(min_stock, 0)) ASC LIMIT 5`
      ),
      db.query<{
        id: string;
        order_number: string;
        customer_name: string;
        status: string;
        payment_status: string;
        total: unknown;
        created_at: string;
      }>(
        `SELECT id, order_number, customer_name, status, payment_status, total, created_at
         FROM orders WHERE status IN ('NEW', 'PROCESSING', 'READY')
         ORDER BY created_at ASC LIMIT 6`
      ),
      db.query<{
        id: string;
        type: string;
        amount: unknown;
        occurred_at: string;
        description: string;
        category_name: string;
      }>(
        `SELECT f.id, f.type, f.amount, f.occurred_at, f.description, c.name AS category_name
         FROM financial_entries f JOIN financial_categories c ON c.id = f.category_id
         WHERE f.is_voided = FALSE ORDER BY f.occurred_at DESC LIMIT 7`
      ),
      db.query<{
        id: string;
        type: string;
        quantity: unknown;
        created_at: string;
        reason: string;
        item_name: string;
      }>(
        `SELECT m.id, m.type, m.quantity, m.created_at, m.reason,
                COALESCE(p.name, i.name) AS item_name
         FROM stock_movements m
         LEFT JOIN products p ON p.id = m.product_id
         LEFT JOIN ingredients i ON i.id = m.ingredient_id
         ORDER BY m.created_at DESC LIMIT 7`
      ),
      getCumulativeCash(db, end),
      db.query<{ business_name: string; daily_target: unknown }>(
        `SELECT business_name, daily_target FROM business_settings WHERE id = 'default'`
      ),
    ]);

  const dailyTarget = toNumber(settingsRows[0]?.daily_target);
  const periodTarget = dailyTarget * range.days;
  const targetProgress = periodTarget > 0 ? (summary.revenue / periodTarget) * 100 : 0;
  const paymentData = paymentRows.map((row) => ({
    name: row.name || row.method,
    amount: toNumber(row.amount),
  }));
  const topProducts = products.slice(0, 5);
  const lowStockCount = lowProducts.length + lowIngredients.length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Command center"
        title={`HALO, ${user?.name?.split(' ')[0]?.toUpperCase() || 'TIM THIZ'}`}
        description="Ringkasan operasional THIZ COFFEE. Omzet, laba, kas, dan stok dihitung dari transaksi yang tersimpan."
        actions={
          <>
            <Link href="/dashboard/sales?new=1" className={buttonClass('primary', 'md')}>
              <ShoppingBag className="h-4 w-4" /> Catat penjualan
            </Link>
            <Link href="/dashboard/reports" className={buttonClass('outline', 'md')}>
              <CalendarDays className="h-4 w-4" /> Laporan harian
            </Link>
          </>
        }
      />

      {searchParams?.denied === '1' ? (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Peran akun Anda tidak memiliki akses ke halaman tersebut.
        </div>
      ) : null}

      <div className="flex flex-col gap-3 rounded-2xl border border-black/[0.06] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-white/[0.07] dark:bg-[#141414]">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <CalendarDays className="h-4 w-4 text-[#FF5A1F]" />
          {resolved.label} · {range.from} s.d. {range.to} (Asia/Makassar)
          {summary.orders > 0 ? (
            <span className="hidden text-gray-400 sm:inline">
              · dibandingkan {range.previousFrom}–{range.previousTo}
            </span>
          ) : null}
        </div>
        <PeriodTabs basePath="/dashboard" period={resolved.period} from={range.from} to={range.to} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Omzet bersih"
          value={formatIDR(summary.revenue)}
          hint={`${formatNumber(summary.orders)} pesanan · rata-rata ${formatIDR(summary.averageOrder, true)}`}
          delta={growthPercent(summary.revenue, previous.revenue)}
          icon={<TrendingUp className="h-4 w-4" />}
          emphasis
        />
        <StatCard
          label="Laba bersih"
          value={formatIDR(summary.netProfit)}
          hint="Laba kotor − biaya operasional + pemasukan lain"
          delta={growthPercent(summary.netProfit, previous.netProfit)}
          icon={<CircleDollarSign className="h-4 w-4" />}
        />
        <StatCard
          label="Kas bersih periode"
          value={formatIDR(summary.netCash)}
          hint={`Masuk ${formatIDR(summary.cashIn, true)} · keluar ${formatIDR(summary.cashOut, true)}`}
          delta={growthPercent(summary.netCash, previous.netCash)}
          icon={<Wallet className="h-4 w-4" />}
        />
        <StatCard
          label="Pesanan"
          value={formatNumber(summary.orders)}
          hint={`${formatNumber(summary.units)} unit terjual · ${formatNumber(pending.length)} perlu diproses`}
          delta={growthPercent(summary.orders, previous.orders)}
          icon={<ReceiptText className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Laba kotor', value: summary.grossProfit, note: `HPP ${formatIDR(summary.cogs, true)}` },
          { label: 'Biaya operasional', value: summary.operatingExpenses, note: 'Tanpa pembelian persediaan' },
          { label: 'Piutang penjualan', value: summary.receivables, note: 'Belum diterima sebagai kas' },
          { label: 'Saldo kas kumulatif', value: cashBalance, note: 'Hingga akhir periode' },
        ].map((item) => (
          <div key={item.label} className="dashboard-card px-4 py-3.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 dark:text-gray-500">
              {item.label}
            </p>
            <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-lg font-bold tabular-nums text-gray-900 dark:text-white">
                {formatIDR(item.value)}
              </p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">{item.note}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Panel className="p-5 xl:col-span-2">
          <SectionTitle
            title="TREN PENJUALAN"
            description="Omzet dan jumlah pesanan per hari dalam zona waktu Asia/Makassar."
            action={
              <Link href="/dashboard/reports" className={buttonClass('ghost', 'sm')}>
                Detail <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <div className="mt-5">
            <SalesTrendChart data={trend} />
          </div>
        </Panel>

        <Panel className="p-5">
          <SectionTitle title="TARGET & METODE" description="Pencapaian target dan komposisi pembayaran." />
          <div className="mt-5 rounded-xl bg-[#0A0A0A] p-4 text-white">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">
                Target periode
              </p>
              <Badge tone={targetProgress >= 100 ? 'green' : 'orange'}>
                {targetProgress.toFixed(0)}%
              </Badge>
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums">{formatIDR(summary.revenue)}</p>
            <p className="text-[10px] text-gray-500">
              dari target {formatIDR(periodTarget)} ({range.days} hari)
            </p>
            <ProgressBar value={targetProgress} className="mt-4 bg-white/10" />
            <p className="mt-2 text-[10px] text-gray-500">
              {targetProgress >= 100
                ? 'Target periode tercapai.'
                : `Kurang ${formatIDR(Math.max(0, periodTarget - summary.revenue))} lagi.`}
            </p>
          </div>
          <div className="mt-3">
            <PaymentDonut data={paymentData} />
          </div>
          <div className="space-y-1.5">
            {paymentData.slice(0, 4).map((item, index) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: ['#FF5A1F', '#0A0A0A', '#F59E0B', '#3B82F6'][index] }}
                  />
                  {item.name}
                </span>
                <span className="font-semibold tabular-nums text-gray-800 dark:text-gray-200">
                  {formatIDR(item.amount, true)}
                </span>
              </div>
            ))}
            {!paymentData.length ? (
              <p className="text-center text-xs text-gray-400">Belum ada pembayaran.</p>
            ) : null}
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel>
          <div className="p-5">
            <SectionTitle
              title="PRODUK TERLARIS"
              description="Berdasarkan unit terjual pada periode terpilih."
              action={
                <Link href="/dashboard/products" className={buttonClass('ghost', 'sm')}>
                  Produk <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              }
            />
          </div>
          {topProducts.length ? (
            <div className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
              {topProducts.map((product, index) => {
                const max = Math.max(...topProducts.map((item) => toNumber(item.quantity)), 1);
                return (
                  <div key={`${product.product_id}-${product.sku}`} className="flex items-center gap-3 px-5 py-3">
                    <span className="w-5 text-center text-[10px] font-bold text-gray-300 dark:text-gray-600">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-semibold text-gray-800 dark:text-gray-100">
                          {product.name}
                        </p>
                        <p className="shrink-0 text-xs font-bold tabular-nums text-gray-900 dark:text-white">
                          {formatNumber(product.quantity)} unit
                        </p>
                      </div>
                      <ProgressBar
                        value={(toNumber(product.quantity) / max) * 100}
                        className="mt-2"
                      />
                    </div>
                    <span className="hidden w-20 text-right text-[10px] tabular-nums text-gray-400 sm:block">
                      {formatIDR(product.revenue, true)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={<ShoppingBag className="h-5 w-5" />}
              title="Belum ada penjualan"
              description="Catat penjualan pertama pada periode ini untuk melihat produk terlaris."
            />
          )}
        </Panel>

        <Panel>
          <div className="p-5">
            <SectionTitle
              title="PERLU DIPROSES"
              description="Pesanan aktif yang belum selesai atau dibatalkan."
              action={
                <Link href="/dashboard/orders" className={buttonClass('ghost', 'sm')}>
                  Semua pesanan <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              }
            />
          </div>
          {pending.length ? (
            <div className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
              {pending.map((order) => (
                <Link
                  key={order.id}
                  href={`/dashboard/orders/${order.id}`}
                  className="flex items-center gap-3 px-5 py-3 transition hover:bg-[#FFF8F4] dark:hover:bg-white/[0.025]"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FF5A1F]/10 text-[#FF5A1F]">
                    <ClipboardList className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-gray-800 dark:text-gray-100">
                      {order.order_number}
                    </p>
                    <p className="truncate text-[10px] text-gray-400">
                      {order.customer_name} · {formatDateTime(order.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold tabular-nums text-gray-900 dark:text-white">
                      {formatIDR(order.total, true)}
                    </p>
                    <Badge tone={statusMeta[order.status]?.tone || 'neutral'}>
                      {statusMeta[order.status]?.label || order.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<ClipboardList className="h-5 w-5" />}
              title="Semua pesanan terkendali"
              description="Tidak ada pesanan aktif yang menunggu diproses."
            />
          )}
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <div className="p-5">
            <SectionTitle
              title="TRANSAKSI KEUANGAN TERBARU"
              description="Pemasukan dan pengeluaran aktual, termasuk pembelian persediaan."
              action={
                <Link href="/dashboard/finance" className={buttonClass('ghost', 'sm')}>
                  Keuangan <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              }
            />
          </div>
          <div className="overflow-x-auto">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Keterangan</th>
                  <th>Kategori</th>
                  <th>Tanggal</th>
                  <th className="text-right">Nominal</th>
                </tr>
              </thead>
              <tbody>
                {recentFinance.map((entry) => (
                  <tr key={entry.id}>
                    <td className="max-w-[280px]">
                      <p className="truncate font-medium text-gray-800 dark:text-gray-100">
                        {entry.description}
                      </p>
                    </td>
                    <td className="text-xs">{entry.category_name}</td>
                    <td className="whitespace-nowrap text-xs">{formatDateTime(entry.occurred_at)}</td>
                    <td
                      className={`whitespace-nowrap text-right font-bold tabular-nums ${
                        entry.type === 'INCOME'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {entry.type === 'INCOME' ? '+' : '−'} {formatIDR(entry.amount)}
                    </td>
                  </tr>
                ))}
                {!recentFinance.length ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-xs text-gray-400">
                      Belum ada transaksi keuangan.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel className="p-5">
            <SectionTitle
              title="STOK MENIPIS"
              description={`${lowStockCount} item perlu perhatian.`}
              action={
                <Link href="/dashboard/inventory" className={buttonClass('ghost', 'sm')}>
                  <PackageX className="h-3.5 w-3.5" />
                </Link>
              }
            />
            <div className="mt-4 space-y-2.5">
              {[...lowProducts, ...lowIngredients].slice(0, 6).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-amber-200/70 bg-amber-50/60 px-3 py-2.5 dark:border-amber-500/20 dark:bg-amber-500/[0.07]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-gray-800 dark:text-gray-100">
                      {item.name}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      Min. {formatNumber(item.min_stock)}{' '}
                      {String((item as { unit?: string }).unit || 'unit')}
                    </p>
                  </div>
                  <Badge tone={toNumber(item.stock) <= 0 ? 'red' : 'yellow'}>
                    {formatNumber(item.stock)} sisa
                  </Badge>
                </div>
              ))}
              {!lowStockCount ? (
                <p className="rounded-xl bg-emerald-50 px-3 py-4 text-center text-xs text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                  Semua stok di atas batas minimum.
                </p>
              ) : null}
            </div>
          </Panel>

          <Panel className="p-5">
            <SectionTitle title="AKTIVITAS STOK" description="Mutasi inventaris paling baru." />
            <div className="mt-4 space-y-3">
              {recentStock.map((movement) => (
                <div key={movement.id} className="flex items-start gap-2.5">
                  <span
                    className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold ${
                      toNumber(movement.quantity) >= 0
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                        : 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
                    }`}
                  >
                    {toNumber(movement.quantity) >= 0 ? '+' : '−'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-gray-800 dark:text-gray-100">
                      {movement.item_name}
                    </p>
                    <p className="truncate text-[10px] text-gray-400">
                      {movement.type} · {formatDateTime(movement.created_at)}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold tabular-nums text-gray-500">
                    {formatNumber(Math.abs(toNumber(movement.quantity)))} unit
                  </span>
                </div>
              ))}
              {!recentStock.length ? (
                <p className="text-center text-xs text-gray-400">Belum ada pergerakan stok.</p>
              ) : null}
            </div>
          </Panel>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-black/10 bg-white/50 px-4 py-3 text-[11px] text-gray-500 dark:border-white/10 dark:bg-white/[0.02] dark:text-gray-400">
        <Banknote className="h-4 w-4 text-[#FF5A1F]" />
        <span>
          <strong className="text-gray-700 dark:text-gray-200">Aturan hitung:</strong> omzet dari
          pesanan non-batal; HPP dari snapshot biaya item; laba bersih = omzet − HPP − biaya
          operasional + pemasukan lain. Pembelian persediaan memengaruhi kas, bukan biaya penuh.
        </span>
      </div>
    </div>
  );
}
