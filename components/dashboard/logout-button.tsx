'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, LogOut } from 'lucide-react';
import { toast } from 'sonner';

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || 'Gagal keluar.');
      }
      router.replace('/login');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal keluar.');
      setLoading(false);
    }
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={logout}
        disabled={loading}
        aria-label="Keluar"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={loading}
      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-gray-400 transition hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
      Keluar dari dashboard
    </button>
  );
}
