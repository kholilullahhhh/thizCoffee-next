'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardPlus, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatIDR, formatNumber } from '@/lib/format';
import { Button } from '@/components/dashboard/ui';
import { Modal } from '@/components/dashboard/modal';

interface ItemOption {
  value: string;
  label: string;
  unit: string;
  cost: number;
  kind: 'product' | 'ingredient';
  stock: number;
}

type AdjustmentType = 'PURCHASE' | 'ADJUSTMENT' | 'WASTAGE' | 'RETURN';

const typeLabels: Record<AdjustmentType, string> = {
  PURCHASE: 'Penerimaan / pembelian',
  ADJUSTMENT: 'Penyesuaian stok',
  WASTAGE: 'Barang rusak / terbuang',
  RETURN: 'Pengembalian ke stok',
};

interface LineState {
  target: string;
  quantity: string;
  unitCost: string;
}

function newLine(): LineState {
  return { target: '', quantity: '1', unitCost: '0' };
}

export function StockAdjustmentDialog({
  items,
  suppliers,
  methods,
}: {
  items: ItemOption[];
  suppliers: Array<{ id: string; name: string }>;
  methods: Array<{ code: string; name: string }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<AdjustmentType>('PURCHASE');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [recordExpense, setRecordExpense] = useState(true);
  const [method, setMethod] = useState('CASH');
  const [lines, setLines] = useState<LineState[]>([newLine()]);
  const [saving, setSaving] = useState(false);

  const optionMap = useMemo(() => new Map(items.map((item) => [item.value, item])), [items]);

  const estimatedTotal = lines.reduce((sum, line) => {
    const option = optionMap.get(line.target);
    return sum + Math.abs(Number(line.quantity) || 0) * (Number(line.unitCost) || option?.cost || 0);
  }, 0);

  function updateLine(index: number, patch: Partial<LineState>) {
    setLines((current) =>
      current.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line))
    );
  }

  function pickTarget(index: number, value: string) {
    const option = optionMap.get(value);
    updateLine(index, { target: value, unitCost: String(option?.cost || 0) });
  }

  function reset() {
    setType('PURCHASE');
    setReason('');
    setNotes('');
    setSupplierId('');
    setRecordExpense(true);
    setMethod('CASH');
    setLines([newLine()]);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const prepared = lines
      .map((line) => {
        const option = optionMap.get(line.target);
        if (!option) return null;
        const raw = Number(line.quantity);
        const quantity =
          type === 'WASTAGE' ? -Math.abs(raw) : type === 'ADJUSTMENT' ? raw : Math.abs(raw);
        return {
          productId: option.kind === 'product' ? option.value.split(':')[1] : null,
          ingredientId: option.kind === 'ingredient' ? option.value.split(':')[1] : null,
          quantity,
          unitCost: Number(line.unitCost) || 0,
        };
      })
      .filter(Boolean);
    if (!prepared.length) {
      toast.error('Pilih minimal satu item stok.');
      return;
    }
    setSaving(true);
    try {
      const idempotencyKey =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const response = await fetch('/api/stock-adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idempotencyKey,
          type,
          reason,
          notes: notes || null,
          supplierId: supplierId || null,
          recordExpense: type === 'PURCHASE' ? recordExpense : false,
          method,
          items: prepared,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; adjustmentNo?: string };
      if (!response.ok) throw new Error(data.error || 'Gagal menyimpan penyesuaian stok.');
      toast.success(`Mutasi ${data.adjustmentNo || ''} berhasil disimpan.`);
      setOpen(false);
      reset();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menyimpan penyesuaian stok.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <ClipboardPlus className="h-4 w-4" /> Mutasi stok
      </Button>

      <Modal
        open={open}
        onClose={() => !saving && setOpen(false)}
        title="MUTASI STOK"
        description="Catat penerimaan barang, pemakaian, kerusakan, atau koreksi stok. Semua perubahan masuk riwayat dan audit log."
        size="lg"
        footer={
          <>
            <Button variant="outline" type="button" onClick={() => setOpen(false)} disabled={saving}>Batal</Button>
            <Button type="submit" form="stock-adjustment-form" loading={saving}>
              Simpan mutasi
            </Button>
          </>
        }
      >
        <form id="stock-adjustment-form" onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="dashboard-label" htmlFor="adj-type">Jenis mutasi</label>
              <select
                id="adj-type"
                className="dashboard-input"
                value={type}
                onChange={(event) => {
                  const next = event.target.value as AdjustmentType;
                  setType(next);
                  if (next !== 'PURCHASE') setRecordExpense(false);
                }}
              >
                {Object.entries(typeLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="dashboard-label" htmlFor="adj-supplier">Pemasok (opsional)</label>
              <select
                id="adj-supplier"
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
          </div>

          {type === 'ADJUSTMENT' ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
              Gunakan angka negatif untuk mengurangi stok (contoh: -2) dan positif untuk menambah.
            </p>
          ) : null}

          <div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200">Item</p>
              <Button type="button" variant="outline" size="sm" onClick={() => setLines([...lines, newLine()])}>
                <Plus className="h-3.5 w-3.5" /> Baris
              </Button>
            </div>
            <div className="mt-2 space-y-2">
              {lines.map((line, index) => {
                const option = optionMap.get(line.target);
                return (
                  <div key={index} className="rounded-xl border border-black/[0.07] p-3 dark:border-white/10">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <select
                        className="dashboard-input flex-1"
                        value={line.target}
                        onChange={(event) => pickTarget(index, event.target.value)}
                        aria-label="Item stok"
                      >
                        <option value="">Pilih produk atau bahan</option>
                        <optgroup label="Produk jadi">
                          {items.filter((item) => item.kind === 'product').map((item) => (
                            <option key={item.value} value={item.value}>{item.label}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Bahan & kemasan">
                          {items.filter((item) => item.kind === 'ingredient').map((item) => (
                            <option key={item.value} value={item.value}>{item.label}</option>
                          ))}
                        </optgroup>
                      </select>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="any"
                          className="dashboard-input w-28"
                          value={line.quantity}
                          onChange={(event) => updateLine(index, { quantity: event.target.value })}
                          aria-label="Kuantitas"
                        />
                        <span className="flex w-10 items-center text-xs text-gray-400">{option?.unit || 'unit'}</span>
                        <input
                          type="number"
                          step="any"
                          min={0}
                          className="dashboard-input w-32"
                          value={line.unitCost}
                          onChange={(event) => updateLine(index, { unitCost: event.target.value })}
                          aria-label="Biaya satuan"
                          placeholder="Biaya/unit"
                        />
                        <button
                          type="button"
                          onClick={() => setLines(lines.filter((_, rowIndex) => rowIndex !== index))}
                          className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                          aria-label="Hapus baris"
                          disabled={lines.length === 1}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    {option ? (
                      <p className="mt-1.5 text-[10px] text-gray-400">
                        Stok saat ini {formatNumber(option.stock)} {option.unit} · biaya referensi {formatIDR(option.cost)} / {option.unit}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="dashboard-label" htmlFor="adj-reason">Alasan / keterangan</label>
              <input
                id="adj-reason"
                className="dashboard-input"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Contoh: Pembelian susu dari CV Bahan Segar"
                required
                minLength={4}
              />
            </div>
            <div>
              <label className="dashboard-label" htmlFor="adj-notes">Catatan tambahan</label>
              <input
                id="adj-notes"
                className="dashboard-input"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Opsional"
              />
            </div>
          </div>

          {type === 'PURCHASE' ? (
            <div className="rounded-xl border border-black/[0.07] p-4 dark:border-white/10">
              <label className="flex items-start gap-2 text-xs text-gray-700 dark:text-gray-200">
                <input
                  type="checkbox"
                  checked={recordExpense}
                  onChange={(event) => setRecordExpense(event.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#FF5A1F]"
                />
                <span>
                  Catat sebagai pengeluaran kas pembelian persediaan sebesar{' '}
                  <strong>{formatIDR(estimatedTotal)}</strong>.
                  <span className="mt-0.5 block text-[10px] text-gray-400">
                    Pembelian persediaan mengurangi kas, tetapi tidak langsung mengurangi laba bersih karena HPP dihitung saat barang terjual.
                  </span>
                </span>
              </label>
              {recordExpense ? (
                <div className="mt-3 sm:w-64">
                  <label className="dashboard-label" htmlFor="adj-method">Metode pembayaran</label>
                  <select
                    id="adj-method"
                    className="dashboard-input"
                    value={method}
                    onChange={(event) => setMethod(event.target.value)}
                  >
                    {methods.map((item) => (
                      <option key={item.code} value={item.code}>{item.name}</option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>
          ) : null}
        </form>
      </Modal>
    </>
  );
}
