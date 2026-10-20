import Link from 'next/link';
import {
  CalendarRange,
  Download,
  FileBarChart,
  ReceiptText,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { getDb } from '@/lib/db';
import { requirePageRole } from '@/lib/auth/session';
import { dateParam, eachDay, formatDayShort, makassarToday, resolvePeriod } from '@/lib/dates';
import { formatDate, formatDateTime, formatIDR, formatNumber, toNumber } from '@/lib/format';
import {
  getDailyTrend,
  getHourlySales,
  getPaymentBreakdown,
  getPeriodSummary,
  getProductPerformance,
  getStatusCounts,
} from '@/lib/services/analytics';
import { PageHeader } from '@/components/dashboard/page-header';
import { StatCard } from '@/components/dashboard/stat-card';
import { HourlyChart, PaymentDonut, SalesTrendChart } from '@/components/dashboard/charts';
import { PrintButton } from '@/components/dashboard/print-button';
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

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: { from?: string; to?: string };
}) {
  await requirePageRole(['OWNER'], '/dashboard/reports');
  const today = makassarToday();
  const from = dateParam(searchParams?.from, today);
  const to = dateParam(searchParams?.to, from);
  const resolved = resolvePeriod('custom', from, to);
  const { range } = resolved;
  const start = new Date(`${range.from}T00:00:00+08:00`);
  const end = new Date(`${range.to}T00:00:00+08:00`);
  end.setUTCDate(end.getUTCDate() + 1);
  const previousStart = new Date(`${range.previousFrom}T00:00:00+08:00`);
  const previousEnd = new Date(`${range.previousTo}T00:00:00+08:00`);
  previousEnd.setUTCDate(previousEnd.getUTCDate() + 1);
  const days = eachDay(range.from, range.to, 366);
  const db = await getDb();

  const [summary, previous, trend, products, payments, hourly, statusCounts, orders, settingsRows] =
    await Promise.all([
      getPeriodSummary(db, start, end),
      getPeriodSummary(db, previousStart, previousEnd),
      getDailyTrend(db, start, end, days, days.map(formatDayShort)),
      getProductPerformance(db, start, end),
      getPaymentBreakdown(db, start, end),
      getHourlySales(db, start, end),
      getStatusCounts(db, start, end),
      db.query<Record<string, unknown>>(
        `SELECT o.id, o.order_number, o.customer_name, o.status, o.payment_status,
                o.total, o.amount_paid, o.discount, o.created_at, o.channel,
                ch.name AS channel_name
         FROM orders o LEFT JOIN order_channels ch ON ch.code = o.channel
         WHERE o.created_at >= $1 AND o.created_at < $2
         ORDER BY o.created_at ASC LIMIT 200`,
        [start.toISOString(), end.toISOString()]
      ),
      db.query<{ daily_target: unknown; business_name: string }>(
        "SELECT daily_target, business_name FROM business_settings WHERE id = 'default'"
      ),
    ]);

  const dailyTarget = toNumber(settingsRows[0]?.daily_target);
  const periodTarget = dailyTarget * range.days;
  const targetProgress = periodTarget > 0 ? (summary.revenue / periodTarget) * 100 : 0;
  const paymentNames = new Map(payments.map((row) => [row.method, row.name || row.method]));
  const hourlyData = hourly.map((row) => ({
    label: `${String(row.hour).padStart(2, '0')}:00`,
    revenue: toNumber(row.revenue),
  }));
  const paymentData = payments.map((row) => ({
    name: row.name || row.method,
    amount: toNumber(row.amount),
  }));
  const isSingleDay = range.from === range.to;
  const delta = (current: number, old: number) => {
    if (old <= 0) return current > 0 ? 100 : 0;
    return ((current - old) / old) * 100;
  };
  const businessName = settingsRows[0]?.business_name || 'THIZ COFFEE';

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Reporting"
        title="LAPORAN PENJUALAN"
        description="Laporan dihitung ulang dari transaksi tersimpan. Batas hari mengikuti Asia/Makassar (WITA), bukan zona waktu server."
        actions={
          <>
            <PrintButton />
            <a
              href={`/api/export?type=report&from=${range.from}&to=${range.to}`}
              className={buttonClass('outline', 'md')}
            >
              <Download className="h-4 w-4" /> Ekspor CSV
            </a>
          </>
        }
      />

      <Panel className="p-4 print-hidden">
        <form className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div>
            <label className="dashboard-label" htmlFor="report-from">Dari tanggal</label>
            <input id="report-from" type="date" name="from" defaultValue={range.from} max={today} className="dashboard-input" required />
          </div>
          <div>
            <label className="dashboard-label" htmlFor="report-to">Sampai tanggal</label>
            <input id="report-to" type="date" name="to" defaultValue={range.to} max={today} className="dashboard-input" required />
          </div>
          <button type="submit" className={buttonClass('secondary', 'md')}>
            <CalendarRange className="h-4 w-4" /> Tampilkan
          </button>
          <Link href={`/dashboard/reports?from=${today}&to=${today}`} className={buttonClass('ghost', 'md')}>
            Hari ini
          </Link>
          <Link href={`/dashboard/reports?from=${range.previousFrom}&to=${range.previousTo}`} className={buttonClass('ghost', 'md')}>
            Periode sebelumnya
          </Link>
        </form>
      </Panel>

      <div className="print-area space-y-5">
        <div className="hidden print:block">
          <p className="font-display text-4xl tracking-[0.15em]">{businessName}</p>
          <p className="mt-1 text-sm font-semibold">Laporan Penjualan & Laba</p>
          <p className="text-xs text-gray-600">
            Periode {formatDate(`${range.from}T00:00:00+08:00`)} – {formatDate(`${range.to}T00:00:00+08:00`)} · Asia/Makassar
          </p>
          <p className="text-xs text-gray-600">Dicetak {formatDateTime(new Date())}</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FF5A1F]">
              {isSingleDay ? 'Laporan harian' : 'Laporan rentang'}
            </p>
            <p className="font-display text-2xl leading-none text-gray-900 dark:text-white">
              {formatDate(`${range.from}T00:00:00+08:00`)}
              {!isSingleDay ? ` — ${formatDate(`${range.to}T00:00:00+08:00`)}` : ''}
            </p>
            <p className="mt-1 text-[11px] text-gray-400">
              {formatNumber(range.days)} hari · dibandingkan {range.previousFrom} s.d. {range.previousTo}
            </p>
          </div>
          <Badge tone={targetProgress >= 100 ? 'green' : 'orange'}>
            Target {targetProgress.toFixed(0)}%
          </Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Omzet"
            value={formatIDR(summary.revenue)}
            hint={`${formatNumber(summary.orders)} transaksi · ${formatNumber(summary.units)} unit`}
            delta={delta(summary.revenue, previous.revenue)}
            icon={<TrendingUp className="h-4 w-4" />}
            emphasis
          />
          <StatCard
            label="Laba kotor"
            value={formatIDR(summary.grossProfit)}
            hint={`HPP ${formatIDR(summary.cogs)}`}
            delta={delta(summary.grossProfit, previous.grossProfit)}
            icon={<FileBarChart className="h-4 w-4" />}
          />
          <StatCard
            label="Laba bersih"
            value={formatIDR(summary.netProfit)}
            hint={`Biaya ops ${formatIDR(summary.operatingExpenses, true)} + pemasukan lain`}
            delta={delta(summary.netProfit, previous.netProfit)}
            icon={<Wallet className="h-4 w-4" />}
          />
          <StatCard
            label="Pembayaran diterima"
            value={formatIDR(summary.paymentsReceived)}
            hint={`Piutang ${formatIDR(summary.receivables, true)}`}
            delta={delta(summary.paymentsReceived, previous.paymentsReceived)}
            icon={<ReceiptText className="h-4 w-4" />}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Diskon diberikan', value: summary.discounts },
            { label: 'Refund penjualan', value: summary.refunds },
            { label: 'Kas masuk', value: summary.cashIn },
            { label: 'Kas keluar', value: summary.cashOut },
          ].map((item) => (
            <Panel key={item.label} className="px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">{item.label}</p>
              <p className="mt-1 font-bold tabular-nums text-gray-900 dark:text-white">{formatIDR(item.value)}</p>
            </Panel>
          ))}
        </div>

        <Panel className="p-5 print-card">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SectionTitle title="RINGKASAN PEMILIK" description="Narasi singkat dari angka di atas." />
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-gray-400">Target periode</p>
              <p className="text-sm font-bold">{formatIDR(periodTarget)}</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
            {isSingleDay ? 'Pada periode ini' : `Selama ${range.days} hari`}, tercatat{' '}
            <strong>{formatNumber(summary.orders)} transaksi non-batal</strong> dengan omzet{' '}
            <strong>{formatIDR(summary.revenue)}</strong> dari {formatNumber(summary.units)} unit
            terjual. HPP barang terjual {formatIDR(summary.cogs)}, sehingga laba kotor{' '}
            <strong>{formatIDR(summary.grossProfit)}</strong>. Setelah biaya operasional{' '}
            {formatIDR(summary.operatingExpenses)} dan pemasukan lain {formatIDR(summary.otherIncome)},
            estimasi laba bersih <strong>{formatIDR(summary.netProfit)}</strong>. Kas aktual yang
            diterima {formatIDR(summary.paymentsReceived)}, sementara piutang tercatat{' '}
            {formatIDR(summary.receivables)} dan belum dihitung sebagai kas.
          </p>
          <div className="mt-4">
            <div className="flex justify-between text-[10px] text-gray-400">
              <span>Pencapaian target</span>
              <span>{formatNumber(summary.revenue)} / {formatNumber(periodTarget)}</span>
            </div>
            <ProgressBar value={targetProgress} className="mt-1.5" />
          </div>
        </Panel>

        <div className="grid gap-5 xl:grid-cols-3">
          <Panel className="p-5 xl:col-span-2 print-card">
            <SectionTitle title="TREN OMZET" description={isSingleDay ? '14 hari terakhir hingga tanggal laporan.' : 'Omzet per hari pada rentang laporan.'} />
            <div className="mt-5">
              <SalesTrendChart data={trend} />
            </div>
          </Panel>
          <Panel className="p-5 print-card">
            <SectionTitle title="METODE PEMBAYARAN" description="Pembayaran aktual pada periode." />
            <PaymentDonut data={paymentData} />
            <div className="space-y-1.5">
              {payments.map((row) => (
                <div key={row.method} className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">{row.name || row.method}</span>
                  <span className="font-semibold tabular-nums">{formatIDR(row.amount)}</span>
                </div>
              ))}
              {!payments.length ? <p className="text-center text-xs text-gray-400">Belum ada pembayaran.</p> : null}
            </div>
          </Panel>
        </div>

        <div className="grid gap-5 xl:grid-cols-3">
          <Panel className="p-5 xl:col-span-2 print-card">
            <SectionTitle title="PENJUALAN PER JAM" description="Distribusi omzet berdasarkan jam transaksi WITA." />
            <div className="mt-4">
              <HourlyChart data={hourlyData} />
            </div>
          </Panel>
          <Panel className="p-5 print-card">
            <SectionTitle title="STATUS PESANAN" description="Termasuk pesanan batal." />
            <div className="mt-4 space-y-2">
              {['NEW', 'PROCESSING', 'READY', 'COMPLETED', 'CANCELLED'].map((key) => (
                <div key={key} className="flex items-center justify-between rounded-lg bg-[#FAFAF8] px-3 py-2 dark:bg-white/[0.03]">
                  <Badge tone={statusMeta[key]?.tone || 'neutral'}>{statusMeta[key]?.label || key}</Badge>
                  <span className="text-sm font-bold tabular-nums">{formatNumber(statusCounts[key] || 0)}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <Panel className="print-card overflow-hidden">
            <div className="p-5">
              <SectionTitle title="PRODUK TERLARIS" description="Unit dan kontribusi omzet." />
            </div>
            <div className="overflow-x-auto">
              <table className="dashboard-table min-w-[440px]">
                <thead>
                  <tr>
                    <th>Produk</th>
                    <th className="text-right">Unit</th>
                    <th className="text-right">Omzet</th>
                    <th className="text-right">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((row) => (
                    <tr key={`${row.product_id}-${row.sku}`}>
                      <td>
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">{row.name}</p>
                        <p className="text-[10px] text-gray-400">{row.sku}</p>
                      </td>
                      <td className="text-right tabular-nums">{formatNumber(row.quantity)}</td>
                      <td className="text-right tabular-nums">{formatIDR(row.revenue)}</td>
                      <td className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">{formatIDR(row.margin)}</td>
                    </tr>
                  ))}
                  {!products.length ? (
                    <tr><td colSpan={4} className="py-8 text-center text-xs text-gray-400">Belum ada produk terjual.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel className="overflow-hidden print-card">
            <div className="p-5">
              <SectionTitle title="DETAIL TRANSAKSI" description={`${formatNumber(orders.length)} transaksi tercatat.`} />
            </div>
            <div className="max-h-[430px] overflow-auto">
              <table className="dashboard-table min-w-[520px]">
                <thead>
                  <tr>
                    <th>Transaksi</th>
                    <th>Status</th>
                    <th className="text-right">Total</th>
                    <th className="text-right">Dibayar</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((row) => (
                    <tr key={String(row.id)}>
                      <td>
                        <Link
                          href={`/dashboard/orders/${String(row.id)}`}
                          className="text-xs font-semibold text-gray-800 hover:text-[#FF5A1F] dark:text-gray-100"
                        >
                          {String(row.order_number)}
                        </Link>
                        <p className="text-[10px] text-gray-400">
                          {formatDateTime(String(row.created_at))} · {String(row.customer_name)}
                        </p>
                      </td>
                      <td>
                        <Badge tone={statusMeta[String(row.status)]?.tone || 'neutral'}>
                          {statusMeta[String(row.status)]?.label || String(row.status)}
                        </Badge>
                      </td>
                      <td className="text-right text-xs tabular-nums">{formatIDR(row.total)}</td>
                      <td className="text-right text-xs tabular-nums text-emerald-600 dark:text-emerald-400">{formatIDR(row.amount_paid)}</td>
                    </tr>
                  ))}
                  {!orders.length ? (
                    <tr><td colSpan={4} className="py-10 text-center text-xs text-gray-400">Tidak ada transaksi pada periode ini.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        <p className="rounded-xl border border-dashed border-black/10 px-4 py-3 text-[10px] leading-relaxed text-gray-400 dark:border-white/10 print-card">
          Metode: omzet = total pesanan non-batal, termasuk ongkir. HPP memakai snapshot biaya item
          saat transaksi. Laba kotor = omzet − HPP. Laba bersih = laba kotor − biaya operasional +
          pemasukan lain. Pembelian persediaan dan refund memengaruhi kas; refund tidak mengurangi
          laba karena pesanan batal sudah dikeluarkan dari omzet.
        </p>
      </div>
    </div>
  );
}
