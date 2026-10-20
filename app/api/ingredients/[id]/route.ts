import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { requireApiUser, handleApiError, readJson, requireSameOrigin, ApiError } from '@/lib/api';
import { recordAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const categories = ['COFFEE', 'DAIRY', 'SWEETENER', 'PACKAGING', 'OTHER'] as const;

const patchSchema = z.object({
  sku: z.string().trim().min(2).max(60).optional(),
  name: z.string().trim().min(2).max(120).optional(),
  category: z.enum(categories).optional(),
  unit: z.string().trim().min(1).max(20).optional(),
  minStock: z.number().min(0).max(10_000_000).optional(),
  unitCost: z.number().min(0).max(1_000_000_000).optional(),
  supplierId: z.string().nullable().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    requireSameOrigin(request);
    const user = await requireApiUser(['OWNER', 'INVENTORY']);
    const body = patchSchema.parse(await readJson(request));
    const db = await getDb();

    const existing = await db.query<{ id: string; name: string }>(
      'SELECT id, name FROM ingredients WHERE id = $1',
      [params.id]
    );
    if (!existing.length) throw new ApiError(404, 'Bahan tidak ditemukan.');

    if (body.supplierId) {
      const supplier = await db.query('SELECT id FROM suppliers WHERE id = $1', [body.supplierId]);
      if (!supplier.length) throw new ApiError(422, 'Pemasok tidak ditemukan.');
    }

    const fields: string[] = [];
    const values: unknown[] = [];
    const add = (column: string, value: unknown) => {
      values.push(value);
      fields.push(`${column} = $${values.length}`);
    };
    if (body.sku !== undefined) add('sku', body.sku.toUpperCase());
    if (body.name !== undefined) add('name', body.name);
    if (body.category !== undefined) add('category', body.category);
    if (body.unit !== undefined) add('unit', body.unit);
    if (body.minStock !== undefined) add('min_stock', body.minStock);
    if (body.unitCost !== undefined) add('unit_cost', body.unitCost);
    if (body.supplierId !== undefined) add('supplier_id', body.supplierId || null);
    if (body.active !== undefined) add('active', body.active);

    await db.transaction(async (tx) => {
      if (fields.length) {
        values.push(params.id);
        await tx.query(
          `UPDATE ingredients SET ${fields.join(', ')}, updated_at = now()
           WHERE id = $${values.length}`,
          values
        );
      }

      await recordAudit(tx, {
        actorId: user.id,
        action: 'INGREDIENT_UPDATED',
        entityType: 'INGREDIENT',
        entityId: params.id,
        summary: `Bahan ${body.name || existing[0].name} diperbarui.`,
        metadata: { fields: Object.keys(body) },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
