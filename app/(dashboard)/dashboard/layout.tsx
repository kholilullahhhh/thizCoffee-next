import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/session';
import { DashboardShell } from '@/components/dashboard/shell';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Dashboard · THIZ COFFEE',
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser('/dashboard');
  return <DashboardShell user={user}>{children}</DashboardShell>;
}
