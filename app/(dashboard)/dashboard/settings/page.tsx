import Link from 'next/link';
import { Database, KeyRound, ScrollText, ShieldCheck, Store } from 'lucide-react';
import { getDb } from '@/lib/db';
import { requirePageRole } from '@/lib/auth/session';
import { PageHeader } from '@/components/dashboard/page-header';
import { buttonClass, Panel, SectionTitle } from '@/components/dashboard/ui';
import { BusinessSettingsForm } from '@/components/dashboard/settings/business-settings-form';
import { UserManager } from '@/components/dashboard/settings/user-manager';
import { ConfigList } from '@/components/dashboard/settings/config-list';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const user = await requirePageRole(['OWNER'], '/dashboard/settings');
  const db = await getDb();

  const [settingsRows, userRows, paymentRows, channelRows, categoryRows, financialRows] =
    await Promise.all([
      db.query<{
        business_name: string;
        phone: string;
        email: string;
        address: string;
        daily_target: unknown;
        default_delivery_fee: unknown;
        receipt_note: string;
      }>("SELECT * FROM business_settings WHERE id = 'default'"),
      db.query<{ id: string; name: string; email: string; role: string; active: boolean; created_at: string }>(
        'SELECT id, name, email, role, active, created_at FROM users ORDER BY active DESC, created_at ASC'
      ),
      db.query<{ id: string; code: string; name: string; active: boolean }>(
        'SELECT id, code, name, active FROM payment_methods ORDER BY sort_order, name'
      ),
      db.query<{ id: string; code: string; name: string; active: boolean }>(
        'SELECT id, code, name, active FROM order_channels ORDER BY sort_order, name'
      ),
      db.query<{ id: string; name: string; active: boolean }>(
        'SELECT id, name, active FROM product_categories ORDER BY name'
      ),
      db.query<{ id: string; name: string; kind: string; active: boolean; is_system: boolean }>(
        'SELECT id, name, kind, active, is_system FROM financial_categories ORDER BY kind, name'
      ),
    ]);

  const settings = settingsRows[0];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Administration"
        title="PENGATURAN"
        description="Profil bisnis, target, akun tim, metode pembayaran, kanal, dan kategori. Hanya OWNER yang dapat mengubah konfigurasi ini."
        actions={
          <Link href="/dashboard/settings/audit" className={buttonClass('outline', 'md')}>
            <ScrollText className="h-4 w-4" /> Audit log
          </Link>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
        <Panel className="p-5">
          <SectionTitle
            title="PROFIL BISNIS"
            description="Dipakai pada struk, laporan, dan target dashboard."
          />
          <div className="mt-5">
            <BusinessSettingsForm
              initial={{
                businessName: settings?.business_name || 'THIZ COFFEE',
                phone: settings?.phone || '',
                email: settings?.email || '',
                address: settings?.address || '',
                dailyTarget: Number(settings?.daily_target || 0),
                defaultDeliveryFee: Number(settings?.default_delivery_fee || 0),
                receiptNote: settings?.receipt_note || '',
              }}
            />
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel className="p-5">
            <UserManager
              currentUserId={user.id}
              users={userRows.map((row) => ({
                id: row.id,
                name: row.name,
                email: row.email,
                role: row.role,
                active: row.active,
                createdAt: row.created_at,
              }))}
            />
          </Panel>

          <Panel className="p-5">
            <SectionTitle title="KEAMANAN" description="Kontrol akses yang sudah aktif." />
            <div className="mt-4 space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-[#FF5A1F]" />
                <p className="text-gray-600 dark:text-gray-300">
                  Password di-hash dengan scrypt dan salt acak. Sesi memakai token acak opaque;
                  hanya hash token yang disimpan di database.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#FF5A1F]" />
                <p className="text-gray-600 dark:text-gray-300">
                  Otorisasi diperiksa di server untuk setiap halaman dan endpoint, bukan hanya
                  menyembunyikan menu di UI.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <Database className="mt-0.5 h-4 w-4 shrink-0 text-[#FF5A1F]" />
                <p className="text-gray-600 dark:text-gray-300">
                  Development memakai PGlite di <code className="text-[10px]">.data/pglite</code>.
                  Produksi membutuhkan <code className="text-[10px]">DATABASE_URL</code> PostgreSQL.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <Store className="mt-0.5 h-4 w-4 shrink-0 text-[#FF5A1F]" />
                <p className="text-gray-600 dark:text-gray-300">
                  Zona waktu transaksi dan laporan: Asia/Makassar (WITA, UTC+8).
                </p>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel className="p-5">
          <ConfigList
            kind="payment-methods"
            items={paymentRows}
            description="Metode yang muncul saat mencatat pembayaran."
          />
        </Panel>
        <Panel className="p-5">
          <ConfigList
            kind="order-channels"
            items={channelRows}
            description="Sumber pesanan seperti WhatsApp, walk-in, atau marketplace."
          />
        </Panel>
        <Panel className="p-5">
          <ConfigList
            kind="product-categories"
            items={categoryRows}
            description="Pengelompokan katalog produk pada halaman produk."
          />
        </Panel>
        <Panel className="p-5">
          <ConfigList
            kind="financial-categories"
            items={financialRows.map((row) => ({ ...row, isSystem: row.is_system }))}
            description="Kategori manual untuk buku kas. Kategori penjualan/refund bersifat sistem."
          />
        </Panel>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-black/10 bg-white/60 px-4 py-3.5 text-[11px] text-gray-500 dark:border-white/10 dark:bg-white/[0.02] dark:text-gray-400">
        <p>
          Kredensial demo hanya ditampilkan di halaman login saat <code>NODE_ENV</code> bukan
          production. Ganti password semua akun sebelum go-live.
        </p>
        <Link href="/dashboard/settings/audit" className={buttonClass('ghost', 'sm')}>
          <ScrollText className="h-3.5 w-3.5" /> Lihat audit trail lengkap
        </Link>
      </div>
    </div>
  );
}
