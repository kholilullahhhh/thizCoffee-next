import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  ReceiptText,
  UserRound,
} from 'lucide-react';
import { getDb } from '@/lib/db';
import { requirePageRole } from '@/lib/auth/session';
import { formatDate, formatDateTime, formatIDR, formatNumber, toNumber } from '@/lib/format';
import { PageHeader } from '@/components/dashboard/page-header';
import { Badge, buttonClass, Panel, SectionTitle, statusMeta } from '@/components/dashboard/ui';
import { OrderActions } from '@/components/dashboard/orders/order-actions';

export const dynamic = 'force-dynamic';

const statusSteps = [
  { key: 'NEW', label: 'Baru' },
  { key: 'PROCESSING', label: 'Diproses' },
  { key: 'READY', label: 'Siap' },
  { key: 'COMPLETED', label: 'Selesai' },
];

export default async function OrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requirePageRole(['OWNER', 'STAFF'], '/dashboard/orders');
  const db = await getDb();

  const orderRows = await db.query<Record<string, unknown>>(
    `SELECT o.*, ch.name AS channel_name, u.name AS creator_name,
            c.email AS customer_email, c.address AS customer_address,
            c.notes AS customer_notes
     FROM orders o
     LEFT JOIN order_channels ch ON ch.code = o.channel
     LEFT JOIN users u ON u.id = o.created_by
     LEFT JOIN customers c ON c.id = o.customer_id
     WHERE o.id = $1`,
    [params.id]
  );
  const order = orderRows[0];
  if (!order) notFound();

  const [itemRows, paymentRows, auditRows, methodRows, settingsRows] = await Promise.all([
    db.query<Record<string, unknown>>(
      `SELECT * FROM order_items WHERE order_id = $1 ORDER BY product_name`,
      [params.id]
    ),
    db.query<Record<string, unknown>>(
      `SELECT * FROM payments WHERE order_id = $1 ORDER BY paid_at ASC`,
      [params.id]
    ),
    db.query<Record<string, unknown>>(
      `SELECT a.*, u.name AS actor_name FROM audit_logs a
       LEFT JOIN users u ON u.id = a.actor_id
       WHERE a.entity_type = 'ORDER' AND a.entity_id = $1
       ORDER BY a.created_at DESC`,
      [params.id]
    ),
    db.query<{ code: string; name: string }>(
      'SELECT code, name FROM payment_methods WHERE active = TRUE ORDER BY sort_order'
    ),
    db.query<{ business_name: string; phone: string; email: string; address: string; receipt_note: string }>(
      "SELECT business_name, phone, email, address, receipt_note FROM business_settings WHERE id = 'default'"
    ),
  ]);

  const items = itemRows.map((row) => ({
    id: String(row.id),
    name: String(row.product_name),
    sku: String(row.sku),
    quantity: toNumber(row.quantity),
    price: toNumber(row.unit_price),
    cost: toNumber(row.unit_cost),
    lineTotal: toNumber(row.line_total),
  }));
  const payments = paymentRows.map((row) => ({
    id: String(row.id),
    amount: toNumber(row.amount),
    method: String(row.method),
    reference: row.reference ? String(row.reference) : null,
    notes: row.notes ? String(row.notes) : null,
    paidAt: String(row.paid_at),
    methodName: methodRows.find((method) => method.code === String(row.method))?.name,
  }));
  const settings = settingsRows[0];
  const status = String(order.status);
  const total = toNumber(order.total);
  const paid = toNumber(order.amount_paid);
  const remaining = Math.max(0, total - paid);
  const cogs = items.reduce((sum, item) => sum + item.cost * item.quantity, 0);
  const stepIndex = statusSteps.findIndex((step) => step.key === status);
  const isCancelled = status === 'CANCELLED';

  return (
    <div className="space-y-5">
      <div className="print-hidden">
        <Link
          href="/dashboard/orders"
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 transition hover:text-[#FF5A1F] dark:text-gray-400"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke pesanan
        </Link>
        <PageHeader
          eyebrow="Detail transaksi"
          title={String(order.order_number)}
          description={`${formatDateTime(String(order.created_at))} WITA · ${String(order.customer_name)}`}
          actions={
            <OrderActions
              order={{
                id: String(order.id),
                orderNumber: String(order.order_number),
                status,
                paymentStatus: String(order.payment_status),
                total,
                amountPaid: paid,
                customerName: String(order.customer_name),
                customerPhone: order.customer_phone ? String(order.customer_phone) : null,
                createdAt: String(order.created_at),
                items: items.map((item) => ({
                  name: item.name,
                  quantity: item.quantity,
                  price: item.price,
                })),
              }}
              methods={methodRows}
            />
          }
        />
      </div>

      {isCancelled ? (
        <div className="print-hidden rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-500/25 dark:bg-red-500/10">
          <p className="flex items-center gap-2 text-sm font-bold text-red-700 dark:text-red-300">
            <Clock3 className="h-4 w-4" /> Pesanan dibatalkan
          </p>
          <p className="mt-1 text-xs text-red-600 dark:text-red-300/80">
            {order.cancel_reason ? String(order.cancel_reason) : 'Tanpa alasan tercatat.'}
            {' '}Stok sudah dikembalikan dan refund tercatat bila ada pembayaran.
          </p>
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-5">
          <Panel className="print-card overflow-hidden print:border-0">
            <div className="border-b border-black/[0.07] p-5 sm:p-7 dark:border-white/10">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-display text-3xl leading-none tracking-[0.14em] text-[#0A0A0A] dark:text-white">
                    THIZ COFFEE
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-gray-400">
                    {settings?.business_name || 'THIZ COFFEE'} · Makassar
                  </p>
                  <p className="mt-2 text-[10px] text-gray-400">
                    {settings?.phone} · {settings?.email}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">Struk / invoice</p>
                  <p className="mt-1 text-sm font-bold text-gray-900 dark:text-white">{String(order.order_number)}</p>
                  <p className="text-[10px] text-gray-400">{formatDateTime(String(order.created_at))} WITA</p>
                  <div className="mt-2 flex justify-end gap-1">
                    <Badge tone={statusMeta[status]?.tone || 'neutral'}>
                      {statusMeta[status]?.label || status}
                    </Badge>
                    <Badge tone={statusMeta[String(order.payment_status)]?.tone || 'neutral'}>
                      {statusMeta[String(order.payment_status)]?.label || String(order.payment_status)}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 border-b border-black/[0.06] p-5 sm:grid-cols-2 sm:p-7 dark:border-white/[0.06]">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">Ditagihkan kepada</p>
                <p className="mt-1.5 text-sm font-bold text-gray-900 dark:text-white">{String(order.customer_name)}</p>
                {order.customer_phone ? (
                  <p className="text-xs text-gray-500 dark:text-gray-400">{String(order.customer_phone)}</p>
                ) : null}
                {order.customer_address ? (
                  <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                    {String(order.customer_address)}
                  </p>
                ) : null}
              </div>
              <div className="sm:text-right">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">Kanal pesanan</p>
                <p className="mt-1.5 text-sm font-semibold text-gray-800 dark:text-gray-100">
                  {order.channel_name ? String(order.channel_name) : String(order.channel)}
                </p>
                <p className="text-[10px] text-gray-400">Dibuat oleh {order.creator_name ? String(order.creator_name) : '-'}</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-black/[0.06] bg-[#FAFAF8] dark:border-white/[0.06] dark:bg-white/[0.02]">
                    <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">Produk</th>
                    <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400">Qty</th>
                    <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400">Harga</th>
                    {user.role === 'OWNER' ? (
                      <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400">HPP</th>
                    ) : null}
                    <th className="px-5 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-black/[0.04] last:border-0 dark:border-white/[0.04]">
                      <td className="px-5 py-3.5">
                        <p className="text-xs font-semibold text-gray-900 dark:text-white">{item.name}</p>
                        <p className="text-[10px] text-gray-400">{item.sku}</p>
                      </td>
                      <td className="px-3 py-3.5 text-right text-xs tabular-nums">{item.quantity}</td>
                      <td className="px-3 py-3.5 text-right text-xs tabular-nums">{formatIDR(item.price)}</td>
                      {user.role === 'OWNER' ? (
                        <td className="px-3 py-3.5 text-right text-xs tabular-nums text-gray-400">{formatIDR(item.cost)}</td>
                      ) : null}
                      <td className="px-5 py-3.5 text-right text-xs font-semibold tabular-nums text-gray-900 dark:text-white">
                        {formatIDR(item.lineTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end border-t border-black/[0.06] p-5 sm:p-7 dark:border-white/[0.06]">
              <div className="w-full max-w-xs space-y-2 text-xs">
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Subtotal</span><span className="tabular-nums">{formatIDR(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Diskon</span><span className="tabular-nums">− {formatIDR(order.discount)}</span>
                </div>
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Biaya pengiriman</span><span className="tabular-nums">+ {formatIDR(order.delivery_fee)}</span>
                </div>
                <div className="flex justify-between border-t border-black/10 pt-2.5 text-sm font-extrabold text-gray-900 dark:border-white/10 dark:text-white">
                  <span>Total</span><span className="tabular-nums">{formatIDR(total)}</span>
                </div>
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Dibayar</span><span className="font-semibold tabular-nums">{formatIDR(paid)}</span>
                </div>
                <div className="flex justify-between text-amber-600 dark:text-amber-400">
                  <span>Sisa tagihan</span><span className="font-semibold tabular-nums">{formatIDR(remaining)}</span>
                </div>
                {toNumber(order.refunded_amount) > 0 ? (
                  <div className="flex justify-between text-violet-600 dark:text-violet-300">
                    <span>Direfund</span><span className="font-semibold tabular-nums">{formatIDR(order.refunded_amount)}</span>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="border-t border-black/[0.06] px-5 py-4 text-center text-[10px] leading-relaxed text-gray-400 sm:px-7 dark:border-white/[0.06]">
              {settings?.receipt_note || 'Terima kasih sudah ngopi bareng Thiz Coffee!'}
              <p className="mt-1">{settings?.address}</p>
            </div>
          </Panel>

          {order.notes ? (
            <Panel className="p-5">
              <SectionTitle title="CATATAN PESANAN" />
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                {String(order.notes)}
              </p>
            </Panel>
          ) : null}

          <Panel className="print-hidden">
            <div className="p-5">
              <SectionTitle title="RIWAYAT PEMBAYARAN" description="Setiap baris adalah kas yang benar-benar diterima." />
            </div>
            <div className="overflow-x-auto">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Metode</th>
                    <th>Referensi</th>
                    <th className="text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="whitespace-nowrap text-xs">{formatDateTime(payment.paidAt)}</td>
                      <td className="text-xs">{payment.methodName || payment.method}</td>
                      <td className="text-xs text-gray-400">{payment.reference || '-'}</td>
                      <td className="text-right font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                        {formatIDR(payment.amount)}
                      </td>
                    </tr>
                  ))}
                  {!payments.length ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-xs text-gray-400">
                        Belum ada pembayaran tercatat.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        <div className="space-y-5 print-hidden">
          <Panel className="p-5">
            <SectionTitle title="STATUS PESANAN" description="Alur pemenuhan pesanan." />
            <div className="mt-5 space-y-1">
              {statusSteps.map((step, index) => {
                const complete = !isCancelled && stepIndex >= index;
                const current = !isCancelled && stepIndex === index;
                return (
                  <div key={step.key} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold ${
                          complete
                            ? 'bg-[#FF5A1F] text-white'
                            : 'bg-gray-100 text-gray-400 dark:bg-white/10 dark:text-gray-500'
                        }`}
                      >
                        {complete ? <CheckCircle2 className="h-3.5 w-3.5" /> : index + 1}
                      </span>
                      {index < statusSteps.length - 1 ? (
                        <span className={`h-8 w-px ${stepIndex > index && !isCancelled ? 'bg-[#FF5A1F]' : 'bg-black/10 dark:bg-white/10'}`} />
                      ) : null}
                    </div>
                    <div className="pb-2">
                      <p className={`text-xs font-semibold ${current ? 'text-[#FF5A1F]' : complete ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                        {step.label}
                      </p>
                      {current ? <p className="text-[10px] text-gray-400">Status saat ini</p> : null}
                    </div>
                  </div>
                );
              })}
            </div>
            {isCancelled ? (
              <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:bg-red-500/10 dark:text-red-300">
                Dibatalkan · {formatDateTime(order.cancelled_at ? String(order.cancelled_at) : null)}
              </div>
            ) : null}
          </Panel>

          <Panel className="p-5">
            <SectionTitle title="PELANGGAN" />
            <div className="mt-4 space-y-3 text-xs">
              <p className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                <UserRound className="h-3.5 w-3.5 text-gray-400" /> {String(order.customer_name)}
              </p>
              {order.customer_phone ? (
                <p className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <Phone className="h-3.5 w-3.5 text-gray-400" /> {String(order.customer_phone)}
                </p>
              ) : null}
              {order.customer_email ? (
                <p className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <MessageCircle className="h-3.5 w-3.5 text-gray-400" /> {String(order.customer_email)}
                </p>
              ) : null}
              {order.customer_address ? (
                <p className="flex items-start gap-2 text-gray-600 dark:text-gray-300">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" /> {String(order.customer_address)}
                </p>
              ) : null}
            </div>
            {order.customer_id ? (
              <Link
                href={`/dashboard/customers?q=${encodeURIComponent(String(order.customer_name))}`}
                className={buttonClass('outline', 'sm', 'mt-4 w-full')}
              >
                Lihat riwayat pelanggan
              </Link>
            ) : null}
          </Panel>

          <Panel className="p-5">
            <SectionTitle title="RINGKASAN INTERNAL" />
            <div className="mt-4 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Total item</span>
                <span className="font-semibold">{formatNumber(items.reduce((sum, item) => sum + item.quantity, 0))} unit</span>
              </div>
              {user.role === 'OWNER' ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">HPP item terjual</span>
                    <span className="font-semibold">{formatIDR(cogs)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Laba kotor</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatIDR(toNumber(order.subtotal) - toNumber(order.discount) - cogs)}
                    </span>
                  </div>
                </>
              ) : null}
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Dibuat</span>
                <span>{formatDateTime(String(order.created_at))}</span>
              </div>
              {order.completed_at ? (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Selesai</span>
                  <span>{formatDateTime(String(order.completed_at))}</span>
                </div>
              ) : null}
            </div>
          </Panel>

          <Panel className="p-5">
            <SectionTitle title="RIWAYAT AUDIT" description="Jejak perubahan pada pesanan ini." />
            <div className="mt-4 space-y-3">
              {auditRows.map((row) => (
                <div key={String(row.id)} className="flex gap-2.5">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#FF5A1F]" />
                  <div>
                    <p className="text-[11px] leading-relaxed text-gray-700 dark:text-gray-200">{String(row.summary)}</p>
                    <p className="mt-0.5 text-[9px] text-gray-400">
                      {row.actor_name ? String(row.actor_name) : 'Sistem'} · {formatDateTime(String(row.created_at))}
                    </p>
                  </div>
                </div>
              ))}
              {!auditRows.length ? (
                <p className="text-xs text-gray-400">Belum ada riwayat audit.</p>
              ) : null}
            </div>
          </Panel>

          <div className="flex items-center gap-2 rounded-xl border border-dashed border-black/10 px-3 py-2 text-[10px] text-gray-400 dark:border-white/10">
            <CalendarDays className="h-3.5 w-3.5" /> Tanggal cetak: {formatDate(new Date())} · WITA
          </div>
        </div>
      </div>
    </div>
  );
}
