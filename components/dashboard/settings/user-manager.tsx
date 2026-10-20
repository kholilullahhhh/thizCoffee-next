'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Pencil, Plus, ShieldCheck, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/format';
import { Badge, Button, EmptyState } from '@/components/dashboard/ui';
import { Modal } from '@/components/dashboard/modal';

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
}

const roleMeta: Record<string, { label: string; tone: 'orange' | 'blue' | 'purple' }> = {
  OWNER: { label: 'Owner', tone: 'orange' },
  STAFF: { label: 'Staff penjualan', tone: 'blue' },
  INVENTORY: { label: 'Staff inventaris', tone: 'purple' },
};

export function UserManager({
  users,
  currentUserId,
}: {
  users: UserRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('STAFF');
  const [password, setPassword] = useState('');
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setEditing(null);
    setName('');
    setEmail('');
    setRole('STAFF');
    setPassword('');
    setActive(true);
    setOpen(true);
  }

  function openEdit(row: UserRow) {
    setEditing(row);
    setName(row.name);
    setEmail(row.email);
    setRole(row.role);
    setPassword('');
    setActive(row.active);
    setOpen(true);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { name, role, active };
      if (!editing) {
        payload.email = email;
        payload.password = password;
      } else if (password) {
        payload.password = password;
      }
      const response = await fetch(editing ? `/api/users/${editing.id}` : '/api/users', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Gagal menyimpan akun.');
      toast.success(editing ? 'Akun diperbarui.' : 'Akun baru dibuat.');
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menyimpan akun.');
    } finally {
      setSaving(false);
    }
  }

  async function toggle(row: UserRow) {
    if (row.id === currentUserId && row.active) {
      toast.error('Anda tidak dapat menonaktifkan akun sendiri.');
      return;
    }
    try {
      const response = await fetch(`/api/users/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !row.active }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Gagal mengubah status akun.');
      toast.success(row.active ? 'Akun dinonaktifkan dan sesi dicabut.' : 'Akun diaktifkan.');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal mengubah status akun.');
    }
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200">
            Akun & akses
          </p>
          <p className="mt-0.5 text-[10px] text-gray-400">
            Hak akses diperiksa di server pada setiap halaman dan API.
          </p>
        </div>
        <Button onClick={openCreate} size="sm" variant="outline">
          <Plus className="h-3.5 w-3.5" /> Akun
        </Button>
      </div>

      <div className="mt-3 divide-y divide-black/[0.05] rounded-xl border border-black/[0.06] dark:divide-white/[0.05] dark:border-white/10">
        {users.map((row) => (
          <div key={row.id} className="flex items-center gap-3 px-3 py-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FF5A1F]/10 text-[#FF5A1F]">
              <UserRound className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-gray-800 dark:text-gray-100">
                {row.name}
                {row.id === currentUserId ? <span className="ml-1 text-[9px] text-gray-400">(Anda)</span> : null}
              </p>
              <p className="truncate text-[10px] text-gray-400">{row.email}</p>
            </div>
            <Badge tone={roleMeta[row.role]?.tone || 'blue'}>
              {roleMeta[row.role]?.label || row.role}
            </Badge>
            <Badge tone={row.active ? 'green' : 'neutral'}>{row.active ? 'Aktif' : 'Off'}</Badge>
            <button
              type="button"
              onClick={() => openEdit(row)}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-[#FF5A1F]/10 hover:text-[#FF5A1F]"
              aria-label={`Edit ${row.name}`}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => toggle(row)}
              disabled={row.id === currentUserId && row.active}
              className="rounded-md px-1.5 py-1 text-[9px] font-bold uppercase tracking-wide text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 dark:hover:bg-red-500/10"
            >
              {row.active ? 'Off' : 'On'}
            </button>
          </div>
        ))}
        {!users.length ? (
          <EmptyState icon={<ShieldCheck className="h-4 w-4" />} title="Belum ada akun" className="py-8" />
        ) : null}
      </div>

      <Modal
        open={open}
        onClose={() => !saving && setOpen(false)}
        title={editing ? 'EDIT AKUN' : 'AKUN BARU'}
        description={
          editing
            ? 'Perubahan role langsung berlaku. Reset password mencabut semua sesi akun tersebut.'
            : 'Password disimpan sebagai hash scrypt. Jangan bagikan kredensial melalui kanal publik.'
        }
        size="sm"
        footer={
          <>
            <Button variant="outline" type="button" onClick={() => setOpen(false)} disabled={saving}>
              Batal
            </Button>
            <Button type="submit" form="user-form" loading={saving}>
              {editing ? 'Simpan perubahan' : 'Buat akun'}
            </Button>
          </>
        }
      >
        <form id="user-form" onSubmit={submit} className="space-y-4">
          <div>
            <label className="dashboard-label" htmlFor="user-name">Nama lengkap</label>
            <input
              id="user-name"
              className="dashboard-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              minLength={2}
            />
          </div>
          {!editing ? (
            <div>
              <label className="dashboard-label" htmlFor="user-email">Email</label>
              <input
                id="user-email"
                type="email"
                className="dashboard-input"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
          ) : null}
          <div>
            <label className="dashboard-label" htmlFor="user-role">Role</label>
            <select
              id="user-role"
              className="dashboard-input"
              value={role}
              onChange={(event) => setRole(event.target.value)}
            >
              <option value="OWNER">OWNER — akses penuh</option>
              <option value="STAFF">STAFF — penjualan, pesanan, pelanggan</option>
              <option value="INVENTORY">INVENTORY — produk, stok, pemasok</option>
            </select>
          </div>
          <div>
            <label className="dashboard-label" htmlFor="user-password">
              {editing ? 'Password baru (opsional)' : 'Password'}
            </label>
            <input
              id="user-password"
              type="password"
              className="dashboard-input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required={!editing}
              minLength={8}
              autoComplete="new-password"
            />
            {editing ? (
              <p className="mt-1 flex items-center gap-1 text-[10px] text-gray-400">
                <KeyRound className="h-3 w-3" /> Kosongkan bila tidak ingin mereset password.
              </p>
            ) : null}
          </div>
          {editing ? (
            <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
              <input
                type="checkbox"
                checked={active}
                onChange={(event) => setActive(event.target.checked)}
                className="h-4 w-4 accent-[#FF5A1F]"
                disabled={editing.id === currentUserId}
              />
              Akun aktif (dapat login)
            </label>
          ) : null}
          {editing ? (
            <p className="text-[10px] text-gray-400">Dibuat {formatDate(editing.createdAt)}</p>
          ) : null}
        </form>
      </Modal>
    </>
  );
}
