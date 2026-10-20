'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, LockKeyhole, Mail } from 'lucide-react';
import { toast } from 'sonner';

export function LoginForm({
  nextPath,
  showDemo,
}: {
  nextPath: string;
  showDemo: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error || 'Tidak dapat masuk. Coba lagi.');
        return;
      }
      toast.success('Berhasil masuk. Selamat bekerja!');
      router.replace(nextPath);
      router.refresh();
    } catch {
      setError('Tidak dapat menghubungi server. Periksa koneksi Anda.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label htmlFor="email" className="dashboard-label">
          Email
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            id="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="dashboard-input pl-10"
            placeholder="nama@thiz.coffee"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="dashboard-label">
            Password
          </label>
          <span className="text-xs text-gray-400">Minimal 8 karakter</span>
        </div>
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="dashboard-input pl-10 pr-11"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 transition hover:text-[#FF5A1F]"
            aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
        >
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#FF5A1F] px-5 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-[#E04A10] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {loading ? 'Memeriksa...' : 'Masuk ke dashboard'}
      </button>

      {showDemo ? (
        <div className="rounded-xl border border-dashed border-[#FF5A1F]/40 bg-[#FF5A1F]/5 p-4 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
          <p className="mb-2 font-bold uppercase tracking-wider text-[#FF5A1F]">
            Akun development
          </p>
          <p>owner@thiz.coffee · staff@thiz.coffee · inventory@thiz.coffee</p>
          <p>
            Password: <span className="font-mono font-semibold">thizcoffee123</span>
          </p>
          <p className="mt-2 text-[11px] text-gray-400">
            Kredensial demo hanya ditampilkan saat development.
          </p>
        </div>
      ) : null}
    </form>
  );
}
