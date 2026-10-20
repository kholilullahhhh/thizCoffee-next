'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check,
  Minus,
  Plus,
  ReceiptText,
  ShoppingBag,
  Trash2,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatIDR, toNumber } from '@/lib/format';
import { Badge, Button, EmptyState } from '@/components/dashboard/ui';
import { Modal } from '@/components/dashboard/modal';

interface ProductOption {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  categoryName: string | null;
  volumeMl: number | null;
}

interface CustomerOption {
  id: string;
  name: string;
  phone: string | null;
}

interface MethodOption {
  code: string;
  name: string;
}

interface ChannelOption {
  code: string;
  name: string;
}

interface CartLine {
  productId: string;
  quantity: number;
}

export function OrderFormDialog({
  products,
  customers,
  methods,
  channels,
  defaultDeliveryFee,
  initialOpen = false,
  label = 'Penjualan baru',
}: {
  products: ProductOption[];
  customers: CustomerOption[];
  methods: MethodOption[];
  channels: ChannelOption[];
  defaultDeliveryFee: number;
  initialOpen?: boolean;
  label?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(initialOpen);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [channel, setChannel] = useState(channels[0]?.code || 'DIRECT');
  const [status, setStatus] = useState<'NEW' | 'PROCESSING' | 'READY' | 'COMPLETED'>('NEW');
  const [discount, setDiscount] = useState('0');
  const [deliveryFee, setDeliveryFee] = useState(String(defaultDeliveryFee));
  const [paymentAmount, setPaymentAmount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState(methods[0]?.code || 'CASH');
  const [paymentReference, setPaymentReference] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`
  );

  useEffect(() => {
    if (initialOpen) setOpen(true);
  }, [initialOpen]);

  const productMap = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products]
  );

  const subtotal = cart.reduce((sum, line) => {
    const product = productMap.get(line.productId);
    return sum + toNumber(product?.price) * line.quantity;
  }, 0);
  const discountValue = Math.min(Math.max(0, Number(discount) || 0), subtotal);
  const deliveryValue = Math.max(0, Number(deliveryFee) || 0);
  const total = subtotal - discountValue + deliveryValue;
  const paymentValue = Math.max(0, Number(paymentAmount) || 0);
  const remaining = Math.max(0, total - paymentValue);

  function addProduct(productId: string) {
    const product = productMap.get(productId);
    if (!product) return;
    const existing = cart.find((line) => line.productId === productId);
    const nextQuantity = (existing?.quantity || 0) + 1;
    if (nextQuantity > product.stock) {
      toast.error(`Stok ${product.name} hanya ${product.stock} unit.`);
      return;
    }
    setCart((current) =>
      existing
        ? current.map((line) =>
            line.productId === productId ? { ...line, quantity: nextQuantity } : line
          )
        : [...current, { productId, quantity: 1 }]
    );
  }

  function changeQuantity(productId: string, delta: number) {
    const product = productMap.get(productId);
    if (!product) return;
    setCart((current) =>
      current
        .map((line) => {
          if (line.productId !== productId) return line;
          const quantity = Math.min(product.stock, Math.max(0, line.quantity + delta));
          return { ...line, quantity };
        })
        .filter((line) => line.quantity > 0)
    );
  }

  function reset() {
    setCart([]);
    setCustomerId('');
    setCustomerName('');
    setCustomerPhone('');
    setDiscount('0');
    setDeliveryFee(String(defaultDeliveryFee));
    setPaymentAmount('0');
    setPaymentReference('');
    setNotes('');
    setStatus('NEW');
    setIdempotencyKey(
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!cart.length) {
      toast.error('Tambahkan minimal satu produk.');
      return;
    }
    if (paymentValue > total) {
      toast.error('Pembayaran tidak boleh melebihi total transaksi.');
      return;
    }
    setSaving(true);
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idempotencyKey,
          customerId: customerId || null,
          customerName: customerId ? null : customerName || null,
          customerPhone: customerId ? null : customerPhone || null,
          channel,
          status,
          items: cart,
          discount: Math.round(discountValue),
          deliveryFee: Math.round(deliveryValue),
          paymentAmount: Math.round(paymentValue),
          paymentMethod,
          paymentReference: paymentReference || null,
          notes: notes || null,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        orderId?: string;
        orderNumber?: string;
        alreadyExisted?: boolean;
      };
      if (!response.ok) throw new Error(data.error || 'Gagal membuat pesanan.');
      toast.success(
        data.alreadyExisted
          ? 'Transaksi ini sudah tersimpan sebelumnya.'
          : `Transaksi ${data.orderNumber} berhasil dibuat.`
      );
      setOpen(false);
      reset();
      if (data.orderId) router.push(`/dashboard/orders/${data.orderId}`);
      else router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal membuat pesanan.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> {label}
      </Button>

      <Modal
        open={open}
        onClose={() => !saving && setOpen(false)}
        title="TRANSAKSI PENJUALAN"
        description="Harga, HPP, dan stok diambil dari katalog server. Stok produk serta bahan resep berkurang atomik saat transaksi disimpan."
        size="xl"
        footer={
          <>
            <div className="mr-auto hidden text-xs text-gray-500 sm:block dark:text-gray-400">
              Total <strong className="text-base text-gray-900 dark:text-white">{formatIDR(total)}</strong>
            </div>
            <Button variant="outline" type="button" onClick={() => setOpen(false)} disabled={saving}>
              Batal
            </Button>
            <Button type="submit" form="order-form" loading={saving}>
              <Check className="h-4 w-4" /> Simpan transaksi
            </Button>
          </>
        }
      >
        <form id="order-form" onSubmit={submit} className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                1. Pilih produk
              </p>
              <div className="grid max-h-[230px] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                {products.map((product) => {
                  const inCart = cart.find((line) => line.productId === product.id)?.quantity || 0;
                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => addProduct(product.id)}
                      disabled={product.stock <= inCart}
                      className="group rounded-xl border border-black/[0.07] bg-white p-3 text-left transition hover:border-[#FF5A1F]/50 hover:bg-[#FFF8F4] disabled:cursor-not-allowed disabled:opacity-45 dark:border-white/10 dark:bg-[#181818] dark:hover:bg-[#FF5A1F]/[0.06]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-gray-900 dark:text-white">
                            {product.name}
                          </p>
                          <p className="mt-0.5 text-[9px] text-gray-400">
                            {product.volumeMl ? `${product.volumeMl} ml · ` : ''}
                            stok {product.stock}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-[#FF5A1F]">{formatIDR(product.price, true)}</span>
                      </div>
                      {inCart > 0 ? (
                        <Badge tone="orange" className="mt-2">{inCart} di keranjang</Badge>
                      ) : null}
                    </button>
                  );
                })}
                {!products.length ? (
                  <p className="col-span-full rounded-xl border border-dashed border-black/10 px-4 py-6 text-center text-xs text-gray-400 dark:border-white/10">
                    Belum ada produk aktif. Tambahkan produk terlebih dahulu.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="rounded-xl border border-black/[0.07] dark:border-white/10">
              <div className="flex items-center justify-between border-b border-black/[0.06] px-4 py-3 dark:border-white/[0.06]">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  2. Keranjang
                </p>
                <span className="text-[10px] text-gray-400">{cart.length} produk</span>
              </div>
              {cart.length ? (
                <div className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                  {cart.map((line) => {
                    const product = productMap.get(line.productId);
                    if (!product) return null;
                    return (
                      <div key={line.productId} className="flex items-center gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-gray-800 dark:text-gray-100">
                            {product.name}
                          </p>
                          <p className="text-[10px] text-gray-400">{formatIDR(product.price)} / unit</p>
                        </div>
                        <div className="flex items-center rounded-lg border border-black/10 dark:border-white/10">
                          <button
                            type="button"
                            onClick={() => changeQuantity(line.productId, -1)}
                            className="p-1.5 text-gray-500 hover:text-[#FF5A1F]"
                            aria-label="Kurangi"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-7 text-center text-xs font-bold tabular-nums">{line.quantity}</span>
                          <button
                            type="button"
                            onClick={() => changeQuantity(line.productId, 1)}
                            className="p-1.5 text-gray-500 hover:text-[#FF5A1F]"
                            aria-label="Tambah"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <span className="w-20 text-right text-xs font-bold tabular-nums text-gray-900 dark:text-white">
                          {formatIDR(product.price * line.quantity)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setCart(cart.filter((item) => item.productId !== line.productId))}
                          className="rounded p-1 text-gray-300 hover:text-red-500"
                          aria-label="Hapus"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={<ShoppingBag className="h-5 w-5" />}
                  title="Keranjang kosong"
                  description="Klik produk di atas untuk menambahkan ke transaksi."
                  className="py-8"
                />
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="dashboard-label" htmlFor="order-discount">Diskon (Rp)</label>
                <input
                  id="order-discount"
                  type="number"
                  min={0}
                  step={500}
                  className="dashboard-input"
                  value={discount}
                  onChange={(event) => setDiscount(event.target.value)}
                />
              </div>
              <div>
                <label className="dashboard-label" htmlFor="order-delivery">Biaya pengiriman (Rp)</label>
                <input
                  id="order-delivery"
                  type="number"
                  min={0}
                  step={500}
                  className="dashboard-input"
                  value={deliveryFee}
                  onChange={(event) => setDeliveryFee(event.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl bg-[#0A0A0A] p-4 text-white">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal</span><span className="tabular-nums text-gray-200">{formatIDR(subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Diskon</span><span className="tabular-nums text-gray-200">− {formatIDR(discountValue)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Pengiriman</span><span className="tabular-nums text-gray-200">+ {formatIDR(deliveryValue)}</span>
                </div>
              </div>
              <div className="mt-3 flex items-end justify-between border-t border-white/10 pt-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Total</span>
                <span className="text-2xl font-extrabold tabular-nums">{formatIDR(total)}</span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="dashboard-label" htmlFor="order-customer">Pelanggan</label>
                <select
                  id="order-customer"
                  className="dashboard-input"
                  value={customerId}
                  onChange={(event) => setCustomerId(event.target.value)}
                >
                  <option value="">Pelanggan umum / walk-in</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>{customer.name}</option>
                  ))}
                </select>
              </div>
              {!customerId ? (
                <>
                  <div>
                    <label className="dashboard-label" htmlFor="order-name">Nama (opsional)</label>
                    <input
                      id="order-name"
                      className="dashboard-input"
                      value={customerName}
                      onChange={(event) => setCustomerName(event.target.value)}
                      placeholder="Walk-in Customer"
                    />
                  </div>
                  <div>
                    <label className="dashboard-label" htmlFor="order-phone">No. WhatsApp</label>
                    <input
                      id="order-phone"
                      className="dashboard-input"
                      value={customerPhone}
                      onChange={(event) => setCustomerPhone(event.target.value)}
                      placeholder="62812..."
                    />
                  </div>
                </>
              ) : null}
              <div>
                <label className="dashboard-label" htmlFor="order-channel">Kanal</label>
                <select
                  id="order-channel"
                  className="dashboard-input"
                  value={channel}
                  onChange={(event) => setChannel(event.target.value)}
                >
                  {channels.map((item) => (
                    <option key={item.code} value={item.code}>{item.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="dashboard-label" htmlFor="order-status">Status awal</label>
                <select
                  id="order-status"
                  className="dashboard-input"
                  value={status}
                  onChange={(event) => setStatus(event.target.value as typeof status)}
                >
                  <option value="NEW">Baru</option>
                  <option value="PROCESSING">Diproses</option>
                  <option value="READY">Siap</option>
                  <option value="COMPLETED">Selesai</option>
                </select>
              </div>
            </div>

            <div className="rounded-xl border border-black/[0.07] p-4 dark:border-white/10">
              <div className="mb-3 flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <Wallet className="h-3.5 w-3.5" /> Pembayaran
                </p>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(String(total))}
                    className="rounded-md bg-emerald-50 px-2 py-1 text-[9px] font-bold uppercase text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300"
                  >
                    Lunas
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(String(Math.floor(total / 2)))}
                    className="rounded-md bg-amber-50 px-2 py-1 text-[9px] font-bold uppercase text-amber-700 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-300"
                  >
                    DP 50%
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentAmount('0')}
                    className="rounded-md bg-gray-100 px-2 py-1 text-[9px] font-bold uppercase text-gray-500 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-300"
                  >
                    Nol
                  </button>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="dashboard-label" htmlFor="order-paid">Jumlah dibayar (Rp)</label>
                  <input
                    id="order-paid"
                    type="number"
                    min={0}
                    max={total}
                    className="dashboard-input"
                    value={paymentAmount}
                    onChange={(event) => setPaymentAmount(event.target.value)}
                  />
                  {remaining > 0 && paymentValue > 0 ? (
                    <p className="mt-1 text-[10px] text-amber-600">Sisa piutang {formatIDR(remaining)}</p>
                  ) : null}
                </div>
                <div>
                  <label className="dashboard-label" htmlFor="order-method">Metode</label>
                  <select
                    id="order-method"
                    className="dashboard-input"
                    value={paymentMethod}
                    onChange={(event) => setPaymentMethod(event.target.value)}
                  >
                    {methods.map((item) => (
                      <option key={item.code} value={item.code}>{item.name}</option>
                    ))}
                  </select>
                </div>
                {paymentValue > 0 ? (
                  <div className="sm:col-span-2">
                    <label className="dashboard-label" htmlFor="order-reference">Referensi pembayaran</label>
                    <input
                      id="order-reference"
                      className="dashboard-input"
                      value={paymentReference}
                      onChange={(event) => setPaymentReference(event.target.value)}
                      placeholder="No. transfer / ID QRIS (opsional)"
                    />
                  </div>
                ) : null}
              </div>
            </div>

            <div>
              <label className="dashboard-label" htmlFor="order-notes">Catatan pesanan</label>
              <textarea
                id="order-notes"
                className="dashboard-textarea min-h-[76px]"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Alamat kirim, permintaan khusus, atau catatan internal..."
              />
            </div>
            <p className="flex items-start gap-1.5 text-[10px] leading-relaxed text-gray-400">
              <ReceiptText className="mt-0.5 h-3 w-3 shrink-0" />
              Pembayaran yang dicatat di sini langsung masuk buku kas sebagai pemasukan. Sisa tagihan tetap menjadi piutang.
            </p>
          </div>
        </form>
      </Modal>
    </>
  );
}
