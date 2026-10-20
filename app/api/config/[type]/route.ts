import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { requireApiUser, handleApiError, readJson, requireSameOrigin, ApiError } from '@/lib/api';
import { recordAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const types = ['payment-methods', 'order-channels', 'product-categories', 'financial-categories'] as const;

const baseSchema = z.object({
  name: z.string().trim().min(2).max(80),
  code: z.string().trim().min(2).max(40).optional(),
  slug: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(300).nullable().optional(),
  kind: z
    .enum(['OTHER_INCOME', 'OPERATING_EXPENSE', 'INVENTORY_PURCHASE'])
    .optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: { type: string } }
) {
  try {
    requireSameOrigin(request);
    const user = await requireApiUser(['OWNER']);
    if (!types.includes(params.type as (typeof types)[number])) {
      throw new ApiError(404, 'Jenis konfigurasi tidak ditemukan.');
    }
    const body = baseSchema.parse(await readJson(request));
    const db = await getDb();
    const id = `cfg-${randomUUID()}`;

    if (params.type === 'payment-methods' || params.type === 'order-channels') {
      const code = body.code?.toUpperCase().replace(/[^A-Z0-9_-]/g, '');
      if (!code || code.length < 2) throw new ApiError(422, 'Kode wajib diisi.');
      const table = params.type === 'payment-methods' ? 'payment_methods' : 'order_channels';
      const duplicate = await db.query(`SELECT id FROM ${table} WHERE code = $1`, [code]);
      if (duplicate.length) throw new ApiError(409, 'Kode sudah digunakan.');
      await db.transaction(async (tx) => {
        await tx.query(
          `INSERT INTO ${table} (id, code, name, sort_order) VALUES ($1, $2, $3, $4)`,
          [id, code, body.name, body.sortOrder ?? 100]
        );
        await recordAudit(tx, {
          actorId: user.id,
          action: 'CONFIG_CREATED',
          entityType: params.type.toUpperCase(),
          entityId: id,
          summary: `${body.name} (${code}) ditambahkan.`,
        });
      });
      return NextResponse.json({ id }, { status: 201 });
    }

    if (params.type === 'product-categories') {
      const slug =
        body.slug?.toLowerCase().replace(/[^a-z0-9-]/g, '-') ||
        body.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      const duplicate = await db.query('SELECT id FROM product_categories WHERE slug = $1', [slug]);
      if (duplicate.length) throw new ApiError(409, 'Slug kategori sudah digunakan.');
      await db.transaction(async (tx) => {
        await tx.query(
          `INSERT INTO product_categories (id, name, slug, description) VALUES ($1, $2, $3, $4)`,
          [id, body.name, slug, body.description || null]
        );
        await recordAudit(tx, {
          actorId: user.id,
          action: 'CONFIG_CREATED',
          entityType: 'PRODUCT_CATEGORY',
          entityId: id,
          summary: `Kategori produk ${body.name} ditambahkan.`,
        });
      });
      return NextResponse.json({ id }, { status: 201 });
    }

    if (!body.kind) throw new ApiError(422, 'Jenis kategori keuangan wajib dipilih.');
    await db.transaction(async (tx) => {
      await tx.query(
        `INSERT INTO financial_categories (id, name, kind, is_system) VALUES ($1, $2, $3, FALSE)`,
        [id, body.name, body.kind]
      );
      await recordAudit(tx, {
        actorId: user.id,
        action: 'CONFIG_CREATED',
        entityType: 'FINANCIAL_CATEGORY',
        entityId: id,
        summary: `Kategori keuangan ${body.name} ditambahkan.`,
      });
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
