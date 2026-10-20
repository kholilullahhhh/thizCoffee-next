import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { requireApiUser, handleApiError, readJson, requireSameOrigin, ApiError } from '@/lib/api';
import { recordAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const categories = ['COFFEE', 'DAIRY', 'SWEETENER', 'PACKAGING', 'OTHER'] as const;

const createSchema = z.object({
  sku: z.string().trim().min(2).max(60),
  name: z.string().trim().min(2).max(120),
  category: z.enum(categories),
  unit: z.string().trim().min(1).max(20),
  stock: z.number().min(0).max(10_000_000).default(0),
  minStock: z.number().min(0).max(10_000_000).default(0),
  unitCost: z.number().min(0).max(1_000_000_000).default(0),
  supplierId: z.string().nullable().optional(),
  active: z.boolean().default(true),
});

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await requireApiUser(['OWNER', 'INVENTORY']);
    const body = createSchema.parse(await readJson(request));
    const db = await getDb();

    const duplicate = await db.query('SELECT id FROM ingredients WHERE lower(sku) = lower($1)', [
      body.sku,
    ]);
    if (duplicate.length) throw new ApiError(409, 'SKU bahan sudah digunakan.');

    if (body.supplierId) {
      const supplier = await db.query('SELECT id FROM suppliers WHERE id = $1', [body.supplierId]);
      if (!supplier.length) throw new ApiError(422, 'Pemasok tidak ditemukan.');
    }

    const id = `ing-${randomUUID()}`;
    await db.transaction(async (tx) => {
      await tx.query(
        `INSERT INTO ingredients
          (id, sku, name, category, unit, stock, min_stock, unit_cost, supplier_id, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          id,
          body.sku.toUpperCase(),
          body.name,
          body.category,
          body.unit,
          body.stock,
          body.minStock,
          body.unitCost,
          body.supplierId || null,
          body.active,
        ]
      );
      if (body.stock > 0) {
        await tx.query(
          `INSERT INTO stock_movements
            (id, ingredient_id, type, quantity, unit_cost, reason, reference_type, reference_id,
             dedupe_key, created_by, created_at)
           VALUES ($1, $2, 'ADJUSTMENT', $3, $4, $5, 'INGREDIENT_CREATE', $2, $6, $7, now())`,
          [
            randomUUID(),
            id,
            body.stock,
            body.unitCost,
            'Stok awal saat bahan dibuat',
            `ingredient-open:${id}`,
            user.id,
          ]
        );
      }
      await recordAudit(tx, {
        actorId: user.id,
        action: 'INGREDIENT_CREATED',
        entityType: 'INGREDIENT',
        entityId: id,
        summary: `Bahan ${body.name} (${body.sku.toUpperCase()}) ditambahkan.`,
      });
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
