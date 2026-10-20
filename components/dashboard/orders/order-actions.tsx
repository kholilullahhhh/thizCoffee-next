'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Ban,
  CheckCircle2,
  Loader2,
  MessageCircle,
  Printer,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatIDR, toNumber } from '@/lib/format';
import { Button } from '@/components/dashboard/ui';
import { Modal } from '@/components/dashboard/modal';

const nextStatus: Record<string, { value: string; label: string } | null> = {
  NEW: { value: 'PROCESSING', label: 'Mulai proses' },
  PROCESSING: { value: 'READY', label: 'Tandai siap' },
  READY: { value: 'COMPLETED', label: 'Selesaikan' },
  COMPLETED: null,
  CANCELLED: null,
};

export function OrderActions({
  order,
  methods,
}: {
  order: {
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    total: number;
    amountPaid: number;
    customerName: string;
    customerPhone: string | null;
    createdAt: string;
    items: Array<{ name: string; quantity: number; price: number }>;
  };
  methods: Array<{ code: string; name: string }>;
}) {
  const router = useRouter();
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [amount, setAmount] = useState(String(Math.max(0, order.total - order.amountPaid)));
  const [method, setMethod] = useState(methods[0]?.code || 'CASH');
  const [reference, setReference] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const next = nextStatus[order.status];
  const remaining = Math.max(0, order.total - order.amountPaid);
  const canPay = order.status !== 'CANCELLED' && remaining > 0 && order.paymentStatus !== 'REFUNDED';

  async function advanceStatus() {
    if (!next) return;
    setLoadingStatus(true);
    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next.value }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Gagal mengubah status.');
      toast.success(`Pesanan ditandai ${next.label.toLowerCase()}.`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal mengubah status.');
    } finally {
      setLoadingStatus(false);
    }
  }

  async function addPayment(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const idempotencyKey =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const response = await fetch(`/api/orders/${order.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(amount),
          method,
          reference: reference || null,
          idempotencyKey,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Gagal mencatat pembayaran.');
      toast.success('Pembayaran berhasil dicatat.');
      setPaymentOpen(false);
      setReference('');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal mencatat pembayaran.');
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelOrder(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch(`/api/orders/${order.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        refundAmount?: number;
      };
      if (!response.ok) throw new Error(data.error || 'Gagal membatalkan pesanan.');
      toast.success(
        data.refundAmount
          ? `Pesanan dibatalkan dan refund ${formatIDR(data.refundAmount)} dicatat.`
          : 'Pesanan dibatalkan dan stok dikembalikan.'
      );
      setCancelOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal membatalkan pesanan.');
    } finally {
      setSubmitting(false);
    }
  }

  function openWhatsApp() {
    if (!order.customerPhone) return;
    const phone = order.customerPhone.replace(/[^0-9]/g, '');
    const lines = order.items
      .map((item) => `• ${item.name} x${item.quantity} = ${formatIDR(item.price * item.quantity)}`)
      .join('\n');
    const message = `Halo ${order.customerName}, pesanan THIZ COFFEE Anda ${order.orderNumber}:\n${lines}\n\nTotal: ${formatIDR(order.total)}\nDibayar: ${formatIDR(order.amountPaid)}\nSisa: ${formatIDR(remaining)}\n\nTerima kasih!`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Cetak struk
        </Button>
        {order.customerPhone ? (
          <Button variant="outline" onClick={openWhatsApp}>
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </Button>
        ) : null}
        {canPay ? (
          <Button variant="secondary" onClick={() => setPaymentOpen(true)}>
            <Wallet className="h-4 w-4" /> Catat pembayaran
          </Button>
        ) : null}
        {next ? (
          <Button onClick={advanceStatus} loading={loadingStatus}>
            <ArrowRight className="h-4 w-4" /> {next.label}
          </Button>
        ) : null}
        {order.status !== 'CANCELLED' ? (
          <Button variant="danger" onClick={() => setCancelOpen(true)}>
            <Ban className="h-4 w-4" /> Batalkan
          </Button>
        ) : null}
      </div>

      <Modal
        open={paymentOpen}
        onClose={() => !submitting && setPaymentOpen(false)}
        title="CATAT PEMBAYARAN"
        description={`Sisa tagihan ${order.orderNumber}: ${formatIDR(remaining)}. Pembayaran langsung menambah kas dan mengurangi piutang.`}
        size="sm"
        footer={
          <>
            <Button variant="outline" type="button" onClick={() => setPaymentOpen(false)} disabled={submitting}>
              Batal
            </Button>
            <Button type="submit" form="payment-form" loading={submitting}>
              <CheckCircle2 className="h-4 w-4" /> Simpan pembayaran
            </Button>
          </>
        }
      >
        <form id="payment-form" onSubmit={addPayment} className="space-y-4">
          <div>
            <label className="dashboard-label" htmlFor="pay-amount">Nominal (Rp)</label>
            <input
              id="pay-amount"
              type="number"
              min={1}
              max={remaining}
              className="dashboard-input"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              required
            />
            <div className="mt-1.5 flex gap-2">
              <button
                type="button"
                onClick={() => setAmount(String(remaining))}
                className="rounded bg-emerald-50 px-2 py-1 text-[9px] font-bold uppercase text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
              >
                Lunasi
              </button>
              <button
                type="button"
                onClick={() => setAmount(String(Math.floor(remaining / 2)))}
                className="rounded bg-amber-50 px-2 py-1 text-[9px] font-bold uppercase text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
              >
                Setengah
              </button>
            </div>
          </div>
          <div>
            <label className="dashboard-label" htmlFor="pay-method">Metode</label>
            <select
              id="pay-method"
              className="dashboard-input"
              value={method}
              onChange={(event) => setMethod(event.target.value)}
            >
              {methods.map((item) => (
                <option key={item.code} value={item.code}>{item.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="dashboard-label" htmlFor="pay-reference">Referensi</label>
            <input
              id="pay-reference"
              className="dashboard-input"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="No. transfer / ID QRIS (opsional)"
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={cancelOpen}
        onClose={() => !submitting && setCancelOpen(false)}
        title="BATALKAN PESANAN"
        description="Stok produk dan bahan akan dikembalikan. Jika sudah ada pembayaran, refund dicatat sebagai kas keluar dan status pembayaran menjadi REFUNDED."
        size="sm"
        footer={
          <>
            <Button variant="outline" type="button" onClick={() => setCancelOpen(false)} disabled={submitting}>
              Kembali
            </Button>
            <Button variant="danger" type="submit" form="cancel-form" loading={submitting}>
              <Ban className="h-4 w-4" /> Batalkan pesanan
            </Button>
          </>
        }
      >
        <form id="cancel-form" onSubmit={cancelOrder}>
          <div className="rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300">
            Tindakan ini tercatat di audit log dan tidak dapat dibatalkan.
            {order.amountPaid > 0 ? ` Refund yang akan dicatat: ${formatIDR(order.amountPaid)}.` : ''}
          </div>
          <div className="mt-4">
            <label className="dashboard-label" htmlFor="cancel-reason">Alasan pembatalan</label>
            <textarea
              id="cancel-reason"
              className="dashboard-textarea"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Contoh: Pelanggan membatalkan pesanan via WhatsApp."
              required
              minLength={4}
            />
          </div>
        </form>
      </Modal>
    </>
  );
}
