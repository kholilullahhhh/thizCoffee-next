import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { dateParam, makassarToday } from '@/lib/dates';
import { ApiError, handleApiError } from '@/lib/api';
import type { Role } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function escape(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function csv(headers: string[], rows: unknown[][]) {
  return '\uFEFF' + [headers, ...rows].map((row) => row.map(escape).join(',')).join('\r\n');
}

function allowed(type: string, role: Role) {
  if (type === 'finance' || type === 'report') return role === 'OWNER';
  if (type === 'orders') return role === 'OWNER' || role === 'STAFF';
  if (type === 'stock' || type === 'products') return role === 'OWNER' || role === 'INVENTORY';
  return false;
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError(401, 'Sesi berakhir.');
    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'orders';
    if (!allowed(type, user.role)) throw new ApiError(403, 'Anda tidak memiliki izin ekspor ini.');

    const from = dateParam(url.searchParams.get('from'));
    const to = dateParam(url.searchParams.get('to'), from);
    if (from > to) throw new ApiError(422, 'Rentang tanggal tidak valid.');
    const start = new Date(`${from}T00:00:00+08:00`).toISOString();
    const end = new Date(`${to}T00:00:00+08:00`);
    end.setUTCDate(end.getUTCDate() + 1);
    const endIso = end.toISOString();
    const db = await getDb();
    let content = '';
    let filename = '';

    if (type === 'orders' || type === 'report') {
      const rows = await db.query<Record<string, unknown>>(
        `SELECT o.order_number,
                to_char(o.created_at AT TIME ZONE 'Asia/Makassar', 'YYYY-MM-DD HH24:MI') AS waktu,
                o.customer_name, o.channel, o.status, o.payment_status,
                o.subtotal, o.discount, o.delivery_fee, o.total, o.amount_paid,
                (o.total - o.amount_paid) AS receivable, o.notes
           FROM orders o
          WHERE o.created_at >= $1 AND o.created_at < $2
          ORDER BY o.created_at ASC`,
        [start, endIso]
      );
      content = csv(
        [
          'No. Pesanan',
          'Waktu (WITA)',
          'Pelanggan',
          'Kanal',
          'Status',
          'Pembayaran',
          'Subtotal',
          'Diskon',
          'Ongkir',
          'Total',
          'Dibayar',
          'Piutang',
          'Catatan',
        ],
        rows.map((r) => [
          r.order_number,
          r.waktu,
          r.customer_name,
          r.channel,
          r.status,
          r.payment_status,
          r.subtotal,
          r.discount,
          r.delivery_fee,
          r.total,
          r.amount_paid,
          r.receivable,
          r.notes,
        ])
      );
      filename = `thiz-${type === 'report' ? 'laporan-penjualan' : 'pesanan'}-${from}-${to}.csv`;
    } else if (type === 'finance') {
      const rows = await db.query<Record<string, unknown>>(
        `SELECT to_char(f.occurred_at AT TIME ZONE 'Asia/Makassar', 'YYYY-MM-DD HH24:MI') AS waktu,
                f.type, c.name AS kategori, f.method, f.amount, f.description, f.notes,
                CASE WHEN f.is_voided THEN 'VOID' ELSE 'AKTIF' END AS status,
                o.order_number, f.void_reason
           FROM financial_entries f
           JOIN financial_categories c ON c.id = f.category_id
           LEFT JOIN orders o ON o.id = f.order_id
          WHERE f.occurred_at >= $1 AND f.occurred_at < $2
          ORDER BY f.occurred_at ASC`,
        [start, endIso]
      );
      content = csv(
        [
          'Waktu (WITA)',
          'Tipe',
          'Kategori',
          'Metode',
          'Nominal',
          'Keterangan',
          'Catatan',
          'Status',
          'No. Pesanan',
          'Alasan Void',
        ],
        rows.map((r) => [
          r.waktu,
          r.type,
          r.kategori,
          r.method,
          r.amount,
          r.description,
          r.notes,
          r.status,
          r.order_number,
          r.void_reason,
        ])
      );
      filename = `thiz-keuangan-${from}-${to}.csv`;
    } else if (type === 'stock') {
      const rows = await db.query<Record<string, unknown>>(
        `SELECT to_char(m.created_at AT TIME ZONE 'Asia/Makassar', 'YYYY-MM-DD HH24:MI') AS waktu,
                m.type, COALESCE(p.sku, i.sku) AS sku, COALESCE(p.name, i.name) AS item,
                m.quantity, COALESCE(p.stock::text, i.stock::text) AS stok_saat_ini,
                m.reason, u.name AS oleh
           FROM stock_movements m
           LEFT JOIN products p ON p.id = m.product_id
           LEFT JOIN ingredients i ON i.id = m.ingredient_id
           LEFT JOIN users u ON u.id = m.created_by
          WHERE m.created_at >= $1 AND m.created_at < $2
          ORDER BY m.created_at ASC`,
        [start, endIso]
      );
      content = csv(
        ['Waktu (WITA)', 'Tipe', 'SKU', 'Item', 'Perubahan', 'Stok Saat Ini', 'Alasan', 'Oleh'],
        rows.map((r) => [
          r.waktu,
          r.type,
          r.sku,
          r.item,
          r.quantity,
          r.stok_saat_ini,
          r.reason,
          r.oleh,
        ])
      );
      filename = `thiz-mutasi-stok-${from}-${to}.csv`;
    } else {
      const rows = await db.query<Record<string, unknown>>(
        `SELECT p.sku, p.name, c.name AS kategori, p.volume_ml, p.price, p.cost,
                p.stock, p.min_stock, (p.stock * p.cost) AS nilai_stok,
                CASE WHEN p.active THEN 'AKTIF' ELSE 'ARSIP' END AS status
           FROM products p LEFT JOIN product_categories c ON c.id = p.category_id
          ORDER BY p.name ASC`
      );
      content = csv(
        [
          'SKU',
          'Produk',
          'Kategori',
          'Volume (ml)',
          'Harga Jual',
          'HPP',
          'Stok',
          'Stok Minimum',
          'Nilai Stok',
          'Status',
        ],
        rows.map((r) => [
          r.sku,
          r.name,
          r.kategori,
          r.volume_ml,
          r.price,
          r.cost,
          r.stock,
          r.min_stock,
          r.nilai_stok,
          r.status,
        ])
      );
      filename = `thiz-produk-${makassarToday()}.csv`;
    }

    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
