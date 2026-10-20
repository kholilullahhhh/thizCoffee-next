'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowUpRight,
  Boxes,
  ChevronRight,
  Coffee,
  ExternalLink,
  FileBarChart,
  LayoutDashboard,
  Menu,
  Package,
  ReceiptText,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  Wallet,
  Warehouse,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { initials } from '@/lib/format';
import type { Role, SessionUser } from '@/lib/types';
import { ThemeToggle } from '@/components/dashboard/theme-toggle';
import { LogoutButton } from '@/components/dashboard/logout-button';
import { buttonClass } from '@/components/dashboard/ui';

const allRoles: Role[] = ['OWNER', 'STAFF', 'INVENTORY'];

const navigation: Array<{
  label: string;
  items: Array<{
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    roles: Role[];
    exact?: boolean;
  }>;
}> = [
  {
    label: 'Ringkasan',
    items: [
      {
        href: '/dashboard',
        label: 'Overview',
        icon: LayoutDashboard,
        roles: allRoles,
        exact: true,
      },
    ],
  },
  {
    label: 'Operasional',
    items: [
      {
        href: '/dashboard/sales',
        label: 'Penjualan',
        icon: ShoppingCart,
        roles: ['OWNER', 'STAFF'],
      },
      {
        href: '/dashboard/orders',
        label: 'Pesanan',
        icon: ReceiptText,
        roles: ['OWNER', 'STAFF'],
      },
      {
        href: '/dashboard/products',
        label: 'Produk',
        icon: Package,
        roles: ['OWNER', 'STAFF', 'INVENTORY'],
      },
      {
        href: '/dashboard/inventory',
        label: 'Inventaris',
        icon: Warehouse,
        roles: ['OWNER', 'INVENTORY'],
      },
    ],
  },
  {
    label: 'Bisnis',
    items: [
      {
        href: '/dashboard/finance',
        label: 'Keuangan',
        icon: Wallet,
        roles: ['OWNER'],
      },
      {
        href: '/dashboard/reports',
        label: 'Laporan',
        icon: FileBarChart,
        roles: ['OWNER'],
      },
      {
        href: '/dashboard/customers',
        label: 'Pelanggan',
        icon: Users,
        roles: ['OWNER', 'STAFF'],
      },
      {
        href: '/dashboard/suppliers',
        label: 'Pemasok',
        icon: Truck,
        roles: ['OWNER', 'INVENTORY'],
      },
    ],
  },
  {
    label: 'Sistem',
    items: [
      {
        href: '/dashboard/settings',
        label: 'Pengaturan',
        icon: Settings,
        roles: ['OWNER'],
      },
    ],
  },
];

const roleLabels: Record<Role, string> = {
  OWNER: 'Owner / Admin',
  STAFF: 'Staff Penjualan',
  INVENTORY: 'Staff Inventaris',
};

function currentTitle(pathname: string): string {
  const found = navigation
    .flatMap((section) => section.items)
    .filter((item) =>
      item.exact ? pathname === item.href : pathname.startsWith(item.href)
    )
    .sort((a, b) => b.href.length - a.href.length)[0];
  if (pathname === '/dashboard') return 'Overview';
  if (pathname.startsWith('/dashboard/orders/')) return 'Detail Pesanan';
  return found?.label || 'Dashboard';
}

export function DashboardShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const sections = navigation.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.roles.includes(user.role)),
  }));

  return (
    <div className="min-h-screen bg-[#F4F3EF] text-gray-900 dark:bg-[#0B0B0C] dark:text-gray-100">
      {/* Mobile backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden print:hidden',
          mobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={() => setMobileOpen(false)}
        aria-hidden
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[268px] flex-col bg-[#0A0A0A] text-white transition-transform duration-200 lg:translate-x-0 print:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-white/[0.07] px-5">
          <Link href="/dashboard" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FF5A1F] text-white shadow-lg shadow-[#FF5A1F]/25">
              <Coffee className="h-[18px] w-[18px]" strokeWidth={2.6} />
            </span>
            <span>
              <span className="font-display block text-xl leading-none tracking-[0.18em]">
                THIZ COFFEE
              </span>
              <span className="mt-0.5 block text-[8px] font-bold uppercase tracking-[0.28em] text-gray-500">
                Business dashboard
              </span>
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Tutup menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="menu-scroll flex-1 overflow-y-auto px-3 py-5">
          {sections.map((section) =>
            section.items.length ? (
              <div key={section.label} className="mb-5">
                <p className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.24em] text-gray-600">
                  {section.label}
                </p>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const active = item.exact
                      ? pathname === item.href
                      : pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition',
                          active
                            ? 'bg-[#FF5A1F] text-white shadow-lg shadow-[#FF5A1F]/15'
                            : 'text-gray-400 hover:bg-white/[0.06] hover:text-white'
                        )}
                      >
                        <item.icon
                          className={cn(
                            'h-[17px] w-[17px]',
                            active ? 'text-white' : 'text-gray-500 group-hover:text-[#FF8A5C]'
                          )}
                        />
                        {item.label}
                        {active ? (
                          <ChevronRight className="ml-auto h-3.5 w-3.5 text-white/60" />
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : null
          )}
        </nav>

        <div className="border-t border-white/[0.07] p-3">
          {['OWNER', 'STAFF'].includes(user.role) ? (
            <Link
              href="/dashboard/sales?new=1"
              className="mb-3 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs font-semibold text-white transition hover:border-[#FF5A1F]/40 hover:bg-[#FF5A1F]/10"
            >
              <span className="flex items-center gap-2">
                <ShoppingCart className="h-3.5 w-3.5 text-[#FF5A1F]" /> Catat penjualan
              </span>
              <ArrowUpRight className="h-3.5 w-3.5 text-gray-500" />
            </Link>
          ) : null}

          <div className="rounded-xl bg-white/[0.035] p-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FF5A1F]/15 text-[11px] font-bold text-[#FF8A5C]">
                {initials(user.name) || 'TH'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white">{user.name}</p>
                <p className="truncate text-[9px] uppercase tracking-wider text-gray-500">
                  {roleLabels[user.role]}
                </p>
              </div>
              <LogoutButton compact />
            </div>
          </div>

          <Link
            href="/"
            target="_blank"
            className="mt-2 flex items-center gap-2 rounded-lg px-2.5 py-2 text-[10px] text-gray-600 transition hover:text-gray-300"
          >
            <ExternalLink className="h-3 w-3" /> Lihat landing page
          </Link>
        </div>
      </aside>

      <div className="lg:pl-[268px] print:pl-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-black/[0.06] bg-[#F4F3EF]/90 px-4 backdrop-blur-md sm:px-6 lg:px-8 dark:border-white/[0.06] dark:bg-[#0B0B0C]/90 print:hidden">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/[0.08] bg-white text-gray-600 lg:hidden dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-300"
              aria-label="Buka menu"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-gray-400 dark:text-gray-500">
                THIZ Coffee · Makassar
              </p>
              <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                {currentTitle(pathname)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/reports"
              className={cn(
                buttonClass('outline', 'sm'),
                'hidden sm:inline-flex',
                !['OWNER'].includes(user.role) && 'hidden'
              )}
            >
              <Boxes className="h-3.5 w-3.5" /> Laporan harian
            </Link>
            <Link
              href="/dashboard/sales?new=1"
              className={cn(
                buttonClass('primary', 'sm'),
                !['OWNER', 'STAFF'].includes(user.role) && 'hidden'
              )}
            >
              <ShoppingCart className="h-3.5 w-3.5" /> Penjualan baru
            </Link>
            <ThemeToggle />
            <span className="hidden h-9 w-9 items-center justify-center rounded-xl bg-[#0A0A0A] text-[11px] font-bold text-white sm:flex dark:bg-[#FF5A1F]">
              {initials(user.name)}
            </span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8 print:max-w-none print:p-0">
          {children}
        </main>
      </div>
    </div>
  );
}
