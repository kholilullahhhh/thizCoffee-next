'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/dashboard/ui';
import { Modal } from '@/components/dashboard/modal';

interface Category {
  id: string;
  name: string;
  kind: string;
}

function localDateTimeValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 16);
}

export function FinanceEntryDialog({
  categories,
  methods,
  suppliers,
}: {
  categories: Category[];
  methods: Array<{ code: string; name: string }>;
  suppliers: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const manualCategories = categories.filter((category) =>
    ['OTHER_INCOME', 'OPERATING_EXPENSE', 'INVENTORY_PURCHASE'].includes(category.kind)
  );
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState(manualCategories[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState(methods[0]?.code || 'CASH');
  const [occurredAt, setOccurredAt] = useState(localDateTimeValue);
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [saving, setSaving] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState('');

  const selected = manualCategories.find((category) => category.id === categoryId);

  function openDialog() {
    setIdempotencyKey(window.crypto.randomUUID());
    setOpen(true);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch('/api/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId,
          amount: Number(amount),
          method,
          occurredAt: new Date(occurredAt).toISOString(),
          description,
          notes: notes || null,
          supplierId: supplierId || null,
          idempotencyKey,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Gagal menyimpan transaksi.');
      toast.success('Transaksi keuangan berhasil dicatat.');
      setOpen(false);
      setAmount('');
      setDescription('');
      setNotes('');
      setOccurredAt(localDateTimeValue());
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menyimpan transaksi.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button onClick={openDialog}>
        <Plus className="h-4 w-4" /> Transaksi manual
      </Button>

      <Modal
        open={open}
        onClose={() => !saving && setOpen(false)}
        title="TRANSAKSI KEUANGAN"
        description="Catat pemasukan lain atau pengeluaran operasional. Pembayaran penjualan hanya dicatat dari modul pesanan agar tidak dobel."
        size="lg"
        footer={
          <>
            <Button variant="outline" type="button" onClick={() => setOpen(false)} disabled={saving}>Batal</Button>
            <Button type="submit" form="finance-form" loading={saving}>
              <Wallet className="h-4 w-4" /> Simpan transaksi
            </Button>
          </>
        }
      >
        <form id="finance-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="dashboard-label" htmlFor="fin-category">Kategori</label>
            <select
              id="fin-category"
              className="dashboard-input"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              required
            >
              {manualCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.kind === 'OTHER_INCOME'
                    ? 'Pemasukan · '
                    : category.kind === 'INVENTORY_PURCHASE'
                      ? 'Persediaan · '
                      : 'Pengeluaran · '}
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="dashboard-label" htmlFor="fin-amount">Nominal (Rp)</label>
            <input
              id="fin-amount"
              type="number"
              min={1}
              className="dashboard-input"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              required
            />
          </div>
          <div>
            <label className="dashboard-label" htmlFor="fin-method">Metode</label>
            <select
              id="fin-method"
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
            <label className="dashboard-label" htmlFor="fin-date">Tanggal & waktu</label>
            <input
              id="fin-date"
              type="datetime-local"
              className="dashboard-input"
              value={occurredAt}
              onChange={(event) => setOccurredAt(event.target.value)}
              required
            />
          </div>
          <div>
            <label className="dashboard-label" htmlFor="fin-supplier">Pemasok / vendor</label>
            <select
              id="fin-supplier"
              className="dashboard-input"
              value={supplierId}
              onChange={(event) => setSupplierId(event.target.value)}
            >
              <option value="">Tanpa pemasok</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="dashboard-label" htmlFor="fin-description">Keterangan</label>
            <input
              id="fin-description"
              className="dashboard-input"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Contoh: Bayar listrik dapur produksi"
              required
              minLength={3}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="dashboard-label" htmlFor="fin-notes">Catatan</label>
            <textarea
              id="fin-notes"
              className="dashboard-textarea min-h-[76px]"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
          {selected?.kind === 'INVENTORY_PURCHASE' ? (
            <div className="rounded-xl bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-800 sm:col-span-2 dark:bg-amber-500/10 dark:text-amber-200">
              Transaksi ini hanya mencatat kas keluar. Untuk menambah stok sekaligus, gunakan
              menu Inventaris → Mutasi stok agar stok dan kas konsisten.
            </div>
          ) : null}
        </form>
      </Modal>
    </>
  );
}
