'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Ban } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/dashboard/ui';
import { Modal } from '@/components/dashboard/modal';

export function VoidEntryButton({
  entryId,
  description,
  amount,
  canVoid,
  isVoided,
}: {
  entryId: string;
  description: string;
  amount: string;
  canVoid: boolean;
  isVoided: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  if (isVoided) {
    return <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Void</span>;
  }
  if (!canVoid) {
    return <span className="text-[10px] text-gray-300 dark:text-gray-600">Terkunci</span>;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch(`/api/finance/${entryId}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Gagal membatalkan transaksi.');
      toast.success('Transaksi di-void dan audit log tercatat.');
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal membatalkan transaksi.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-semibold text-gray-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
      >
        <Ban className="h-3 w-3" /> Void
      </button>
      <Modal
        open={open}
        onClose={() => !saving && setOpen(false)}
        title="VOID TRANSAKSI"
        description="Transaksi tidak dihapus, tetapi ditandai batal dan tetap tersedia di audit trail."
        size="sm"
        footer={
          <>
            <Button variant="outline" type="button" onClick={() => setOpen(false)} disabled={saving}>Batal</Button>
            <Button variant="danger" type="submit" form="void-form" loading={saving}>Void transaksi</Button>
          </>
        }
      >
        <form id="void-form" onSubmit={submit}>
          <div className="rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300">
            <p className="font-semibold">{description}</p>
            <p className="mt-1">Nominal {amount}</p>
          </div>
          <div className="mt-4">
            <label className="dashboard-label" htmlFor="void-reason">Alasan void</label>
            <textarea
              id="void-reason"
              className="dashboard-textarea"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              required
              minLength={4}
              placeholder="Contoh: Salah input nominal, transaksi benar sudah dicatat ulang."
            />
          </div>
        </form>
      </Modal>
    </>
  );
}
