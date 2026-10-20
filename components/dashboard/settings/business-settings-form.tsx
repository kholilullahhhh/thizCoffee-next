'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Store } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/dashboard/ui';

export function BusinessSettingsForm({
  initial,
}: {
  initial: {
    businessName: string;
    phone: string;
    email: string;
    address: string;
    dailyTarget: number;
    defaultDeliveryFee: number;
    receiptNote: string;
  };
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    businessName: initial.businessName,
    phone: initial.phone,
    email: initial.email,
    address: initial.address,
    dailyTarget: String(initial.dailyTarget),
    defaultDeliveryFee: String(initial.defaultDeliveryFee),
    receiptNote: initial.receiptNote,
  });
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          dailyTarget: Number(form.dailyTarget),
          defaultDeliveryFee: Number(form.defaultDeliveryFee),
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Gagal menyimpan pengaturan.');
      toast.success('Pengaturan bisnis diperbarui.');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menyimpan pengaturan.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="dashboard-label" htmlFor="set-name">Nama bisnis</label>
          <input
            id="set-name"
            className="dashboard-input"
            value={form.businessName}
            onChange={(event) => setForm({ ...form, businessName: event.target.value })}
            required
          />
        </div>
        <div>
          <label className="dashboard-label" htmlFor="set-phone">Telepon / WhatsApp</label>
          <input
            id="set-phone"
            className="dashboard-input"
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
            required
          />
        </div>
        <div>
          <label className="dashboard-label" htmlFor="set-email">Email bisnis</label>
          <input
            id="set-email"
            type="email"
            className="dashboard-input"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            required
          />
        </div>
        <div className="sm:col-span-2">
          <label className="dashboard-label" htmlFor="set-address">Alamat</label>
          <textarea
            id="set-address"
            className="dashboard-textarea min-h-[72px]"
            value={form.address}
            onChange={(event) => setForm({ ...form, address: event.target.value })}
            required
          />
        </div>
        <div>
          <label className="dashboard-label" htmlFor="set-target">Target omzet harian (Rp)</label>
          <input
            id="set-target"
            type="number"
            min={0}
            step={50000}
            className="dashboard-input"
            value={form.dailyTarget}
            onChange={(event) => setForm({ ...form, dailyTarget: event.target.value })}
          />
        </div>
        <div>
          <label className="dashboard-label" htmlFor="set-delivery">Ongkir default (Rp)</label>
          <input
            id="set-delivery"
            type="number"
            min={0}
            step={500}
            className="dashboard-input"
            value={form.defaultDeliveryFee}
            onChange={(event) => setForm({ ...form, defaultDeliveryFee: event.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="dashboard-label" htmlFor="set-note">Catatan struk</label>
          <input
            id="set-note"
            className="dashboard-input"
            value={form.receiptNote}
            onChange={(event) => setForm({ ...form, receiptNote: event.target.value })}
          />
        </div>
        <div className="rounded-xl border border-dashed border-black/10 px-3.5 py-2.5 text-[10px] leading-relaxed text-gray-400 sm:col-span-2 dark:border-white/10">
          <Store className="mr-1 inline h-3 w-3" />
          Zona waktu bisnis terkunci ke <strong>Asia/Makassar (WITA, UTC+8)</strong> agar batas hari
          laporan dan omzet konsisten dengan operasional Makassar.
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" loading={saving}>
          <Save className="h-4 w-4" /> Simpan pengaturan
        </Button>
      </div>
    </form>
  );
}
