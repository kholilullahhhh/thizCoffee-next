import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { requireApiUser, handleApiError, readJson, requireSameOrigin, ApiError } from '@/lib/api';
import { recordAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  contact: z.string().trim().max(120).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  email: z.string().trim().email('Email tidak valid.').max(200).nullable().optional().or(z.literal('')),
  address: z.string().trim().max(500).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    requireSameOrigin(request);
    const user = await requireApiUser(['OWNER', 'INVENTORY']);
    const body = schema.parse(await readJson(request));
    const db = await getDb();
    const existing = await db.query<{ name: string }>('SELECT name FROM suppliers WHERE id = $1', [
      params.id,
    ]);
    if (!existing.length) throw new ApiError(404, 'Pemasok tidak ditemukan.');

    const fields: string[] = [];
    const values: unknown[] = [];
    const add = (column: string, value: unknown) => {
      values.push(value);
      fields.push(`${column} = $${values.length}`);
    };
    if (body.name !== undefined) add('name', body.name);
    if (body.contact !== undefined) add('contact', body.contact || null);
    if (body.phone !== undefined) add('phone', body.phone || null);
    if (body.email !== undefined) add('email', body.email || null);
    if (body.address !== undefined) add('address', body.address || null);
    if (body.notes !== undefined) add('notes', body.notes || null);
    if (body.active !== undefined) add('active', body.active);
    await db.transaction(async (tx) => {
      if (fields.length) {
        values.push(params.id);
        await tx.query(
          `UPDATE suppliers SET ${fields.join(', ')}, updated_at = now() WHERE id = $${values.length}`,
          values
        );
      }
      await recordAudit(tx, {
        actorId: user.id,
        action: 'SUPPLIER_UPDATED',
        entityType: 'SUPPLIER',
        entityId: params.id,
        summary: `Pemasok ${body.name || existing[0].name} diperbarui.`,
      });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
