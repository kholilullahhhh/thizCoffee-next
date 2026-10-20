import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { requireApiUser, handleApiError, readJson, requireSameOrigin, ApiError } from '@/lib/api';
import { recordAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const types = ['payment-methods', 'order-channels', 'product-categories', 'financial-categories'] as const;

const schema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  description: z.string().trim().max(300).nullable().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: { type: string; id: string } }
) {
  try {
    requireSameOrigin(request);
    const user = await requireApiUser(['OWNER']);
    if (!types.includes(params.type as (typeof types)[number])) {
      throw new ApiError(404, 'Jenis konfigurasi tidak ditemukan.');
    }
    const body = schema.parse(await readJson(request));
    const db = await getDb();

    if (params.type === 'payment-methods' || params.type === 'order-channels') {
      const table = params.type === 'payment-methods' ? 'payment_methods' : 'order_channels';
      const existing = await db.query<{ name: string }>(`SELECT name FROM ${table} WHERE id = $1`, [
        params.id,
      ]);
      if (!existing.length) throw new ApiError(404, 'Konfigurasi tidak ditemukan.');
      const fields: string[] = [];
      const values: unknown[] = [];
      if (body.name !== undefined) {
        values.push(body.name);
        fields.push(`name = $${values.length}`);
      }
      if (body.active !== undefined) {
        values.push(body.active);
        fields.push(`active = $${values.length}`);
      }
      if (body.sortOrder !== undefined) {
        values.push(body.sortOrder);
        fields.push(`sort_order = $${values.length}`);
      }
      if (fields.length) values.push(params.id);
      await db.transaction(async (tx) => {
        if (fields.length) {
          await tx.query(`UPDATE ${table} SET ${fields.join(', ')} WHERE id = $${values.length}`, values);
        }
        await recordAudit(tx, {
          actorId: user.id,
          action: 'CONFIG_UPDATED',
          entityType: params.type.toUpperCase(),
          entityId: params.id,
          summary: `${body.name || existing[0].name} diperbarui.`,
        });
      });
      return NextResponse.json({ ok: true });
    }

    if (params.type === 'product-categories') {
      const existing = await db.query<{ name: string }>(
        'SELECT name FROM product_categories WHERE id = $1',
        [params.id]
      );
      if (!existing.length) throw new ApiError(404, 'Kategori tidak ditemukan.');
      const fields: string[] = [];
      const values: unknown[] = [];
      if (body.name !== undefined) {
        values.push(body.name);
        fields.push(`name = $${values.length}`);
      }
      if (body.description !== undefined) {
        values.push(body.description || null);
        fields.push(`description = $${values.length}`);
      }
      if (body.active !== undefined) {
        values.push(body.active);
        fields.push(`active = $${values.length}`);
      }
      if (fields.length) values.push(params.id);
      await db.transaction(async (tx) => {
        if (fields.length) {
          await tx.query(
            `UPDATE product_categories SET ${fields.join(', ')} WHERE id = $${values.length}`,
            values
          );
        }
        await recordAudit(tx, {
          actorId: user.id,
          action: 'CONFIG_UPDATED',
          entityType: 'PRODUCT_CATEGORY',
          entityId: params.id,
          summary: `Kategori produk ${body.name || existing[0].name} diperbarui.`,
        });
      });
      return NextResponse.json({ ok: true });
    }

    const existing = await db.query<{ name: string; is_system: boolean }>(
      'SELECT name, is_system FROM financial_categories WHERE id = $1',
      [params.id]
    );
    if (!existing.length) throw new ApiError(404, 'Kategori tidak ditemukan.');
    if (existing[0].is_system && body.active === false) {
      throw new ApiError(409, 'Kategori sistem tidak dapat dinonaktifkan.');
    }
    const fields: string[] = [];
    const values: unknown[] = [];
    if (body.name !== undefined) {
      values.push(body.name);
      fields.push(`name = $${values.length}`);
    }
    if (body.active !== undefined) {
      values.push(body.active);
      fields.push(`active = $${values.length}`);
    }
    if (fields.length) values.push(params.id);
    await db.transaction(async (tx) => {
      if (fields.length) {
        await tx.query(
          `UPDATE financial_categories SET ${fields.join(', ')} WHERE id = $${values.length}`,
          values
        );
      }
      await recordAudit(tx, {
        actorId: user.id,
        action: 'CONFIG_UPDATED',
        entityType: 'FINANCIAL_CATEGORY',
        entityId: params.id,
        summary: `Kategori keuangan ${body.name || existing[0].name} diperbarui.`,
      });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
