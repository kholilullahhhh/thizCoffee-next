'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, Boxes, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatIDR, formatNumber, toNumber } from '@/lib/format';
import { Badge, Button, EmptyState, statusMeta } from '@/components/dashboard/ui';
import { ConfirmDialog, Modal } from '@/components/dashboard/modal';

interface RecipeItem {
  ingredientId: string;
  quantity: number;
  name: string;
  unit: string;
  cost: number;
}

interface ProductRow {
  id: string;
  sku: string;
  name: string;
  categoryId: string | null;
  categoryName: string | null;
  volumeMl: number | null;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  active: boolean;
  recipe: RecipeItem[];
}

interface Option {
  id: string;
  name: string;
  unit?: string;
  cost?: number;
}

interface FormState {
  sku: string;
  name: string;
  categoryId: string;
  volumeMl: string;
  price: string;
  cost: string;
  stock: string;
  minStock: string;
  active: boolean;
  recipe: Array<{ ingredientId: string; quantity: string }>;
}

function emptyForm(): FormState {
  return {
    sku: '',
    name: '',
    categoryId: '',
    volumeMl: '250',
    price: '15000',
    cost: '6500',
    stock: '0',
    minStock: '10',
    active: true,
    recipe: [],
  };
}

function toForm(product: ProductRow): FormState {
  return {
    sku: product.sku,
    name: product.name,
    categoryId: product.categoryId || '',
    volumeMl: product.volumeMl ? String(product.volumeMl) : '',
    price: String(product.price),
    cost: String(product.cost),
    stock: String(product.stock),
    minStock: String(product.minStock),
    active: product.active,
    recipe: product.recipe.map((item) => ({
      ingredientId: item.ingredientId,
      quantity: String(item.quantity),
    })),
  };
}

export function ProductManager({
  products,
  categories,
  ingredients,
  canManage,
}: {
  products: ProductRow[];
  categories: Option[];
  ingredients: Option[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<ProductRow | null>(null);
  const [archiving, setArchiving] = useState(false);

  const ingredientMap = useMemo(
    () => new Map(ingredients.map((item) => [item.id, item])),
    [ingredients]
  );
  const bomCost = form.recipe.reduce((sum, row) => {
    const ingredient = ingredientMap.get(row.ingredientId);
    return sum + toNumber(ingredient?.cost) * toNumber(row.quantity);
  }, 0);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  }

  function openEdit(product: ProductRow) {
    setEditing(product);
    setForm(toForm(product));
    setOpen(true);
  }

  function patchForm(patch: Partial<FormState>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        sku: form.sku,
        name: form.name,
        categoryId: form.categoryId || null,
        volumeMl: form.volumeMl ? Number(form.volumeMl) : null,
        price: Number(form.price),
        cost: Number(form.cost),
        stock: Number(form.stock),
        minStock: Number(form.minStock),
        active: form.active,
        recipe: form.recipe
          .filter((row) => row.ingredientId && Number(row.quantity) > 0)
          .map((row) => ({
            ingredientId: row.ingredientId,
            quantity: Number(row.quantity),
          })),
      };
      if (editing) delete payload.stock;
      const response = await fetch(editing ? `/api/products/${editing.id}` : '/api/products', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Gagal menyimpan produk.');
      toast.success(editing ? 'Produk diperbarui.' : 'Produk baru ditambahkan.');
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menyimpan produk.');
    } finally {
      setSaving(false);
    }
  }

  async function archive() {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      const response = await fetch(`/api/products/${archiveTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !archiveTarget.active }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Gagal mengubah status produk.');
      toast.success(archiveTarget.active ? 'Produk diarsipkan.' : 'Produk diaktifkan kembali.');
      setArchiveTarget(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal mengubah status produk.');
    } finally {
      setArchiving(false);
    }
  }

  return (
    <>
      {canManage ? (
        <Button onClick={openCreate} size="md">
          <Plus className="h-4 w-4" /> Produk baru
        </Button>
      ) : null}

      <div className="dashboard-table-shell">
        <div className="overflow-x-auto">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Produk</th>
                <th>Kategori</th>
                <th className="text-right">Harga jual</th>
                <th className="text-right">HPP</th>
                <th className="text-right">Margin</th>
                <th className="text-right">Stok</th>
                <th>Status</th>
                {canManage ? <th className="text-right">Aksi</th> : null}
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const margin = product.price - product.cost;
                const marginPercent = product.price > 0 ? (margin / product.price) * 100 : 0;
                const low = product.stock <= product.minStock;
                return (
                  <tr key={product.id}>
                    <td>
                      <p className="font-semibold text-gray-900 dark:text-white">{product.name}</p>
                      <p className="mt-0.5 text-[10px] text-gray-400">
                        {product.sku}
                        {product.volumeMl ? ` · ${product.volumeMl} ml` : ''}
                      </p>
                    </td>
                    <td className="text-xs">{product.categoryName || '-'}</td>
                    <td className="text-right font-semibold tabular-nums text-gray-900 dark:text-white">
                      {formatIDR(product.price)}
                    </td>
                    <td className="text-right tabular-nums">{formatIDR(product.cost)}</td>
                    <td className="text-right">
                      <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                        {formatIDR(margin)}
                      </span>
                      <p className="text-[10px] text-gray-400">{marginPercent.toFixed(1)}%</p>
                    </td>
                    <td className="text-right">
                      <span className={low ? 'font-bold text-amber-600 dark:text-amber-400' : 'font-semibold'}>
                        {formatNumber(product.stock)}
                      </span>
                      <p className="text-[10px] text-gray-400">min {formatNumber(product.minStock)}</p>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        <Badge tone={product.active ? 'green' : 'neutral'}>
                          {product.active ? 'Aktif' : 'Arsip'}
                        </Badge>
                        {product.active && product.stock <= 0 ? (
                          <Badge tone="red">Habis</Badge>
                        ) : product.active && low ? (
                          <Badge tone="yellow">Menipis</Badge>
                        ) : null}
                      </div>
                    </td>
                    {canManage ? (
                      <td>
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(product)}
                            className="rounded-lg p-2 text-gray-400 transition hover:bg-[#FF5A1F]/10 hover:text-[#FF5A1F]"
                            aria-label={`Edit ${product.name}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setArchiveTarget(product)}
                            className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                            aria-label={product.active ? `Arsipkan ${product.name}` : `Aktifkan ${product.name}`}
                          >
                            {product.active ? <Archive className="h-3.5 w-3.5" /> : <Boxes className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
              {!products.length ? (
                <tr>
                  <td colSpan={canManage ? 8 : 7}>
                    <EmptyState
                      icon={<Boxes className="h-5 w-5" />}
                      title="Belum ada produk"
                      description="Tambahkan produk kopi botolan pertama atau ubah filter pencarian."
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
        title={editing ? 'EDIT PRODUK' : 'PRODUK BARU'}
        description={
          editing
            ? 'Perubahan harga dan HPP hanya berlaku untuk transaksi berikutnya; transaksi lama tetap memakai snapshot.'
            : 'Stok awal dicatat sebagai mutasi penyesuaian. Stok setelahnya dikelola dari inventaris.'
        }
        size="lg"
        footer={
          <>
            <Button variant="outline" type="button" onClick={() => setOpen(false)} disabled={saving}>
              Batal
            </Button>
            <Button type="submit" form="product-form" loading={saving}>
              {editing ? 'Simpan perubahan' : 'Tambah produk'}
            </Button>
          </>
        }
      >
        <form id="product-form" onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="dashboard-label" htmlFor="product-name">Nama produk</label>
              <input
                id="product-name"
                className="dashboard-input"
                value={form.name}
                onChange={(event) => patchForm({ name: event.target.value })}
                required
                minLength={2}
              />
            </div>
            <div>
              <label className="dashboard-label" htmlFor="product-sku">SKU</label>
              <input
                id="product-sku"
                className="dashboard-input font-mono uppercase"
                value={form.sku}
                onChange={(event) => patchForm({ sku: event.target.value.toUpperCase() })}
                required
                minLength={2}
              />
            </div>
            <div>
              <label className="dashboard-label" htmlFor="product-category">Kategori</label>
              <select
                id="product-category"
                className="dashboard-input"
                value={form.categoryId}
                onChange={(event) => patchForm({ categoryId: event.target.value })}
              >
                <option value="">Tanpa kategori</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="dashboard-label" htmlFor="product-volume">Volume (ml)</label>
              <input
                id="product-volume"
                type="number"
                min={1}
                className="dashboard-input"
                value={form.volumeMl}
                onChange={(event) => patchForm({ volumeMl: event.target.value })}
              />
            </div>
            <div>
              <label className="dashboard-label" htmlFor="product-price">Harga jual (Rp)</label>
              <input
                id="product-price"
                type="number"
                min={0}
                step={500}
                className="dashboard-input"
                value={form.price}
                onChange={(event) => patchForm({ price: event.target.value })}
                required
              />
            </div>
            <div>
              <label className="dashboard-label" htmlFor="product-cost">HPP / unit (Rp)</label>
              <input
                id="product-cost"
                type="number"
                min={0}
                step={100}
                className="dashboard-input"
                value={form.cost}
                onChange={(event) => patchForm({ cost: event.target.value })}
                required
              />
              {bomCost > 0 ? (
                <p className="mt-1 text-[10px] text-gray-400">
                  Nilai resep saat ini: {formatIDR(bomCost)} / unit
                </p>
              ) : null}
            </div>
            {!editing ? (
              <div>
                <label className="dashboard-label" htmlFor="product-stock">Stok awal</label>
                <input
                  id="product-stock"
                  type="number"
                  min={0}
                  className="dashboard-input"
                  value={form.stock}
                  onChange={(event) => patchForm({ stock: event.target.value })}
                />
              </div>
            ) : (
              <div>
                <label className="dashboard-label">Stok saat ini</label>
                <div className="flex h-11 items-center rounded-xl border border-dashed border-black/10 px-3.5 text-sm text-gray-500 dark:border-white/10 dark:text-gray-400">
                  {formatNumber(editing.stock)} unit — ubah lewat inventaris
                </div>
              </div>
            )}
            <div>
              <label className="dashboard-label" htmlFor="product-min">Stok minimum</label>
              <input
                id="product-min"
                type="number"
                min={0}
                className="dashboard-input"
                value={form.minStock}
                onChange={(event) => patchForm({ minStock: event.target.value })}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => patchForm({ active: event.target.checked })}
              className="h-4 w-4 accent-[#FF5A1F]"
            />
            Produk aktif dan dapat dijual
          </label>

          <div className="rounded-xl border border-black/[0.07] p-4 dark:border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200">
                  Resep / BOM
                </p>
                <p className="mt-0.5 text-[10px] text-gray-400">
                  Stok bahan otomatis berkurang saat produk terjual.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  patchForm({ recipe: [...form.recipe, { ingredientId: '', quantity: '1' }] })
                }
              >
                <Plus className="h-3.5 w-3.5" /> Bahan
              </Button>
            </div>
            <div className="mt-3 space-y-2">
              {form.recipe.map((row, index) => (
                <div key={index} className="flex flex-col gap-2 sm:flex-row">
                  <select
                    className="dashboard-input flex-1"
                    value={row.ingredientId}
                    onChange={(event) => {
                      const next = [...form.recipe];
                      next[index] = { ...next[index], ingredientId: event.target.value };
                      patchForm({ recipe: next });
                    }}
                  >
                    <option value="">Pilih bahan</option>
                    {ingredients.map((ingredient) => (
                      <option key={ingredient.id} value={ingredient.id}>
                        {ingredient.name} ({ingredient.unit})
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={0.001}
                      step="any"
                      className="dashboard-input w-28"
                      value={row.quantity}
                      onChange={(event) => {
                        const next = [...form.recipe];
                        next[index] = { ...next[index], quantity: event.target.value };
                        patchForm({ recipe: next });
                      }}
                      aria-label="Jumlah bahan"
                    />
                    <span className="flex w-12 items-center text-xs text-gray-400">
                      {ingredientMap.get(row.ingredientId)?.unit || 'unit'}
                    </span>
                    <button
                      type="button"
                      onClick={() => patchForm({ recipe: form.recipe.filter((_, i) => i !== index) })}
                      className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                      aria-label="Hapus bahan"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {!form.recipe.length ? (
                <p className="py-3 text-center text-[11px] text-gray-400">
                  Belum ada bahan pada resep. Produk tetap bisa dijual tanpa resep.
                </p>
              ) : null}
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={archive}
        loading={archiving}
        title={archiveTarget?.active ? 'Arsipkan produk?' : 'Aktifkan produk?'}
        description={
          archiveTarget?.active
            ? `${archiveTarget?.name} tidak akan muncul di pilihan penjualan baru. Riwayat transaksi tetap tersimpan.`
            : `${archiveTarget?.name} akan kembali tersedia di pilihan penjualan.`
        }
        confirmLabel={archiveTarget?.active ? 'Arsipkan' : 'Aktifkan'}
        destructive={!!archiveTarget?.active}
      />
    </>
  );
}
