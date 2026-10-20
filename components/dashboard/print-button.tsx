'use client';

import { Printer } from 'lucide-react';
import { Button } from '@/components/dashboard/ui';

export function PrintButton({ label = 'Cetak laporan' }: { label?: string }) {
  return (
    <Button variant="outline" onClick={() => window.print()}>
      <Printer className="h-4 w-4" /> {label}
    </Button>
  );
}
