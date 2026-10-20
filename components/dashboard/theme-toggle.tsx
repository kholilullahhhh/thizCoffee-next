'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const dark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      aria-label={dark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/[0.08] bg-white text-gray-500 transition hover:border-[#FF5A1F]/40 hover:text-[#FF5A1F] dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-300"
    >
      {mounted && dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
