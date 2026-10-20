'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { History, Pencil, Plus, UserRound, Users } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate, formatDateTime, formatIDR, formatNumber } from '@/lib/format';
import { Badge, Button, EmptyState, statusMeta } from '@/components/dashboard/ui';
import { Modal } from '@/components/dashboard/modal';

interface CustomerRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  active: boolean;
  orderCount: number;
  totalSpent: number;
  lastOrder: string | null;
}

interface HistoryOrder {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
}

interface FormState {
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  active: boolean;
}

function empty(): FormState {
  return { name: '', phone: '', email: '', address: '', notes: '', active: true };
}

export function CustomerManager({
  customers,
  history,
  canManage,
}: {
  customers: CustomerRow[];
  history: Record<string, HistoryOrder[]>;
  canManage: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerRow | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<CustomerRow | null>(null);

  function openCreate() {
    setEditing(null);
    setForm(empty());
    setOpen(true);
  }

  function openEdit(customer: CustomerRow) {
    setEditing(customer);
    setForm({
      name: customer.name,
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      notes: customer.notes || '',
      active: customer.active,
    });
    setOpen(true);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch(editing ? `/api/customers/${editing.id}` : '/api/customers', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          phone: form.phone || null,
          email: form.email || null,
          address: form.address || null,
          notes: form.notes || null,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Gagal menyimpan pelanggan.');
      toast.success(editing ? 'Data pelanggan diperbarui.' : 'Pelanggan baru ditambahkan.');
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menyimpan pelanggan.');
    } finally {
      setSaving(false);
    }
  }

  async function archive(customer: CustomerRow) {
    try {
      const response = await fetch(`/api/customers/${customer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !customer.active }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Gagal mengubah status.');
      toast.success(customer.active ? 'Pelanggan dinonaktifkan.' : 'Pelanggan diaktifkan kembali.');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal mengubah status.');
    }
  }

  return (
    <>
      {canManage ? (
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Pelanggan baru
        </Button>
      ) : null}

      <div className="dashboard-table-shell">
        <div className="overflow-x-auto">
          <table className="dashboard-table min-w-[820px]">
            <thead>
              <tr>
                <th>Pelanggan</th>
                <th>Kontak</th>
                <th>Alamat</th>
                <th className="text-right">Pesanan</th>
                <th className="text-right">Total belanja</th>
                <th>Terakhir</th>
                <th>Status</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <p className="font-semibold text-gray-900 dark:text-white">{customer.name}</p>
                    {customer.notes ? <p className="mt-0.5 max-w-[200px] truncate text-[10px] text-gray-400">{customer.notes}</p> : null}
                  </td>
                  <td className="text-xs">
                    <p>{customer.phone || '-'}</p>
                    {customer.email ? <p className="text-[10px] text-gray-400">{customer.email}</p> : null}
                  </td>
                  <td className="max-w-[220px] text-xs">{customer.address || '-'}</td>
                  <td className="text-right text-xs font-semibold tabular-nums">{formatNumber(customer.orderCount)}</td>
                  <td className="text-right text-xs font-semibold tabular-nums text-gray-900 dark:text-white">
                    {formatIDR(customer.totalSpent)}
                  </td>
                  <td className="whitespace-nowrap text-xs">{customer.lastOrder ? formatDate(customer.lastOrder) : '-'}</td>
                  <td><Badge tone={customer.active ? 'green' : 'neutral'}>{customer.active ? 'Aktif' : 'Nonaktif'}</Badge></td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setHistoryTarget(customer)}
                        className="rounded-lg p-2 text-gray-400 hover:bg-[#FF5A1F]/10 hover:text-[#FF5A1F]"
                        aria-label={`Riwayat ${customer.name}`}
                      >
                        <History className="h-3.5 w-3.5" />
                      </button>
                      {canManage ? (
                        <>
                          <button
                            type="button"
                            onClick={() => openEdit(customer)}
                            className="rounded-lg p-2 text-gray-400 hover:bg-[#FF5A1F]/10 hover:text-[#FF5A1F]"
                            aria-label={`Edit ${customer.name}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => archive(customer)}
                            className="rounded-lg px-2 py-1 text-[10px] font-semibold text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                          >
                            {customer.active ? 'Nonaktifkan' : 'Aktifkan'}
                          </button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {!customers.length ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState
                      icon={<Users className="h-5 w-5" />}
                      title="Pelanggan tidak ditemukan"
                      description="Tambahkan pelanggan baru atau ubah kata kunci pencarian."
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
        title={editing ? 'EDIT PELANGGAN' : 'PELANGGAN BARU'}
        description="Data pelanggan dipakai untuk menghubungkan transaksi dan riwayat pembelian."
        footer={
          <>
            <Button variant="outline" type="button" onClick={() => setOpen(false)} disabled={saving}>Batal</Button>
            <Button type="submit" form="customer-form" loading={saving}>
              {editing ? 'Simpan perubahan' : 'Tambah pelanggan'}
            </Button>
          </>
        }
      >
        <form id="customer-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="dashboard-label" htmlFor="cust-name">Nama</label>
            <input
              id="cust-name"
              className="dashboard-input"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
            />
          </div>
          <div>
            <label className="dashboard-label" htmlFor="cust-phone">No. WhatsApp</label>
            <input
              id="cust-phone"
              className="dashboard-input"
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
              placeholder="62812..."
            />
          </div>
          <div>
            <label className="dashboard-label" htmlFor="cust-email">Email</label>
            <input
              id="cust-email"
              type="email"
              className="dashboard-input"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="dashboard-label" htmlFor="cust-address">Alamat pengiriman</label>
            <textarea
              id="cust-address"
              className="dashboard-textarea min-h-[72px]"
              value={form.address}
              onChange={(event) => setForm({ ...form, address: event.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="dashboard-label" htmlFor="cust-notes">Catatan</label>
            <input
              id="cust-notes"
              className="dashboard-input"
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
            Pelanggan aktif
          </label>
        </form>
      </Modal>

      <Modal
        open={!!historyTarget}
        onClose={() => setHistoryTarget(null)}
        title={`RIWAYAT ${historyTarget?.name?.toUpperCase() || ''}`}
        description="Pesanan terbaru yang terhubung dengan pelanggan ini."
        size="lg"
      >
        <div className="space-y-2">
          {(historyTarget && history[historyTarget.id])?.map((order) => (
            <Link
              key={order.id}
              href={`/dashboard/orders/${order.id}`}
              className="flex items-center gap-3 rounded-xl border border-black/[0.06] px-3 py-2.5 transition hover:border-[#FF5A1F]/40 dark:border-white/10"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FF5A1F]/10 text-[#FF5A1F]">
                <UserRound className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">{order.orderNumber}</p>
                <p className="text-[10px] text-gray-400">{formatDateTime(order.createdAt)}</p>
              </div>
              <Badge tone={statusMeta[order.status]?.tone || 'neutral'}>
                {statusMeta[order.status]?.label || order.status}
              </Badge>
              <span className="w-24 text-right text-xs font-bold tabular-nums">{formatIDR(order.total)}</span>
            </Link>
          ))}
          {!historyTarget || !(history[historyTarget.id] || []).length ? (
            <p className="py-8 text-center text-xs text-gray-400">Belum ada riwayat pesanan.</p>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
