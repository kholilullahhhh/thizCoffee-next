'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/dashboard/ui';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center py-24 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300">
        <AlertTriangle className="h-6 w-6" />
      </span>
      <h1 className="font-display mt-5 text-3xl leading-none text-gray-900 dark:text-white">
        DATA GAGAL DIMUAT
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
        Terjadi kesalahan saat mengambil data dashboard. Periksa koneksi database lalu coba lagi.
        Tidak ada transaksi yang hilang; operasi bisnis dibungkus transaksi database.
      </p>
      {error.digest ? (
        <p className="mt-2 font-mono text-[10px] text-gray-400">Ref: {error.digest}</p>
      ) : null}
      <Button onClick={reset} className="mt-6">
        <RefreshCw className="h-4 w-4" /> Coba lagi
      </Button>
    </div>
  );
}
