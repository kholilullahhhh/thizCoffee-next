'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Pencil, Plus, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { formatNumber } from '@/lib/format';
import { Badge, Button, EmptyState } from '@/components/dashboard/ui';
import { Modal } from '@/components/dashboard/modal';

interface SupplierRow {
  id: string;
  name: string;
  contact: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  active: boolean;
  ingredientCount: number;
}

interface FormState {
  name: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  active: boolean;
}

function empty(): FormState {
  return { name: '', contact: '', phone: '', email: '', address: '', notes: '', active: true };
}

export function SupplierManager({ suppliers }: { suppliers: SupplierRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierRow | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm(empty());
    setOpen(true);
  }

  function openEdit(row: SupplierRow) {
    setEditing(row);
    setForm({
      name: row.name,
      contact: row.contact || '',
      phone: row.phone || '',
      email: row.email || '',
      address: row.address || '',
      notes: row.notes || '',
      active: row.active,
    });
    setOpen(true);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch(editing ? `/api/suppliers/${editing.id}` : '/api/suppliers', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          contact: form.contact || null,
          phone: form.phone || null,
          email: form.email || null,
          address: form.address || null,
          notes: form.notes || null,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Gagal menyimpan pemasok.');
      toast.success(editing ? 'Pemasok diperbarui.' : 'Pemasok baru ditambahkan.');
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menyimpan pemasok.');
    } finally {
      setSaving(false);
    }
  }

  async function toggle(row: SupplierRow) {
    try {
      const response = await fetch(`/api/suppliers/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !row.active }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Gagal mengubah status.');
      toast.success(row.active ? 'Pemasok dinonaktifkan.' : 'Pemasok diaktifkan kembali.');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal mengubah status.');
    }
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={openCreate}><Plus className="h-4 w-4" /> Pemasok baru</Button>
      </div>

      <div className="dashboard-table-shell">
        <div className="overflow-x-auto">
          <table className="dashboard-table min-w-[760px]">
            <thead>
              <tr>
                <th>Pemasok</th>
                <th>Kontak</th>
                <th>Telepon</th>
                <th>Alamat</th>
                <th className="text-right">Bahan terkait</th>
                <th>Status</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((row) => (
                <tr key={row.id}>
                  <td>
                    <p className="font-semibold text-gray-900 dark:text-white">{row.name}</p>
                    {row.notes ? <p className="mt-0.5 max-w-[220px] truncate text-[10px] text-gray-400">{row.notes}</p> : null}
                  </td>
                  <td className="text-xs">{row.contact || '-'}</td>
                  <td className="text-xs">
                    <p>{row.phone || '-'}</p>
                    {row.email ? <p className="text-[10px] text-gray-400">{row.email}</p> : null}
                  </td>
                  <td className="max-w-[220px] text-xs">{row.address || '-'}</td>
                  <td className="text-right text-xs font-semibold tabular-nums">{formatNumber(row.ingredientCount)}</td>
                  <td><Badge tone={row.active ? 'green' : 'neutral'}>{row.active ? 'Aktif' : 'Nonaktif'}</Badge></td>
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
                        onClick={() => toggle(row)}
                        className="rounded-lg px-2 py-1 text-[10px] font-semibold text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                      >
                        {row.active ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!suppliers.length ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      icon={<Truck className="h-5 w-5" />}
                      title="Pemasok tidak ditemukan"
                      description="Tambahkan pemasok bahan baku atau kemasan."
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
        title={editing ? 'EDIT PEMASOK' : 'PEMASOK BARU'}
        description="Hubungkan pemasok dengan bahan agar pembelian dan rekomendasi restock lebih mudah dilacak."
        footer={
          <>
            <Button variant="outline" type="button" onClick={() => setOpen(false)} disabled={saving}>Batal</Button>
            <Button type="submit" form="supplier-form" loading={saving}>
              {editing ? 'Simpan perubahan' : 'Tambah pemasok'}
            </Button>
          </>
        }
      >
        <form id="supplier-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="dashboard-label" htmlFor="sup-name">Nama pemasok</label>
            <input
              id="sup-name"
              className="dashboard-input"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
            />
          </div>
          <div>
            <label className="dashboard-label" htmlFor="sup-contact">Nama kontak</label>
            <input
              id="sup-contact"
              className="dashboard-input"
              value={form.contact}
              onChange={(event) => setForm({ ...form, contact: event.target.value })}
            />
          </div>
          <div>
            <label className="dashboard-label" htmlFor="sup-phone">Telepon / WhatsApp</label>
            <input
              id="sup-phone"
              className="dashboard-input"
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
            />
          </div>
          <div>
            <label className="dashboard-label" htmlFor="sup-email">Email</label>
            <input
              id="sup-email"
              type="email"
              className="dashboard-input"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
          </div>
          <div>
            <label className="dashboard-label" htmlFor="sup-address">Alamat</label>
            <input
              id="sup-address"
              className="dashboard-input"
              value={form.address}
              onChange={(event) => setForm({ ...form, address: event.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="dashboard-label" htmlFor="sup-notes">Catatan</label>
            <textarea
              id="sup-notes"
              className="dashboard-textarea min-h-[80px]"
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-600 sm:col-span-2 dark:text-gray-300">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => setForm({ ...form, active: event.target.checked })}
              className="h-4 w-4 accent-[#FF5A1F]"
            />
            Pemasok aktif
          </label>
        </form>
      </Modal>
    </>
  );
}
