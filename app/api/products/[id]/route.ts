import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { requireApiUser, handleApiError, readJson, requireSameOrigin, ApiError } from '@/lib/api';
import { recordAudit } from '@/lib/audit';
import { validateRecipe } from '@/lib/services/products';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const recipeSchema = z.object({
  ingredientId: z.string().min(1),
  quantity: z.number().positive().max(1_000_000),
});

const patchSchema = z.object({
  sku: z.string().trim().min(2).max(60).optional(),
  name: z.string().trim().min(2).max(120).optional(),
  categoryId: z.string().nullable().optional(),
  volumeMl: z.number().int().positive().max(10_000).nullable().optional(),
  price: z.number().int().min(0).max(1_000_000_000).optional(),
  cost: z.number().int().min(0).max(1_000_000_000).optional(),
  minStock: z.number().int().min(0).max(1_000_000).optional(),
  active: z.boolean().optional(),
  recipe: z.array(recipeSchema).max(50).optional(),
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

    const existing = await db.query<{ id: string; name: string; sku: string }>(
      'SELECT id, name, sku FROM products WHERE id = $1',
      [params.id]
    );
    if (!existing.length) throw new ApiError(404, 'Produk tidak ditemukan.');

    if (body.categoryId) {
      const category = await db.query('SELECT id FROM product_categories WHERE id = $1', [
        body.categoryId,
      ]);
      if (!category.length) throw new ApiError(422, 'Kategori produk tidak ditemukan.');
    }

    if (body.recipe !== undefined) await validateRecipe(db, body.recipe);

    await db.transaction(async (tx) => {
      const fields: string[] = [];
      const values: unknown[] = [];
      const add = (column: string, value: unknown) => {
        values.push(value);
        fields.push(`${column} = $${values.length}`);
      };
      if (body.sku !== undefined) add('sku', body.sku.toUpperCase());
      if (body.name !== undefined) add('name', body.name);
      if (body.categoryId !== undefined) add('category_id', body.categoryId || null);
      if (body.volumeMl !== undefined) add('volume_ml', body.volumeMl || null);
      if (body.price !== undefined) add('price', body.price);
      if (body.cost !== undefined) add('cost', body.cost);
      if (body.minStock !== undefined) add('min_stock', body.minStock);
      if (body.active !== undefined) add('active', body.active);
      if (fields.length) {
        values.push(params.id);
        await tx.query(
          `UPDATE products SET ${fields.join(', ')}, updated_at = now()
           WHERE id = $${values.length}`,
          values
        );
      }

      if (body.recipe !== undefined) {
        await tx.query('DELETE FROM recipe_items WHERE product_id = $1', [params.id]);
        for (const item of body.recipe) {
          await tx.query(
            `INSERT INTO recipe_items (id, product_id, ingredient_id, quantity)
             VALUES ($1, $2, $3, $4)`,
            [randomUUID(), params.id, item.ingredientId, item.quantity]
          );
        }
      }

      await recordAudit(tx, {
        actorId: user.id,
        action: 'PRODUCT_UPDATED',
        entityType: 'PRODUCT',
        entityId: params.id,
        summary: `Produk ${body.name || existing[0].name} diperbarui.`,
        metadata: { fields: Object.keys(body) },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
