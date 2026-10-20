'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, Pencil, Plus, Warehouse } from 'lucide-react';
import { toast } from 'sonner';
import { formatIDR, formatNumber, toNumber } from '@/lib/format';
import { Badge, Button, EmptyState } from '@/components/dashboard/ui';
import { ConfirmDialog, Modal } from '@/components/dashboard/modal';

interface IngredientRow {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  stock: number;
  minStock: number;
  unitCost: number;
  supplierId: string | null;
  supplierName: string | null;
  active: boolean;
}

interface FormState {
  sku: string;
  name: string;
  category: string;
  unit: string;
  stock: string;
  minStock: string;
  unitCost: string;
  supplierId: string;
  active: boolean;
}

const categoryLabels: Record<string, string> = {
  COFFEE: 'Kopi',
  DAIRY: 'Susu',
  SWEETENER: 'Pemanis',
  PACKAGING: 'Kemasan',
  OTHER: 'Lainnya',
};

function empty(): FormState {
  return {
    sku: '',
    name: '',
    category: 'COFFEE',
    unit: 'g',
    stock: '0',
    minStock: '0',
    unitCost: '0',
    supplierId: '',
    active: true,
  };
}

export function IngredientManager({
  ingredients,
  suppliers,
}: {
  ingredients: IngredientRow[];
  suppliers: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<IngredientRow | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<IngredientRow | null>(null);
  const [archiving, setArchiving] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm(empty());
    setOpen(true);
  }

  function openEdit(row: IngredientRow) {
    setEditing(row);
    setForm({
      sku: row.sku,
      name: row.name,
      category: row.category,
      unit: row.unit,
      stock: String(row.stock),
      minStock: String(row.minStock),
      unitCost: String(row.unitCost),
      supplierId: row.supplierId || '',
      active: row.active,
    });
    setOpen(true);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        sku: form.sku,
        name: form.name,
        category: form.category,
        unit: form.unit,
        minStock: Number(form.minStock),
        unitCost: Number(form.unitCost),
        supplierId: form.supplierId || null,
        active: form.active,
      };
      if (!editing) payload.stock = Number(form.stock);
      const response = await fetch(editing ? `/api/ingredients/${editing.id}` : '/api/ingredients', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Gagal menyimpan bahan.');
      toast.success(editing ? 'Bahan diperbarui.' : 'Bahan baru ditambahkan.');
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menyimpan bahan.');
    } finally {
      setSaving(false);
    }
  }

  async function archive() {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      const response = await fetch(`/api/ingredients/${archiveTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !archiveTarget.active }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Gagal mengubah status.');
      toast.success(archiveTarget.active ? 'Bahan diarsipkan.' : 'Bahan diaktifkan kembali.');
      setArchiveTarget(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal mengubah status.');
    } finally {
      setArchiving(false);
    }
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Bahan / kemasan
        </Button>
      </div>

      <div className="dashboard-table-shell">
        <div className="overflow-x-auto">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Bahan / kemasan</th>
                <th>Kategori</th>
                <th>Pemasok</th>
                <th className="text-right">Biaya / unit</th>
                <th className="text-right">Stok</th>
                <th className="text-right">Nilai stok</th>
                <th>Status</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {ingredients.map((row) => {
                const low = row.stock <= row.minStock;
                return (
                  <tr key={row.id}>
                    <td>
                      <p className="font-semibold text-gray-900 dark:text-white">{row.name}</p>
                      <p className="mt-0.5 text-[10px] text-gray-400">{row.sku} · {row.unit}</p>
                    </td>
                    <td className="text-xs">{categoryLabels[row.category] || row.category}</td>
                    <td className="text-xs">{row.supplierName || '-'}</td>
                    <td className="text-right tabular-nums">
                      {formatIDR(row.unitCost)}
                      <span className="block text-[10px] text-gray-400">per {row.unit}</span>
                    </td>
                    <td className="text-right">
                      <span className={low ? 'font-bold text-amber-600 dark:text-amber-400' : 'font-semibold'}>
                        {formatNumber(row.stock)}
                      </span>
                      <span className="block text-[10px] text-gray-400">min {formatNumber(row.minStock)}</span>
                    </td>
                    <td className="text-right font-semibold tabular-nums text-gray-900 dark:text-white">
                      {formatIDR(toNumber(row.stock) * row.unitCost)}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        <Badge tone={row.active ? 'green' : 'neutral'}>
                          {row.active ? 'Aktif' : 'Arsip'}
                        </Badge>
                        {row.active && row.stock <= 0 ? <Badge tone="red">Habis</Badge> : null}
                        {row.active && low && row.stock > 0 ? <Badge tone="yellow">Menipis</Badge> : null}
                      </div>
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="rounded-lg p-2 text-gray-400 hover:bg-[#FF5A1F]/10 hover:text-[#FF5A1F]"
                          aria-label={`Edit ${row.name}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setArchiveTarget(row)}
                          className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                          aria-label={row.active ? `Arsipkan ${row.name}` : `Aktifkan ${row.name}`}
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!ingredients.length ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState
                      icon={<Warehouse className="h-5 w-5" />}
                      title="Belum ada bahan"
                      description="Tambahkan bahan baku atau kemasan untuk mulai menghitung stok."
                    />
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => !saving && setOpen(false)}
        title={editing ? 'EDIT BAHAN' : 'BAHAN BARU'}
        description="Stok awal dicatat sebagai mutasi. Perubahan stok selanjutnya melalui penerimaan atau penyesuaian."
        size="lg"
        footer={
          <>
            <Button variant="outline" type="button" onClick={() => setOpen(false)} disabled={saving}>Batal</Button>
            <Button type="submit" form="ingredient-form" loading={saving}>
              {editing ? 'Simpan perubahan' : 'Tambah bahan'}
            </Button>
          </>
        }
      >
        <form id="ingredient-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="dashboard-label" htmlFor="ing-name">Nama bahan</label>
            <input
              id="ing-name"
              className="dashboard-input"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
            />
          </div>
          <div>
            <label className="dashboard-label" htmlFor="ing-sku">SKU</label>
            <input
              id="ing-sku"
              className="dashboard-input font-mono uppercase"
              value={form.sku}
              onChange={(event) => setForm({ ...form, sku: event.target.value.toUpperCase() })}
              required
            />
          </div>
          <div>
            <label className="dashboard-label" htmlFor="ing-category">Kategori</label>
            <select
              id="ing-category"
              className="dashboard-input"
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value })}
            >
              {Object.entries(categoryLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="dashboard-label" htmlFor="ing-unit">Satuan</label>
            <input
              id="ing-unit"
              className="dashboard-input"
              value={form.unit}
              onChange={(event) => setForm({ ...form, unit: event.target.value })}
              placeholder="g / ml / pcs"
              required
            />
          </div>
          <div>
            <label className="dashboard-label" htmlFor="ing-cost">Biaya per satuan (Rp)</label>
            <input
              id="ing-cost"
              type="number"
              min={0}
              step="any"
              className="dashboard-input"
              value={form.unitCost}
              onChange={(event) => setForm({ ...form, unitCost: event.target.value })}
              required
            />
          </div>
          {!editing ? (
            <div>
              <label className="dashboard-label" htmlFor="ing-stock">Stok awal</label>
              <input
                id="ing-stock"
                type="number"
                min={0}
                step="any"
                className="dashboard-input"
                value={form.stock}
                onChange={(event) => setForm({ ...form, stock: event.target.value })}
              />
            </div>
          ) : null}
          <div>
            <label className="dashboard-label" htmlFor="ing-min">Stok minimum</label>
            <input
              id="ing-min"
              type="number"
              min={0}
              step="any"
              className="dashboard-input"
              value={form.minStock}
              onChange={(event) => setForm({ ...form, minStock: event.target.value })}
            />
          </div>
          <div>
            <label className="dashboard-label" htmlFor="ing-supplier">Pemasok</label>
            <select
              id="ing-supplier"
              className="dashboard-input"
              value={form.supplierId}
              onChange={(event) => setForm({ ...form, supplierId: event.target.value })}
            >
              <option value="">Tanpa pemasok</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-600 sm:col-span-2 dark:text-gray-300">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => setForm({ ...form, active: event.target.checked })}
              className="h-4 w-4 accent-[#FF5A1F]"
            />
            Bahan aktif dan dapat dipakai pada resep
          </label>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={archive}
        loading={archiving}
        title={archiveTarget?.active ? 'Arsipkan bahan?' : 'Aktifkan bahan?'}
        description={
          archiveTarget?.active
            ? `${archiveTarget?.name} tidak akan muncul pada resep baru. Riwayat mutasi tetap tersimpan.`
            : `${archiveTarget?.name} akan kembali tersedia.`
        }
        confirmLabel={archiveTarget?.active ? 'Arsipkan' : 'Aktifkan'}
        destructive={!!archiveTarget?.active}
      />
    </>
  );
}
