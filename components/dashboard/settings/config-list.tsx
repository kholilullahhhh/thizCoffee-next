'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, EmptyState } from '@/components/dashboard/ui';
import { Modal } from '@/components/dashboard/modal';

export type ConfigKind =
  | 'payment-methods'
  | 'order-channels'
  | 'product-categories'
  | 'financial-categories';

interface ConfigItem {
  id: string;
  name: string;
  code?: string | null;
  kind?: string | null;
  active: boolean;
  isSystem?: boolean;
}

const financialKinds: Record<string, string> = {
  OTHER_INCOME: 'Pemasukan lain',
  OPERATING_EXPENSE: 'Biaya operasional',
  INVENTORY_PURCHASE: 'Pembelian persediaan',
  SALES: 'Penjualan (sistem)',
  REFUND: 'Refund (sistem)',
  CAPITAL: 'Modal / saldo awal (sistem)',
};

function labels(kind: ConfigKind) {
  if (kind === 'payment-methods') {
    return { name: 'Metode pembayaran', item: 'Metode', hasCode: true, hasKind: false };
  }
  if (kind === 'order-channels') {
    return { name: 'Kanal pesanan', item: 'Kanal', hasCode: true, hasKind: false };
  }
  if (kind === 'product-categories') {
    return { name: 'Kategori produk', item: 'Kategori', hasCode: false, hasKind: false };
  }
  return { name: 'Kategori keuangan', item: 'Kategori', hasCode: false, hasKind: true };
}

export function ConfigList({
  kind,
  items,
  description,
}: {
  kind: ConfigKind;
  items: ConfigItem[];
  description?: string;
}) {
  const router = useRouter();
  const meta = labels(kind);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ConfigItem | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [financialKind, setFinancialKind] = useState('OPERATING_EXPENSE');
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setEditing(null);
    setName('');
    setCode('');
    setFinancialKind('OPERATING_EXPENSE');
    setOpen(true);
  }

  function openEdit(item: ConfigItem) {
    setEditing(item);
    setName(item.name);
    setCode(item.code || '');
    setFinancialKind(item.kind || 'OPERATING_EXPENSE');
    setOpen(true);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { name };
      if (meta.hasCode && !editing) payload.code = code;
      if (meta.hasKind && !editing) payload.kind = financialKind;
      const url = editing ? `/api/config/${kind}/${editing.id}` : `/api/config/${kind}`;
      const response = await fetch(url, {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Gagal menyimpan konfigurasi.');
      toast.success(editing ? 'Konfigurasi diperbarui.' : 'Konfigurasi ditambahkan.');
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menyimpan konfigurasi.');
    } finally {
      setSaving(false);
    }
  }

  async function toggle(item: ConfigItem) {
    if (item.isSystem && item.active) {
      toast.error('Kategori sistem tidak dapat dinonaktifkan.');
      return;
    }
    try {
      const response = await fetch(`/api/config/${kind}/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !item.active }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Gagal mengubah status.');
      toast.success(item.active ? 'Item dinonaktifkan.' : 'Item diaktifkan kembali.');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal mengubah status.');
    }
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200">
            {meta.name}
          </p>
          {description ? <p className="mt-0.5 text-[10px] text-gray-400">{description}</p> : null}
        </div>
        <Button onClick={openCreate} size="sm" variant="outline">
          <Plus className="h-3.5 w-3.5" /> Tambah
        </Button>
      </div>

      <div className="mt-3 divide-y divide-black/[0.05] rounded-xl border border-black/[0.06] dark:divide-white/[0.05] dark:border-white/10">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 px-3 py-2.5">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${
                item.active ? 'bg-[#FF5A1F]' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-gray-800 dark:text-gray-100">
                {item.name}
              </p>
              <p className="truncate text-[10px] text-gray-400">
                {item.code ? <span className="font-mono">{item.code}</span> : null}
                {item.code && item.kind ? ' · ' : ''}
                {item.kind ? financialKinds[item.kind] || item.kind : ''}
              </p>
            </div>
            <Badge tone={item.active ? 'green' : 'neutral'}>
              {item.active ? 'Aktif' : 'Nonaktif'}
            </Badge>
            {item.isSystem ? (
              <span className="flex h-7 w-7 items-center justify-center text-gray-300 dark:text-gray-600" title="Kategori sistem">
                <Lock className="h-3 w-3" />
              </span>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => openEdit(item)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-[#FF5A1F]/10 hover:text-[#FF5A1F]"
                  aria-label={`Edit ${item.name}`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => toggle(item)}
                  className="rounded-md px-1.5 py-1 text-[9px] font-bold uppercase tracking-wide text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                >
                  {item.active ? 'Off' : 'On'}
                </button>
              </>
            )}
          </div>
        ))}
        {!items.length ? (
          <EmptyState
            icon={<Plus className="h-4 w-4" />}
            title={`Belum ada ${meta.item.toLowerCase()}`}
            description="Tambahkan konfigurasi baru untuk dipakai di seluruh dashboard."
            className="py-8"
          />
        ) : null}
      </div>

      <Modal
        open={open}
        onClose={() => !saving && setOpen(false)}
        title={editing ? `EDIT ${meta.item.toUpperCase()}` : `${meta.item.toUpperCase()} BARU`}
        description={
          meta.hasKind
            ? 'Kategori keuangan manual hanya untuk pemasukan lain, biaya operasional, atau pembelian persediaan.'
            : undefined
        }
        size="sm"
        footer={
          <>
            <Button variant="outline" type="button" onClick={() => setOpen(false)} disabled={saving}>
              Batal
            </Button>
            <Button type="submit" form="config-form" loading={saving}>
              Simpan
            </Button>
          </>
        }
      >
        <form id="config-form" onSubmit={submit} className="space-y-4">
          <div>
            <label className="dashboard-label" htmlFor="cfg-name">Nama</label>
            <input
              id="cfg-name"
              className="dashboard-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              minLength={2}
            />
          </div>
          {meta.hasCode && !editing ? (
            <div>
              <label className="dashboard-label" htmlFor="cfg-code">Kode unik</label>
              <input
                id="cfg-code"
                className="dashboard-input font-mono uppercase"
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                placeholder="Contoh: BCA, GRABFOOD"
                required
                minLength={2}
              />
              <p className="mt-1 text-[10px] text-gray-400">
                Kode dipakai di API dan tidak dapat diubah setelah dibuat.
              </p>
            </div>
          ) : null}
          {meta.hasKind && !editing ? (
            <div>
              <label className="dashboard-label" htmlFor="cfg-kind">Jenis kategori</label>
              <select
                id="cfg-kind"
                className="dashboard-input"
                value={financialKind}
                onChange={(event) => setFinancialKind(event.target.value)}
              >
                <option value="OPERATING_EXPENSE">Biaya operasional</option>
                <option value="OTHER_INCOME">Pemasukan lain</option>
                <option value="INVENTORY_PURCHASE">Pembelian persediaan</option>
              </select>
            </div>
          ) : null}
        </form>
      </Modal>
    </>
  );
}
