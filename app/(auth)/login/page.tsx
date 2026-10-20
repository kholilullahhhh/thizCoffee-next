import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, Coffee, ShieldCheck, TrendingUp, Wallet } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/session';
import { LoginForm } from '@/components/auth/login-form';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: { next?: string };
}) {
  const user = await getCurrentUser();
  if (user) redirect('/dashboard');

  const requested = searchParams?.next;
  const nextPath =
    requested && requested.startsWith('/dashboard') ? requested : '/dashboard';

  return (
    <main className="min-h-screen bg-[#F6F5F2] lg:grid lg:grid-cols-[1.05fr_1fr] dark:bg-[#0B0B0C]">
      <section className="relative hidden overflow-hidden bg-[#0A0A0A] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-32 -top-32 h-80 w-80 rounded-full bg-[#FF5A1F]/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full border border-white/5" />
        <div className="relative">
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF5A1F]">
              <Coffee className="h-5 w-5" strokeWidth={2.5} />
            </span>
            <span className="font-display text-2xl tracking-[0.22em]">THIZ COFFEE</span>
          </Link>

          <div className="mt-24 max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#FF8A5C]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FF5A1F]" />
              Business command center
            </span>
            <h1 className="font-display mt-6 text-6xl leading-[0.92] xl:text-7xl">
              KELOLA THIZ,
              <br />
              <span className="text-[#FF5A1F]">DARI SATU TEMPAT.</span>
            </h1>
            <p className="mt-6 max-w-md text-sm leading-relaxed text-gray-400">
              Penjualan, stok, pesanan, dan arus kas mengalir dalam satu sistem yang
              konsisten. Dibuat untuk operasional kopi botolan Makassar.
            </p>
          </div>
        </div>

        <div className="relative grid grid-cols-3 gap-4">
          {[
            { icon: TrendingUp, label: 'Penjualan harian', value: 'Real-time' },
            { icon: Wallet, label: 'Arus kas', value: 'Terlacak' },
            { icon: ShieldCheck, label: 'Akses peran', value: 'Aman' },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <item.icon className="h-4 w-4 text-[#FF5A1F]" />
              <p className="mt-3 text-sm font-bold text-white">{item.value}</p>
              <p className="mt-0.5 text-[11px] uppercase tracking-wider text-gray-500">
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center justify-between lg:hidden">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FF5A1F] text-white">
                <Coffee className="h-4 w-4" strokeWidth={2.5} />
              </span>
              <span className="font-display text-xl tracking-[0.2em] text-[#0A0A0A] dark:text-white">
                THIZ COFFEE
              </span>
            </Link>
          </div>

          <div className="mb-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#FF5A1F]">
              Dashboard internal
            </p>
            <h2 className="font-display mt-3 text-4xl text-[#0A0A0A] dark:text-white">
              SELAMAT DATANG
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Masuk dengan akun tim THIZ COFFEE untuk melanjutkan.
            </p>
          </div>

          <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm sm:p-8 dark:border-white/10 dark:bg-[#141414]">
            <LoginForm nextPath={nextPath} showDemo={process.env.NODE_ENV !== 'production'} />
          </div>

          <div className="mt-6 flex items-center justify-between text-xs text-gray-400">
            <Link href="/" className="inline-flex items-center gap-1.5 hover:text-[#FF5A1F]">
              <ArrowLeft className="h-3.5 w-3.5" />
              Kembali ke website
            </Link>
            <span>THIZ COFFEE · Makassar</span>
          </div>
        </div>
      </section>
    </main>
  );
}
