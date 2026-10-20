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

const createSchema = z.object({
  sku: z.string().trim().min(2).max(60),
  name: z.string().trim().min(2).max(120),
  categoryId: z.string().nullable().optional(),
  volumeMl: z.number().int().positive().max(10_000).nullable().optional(),
  price: z.number().int().min(0).max(1_000_000_000),
  cost: z.number().int().min(0).max(1_000_000_000),
  stock: z.number().int().min(0).max(1_000_000).default(0),
  minStock: z.number().int().min(0).max(1_000_000).default(0),
  active: z.boolean().default(true),
  recipe: z.array(recipeSchema).max(50).default([]),
});

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await requireApiUser(['OWNER', 'INVENTORY']);
    const body = createSchema.parse(await readJson(request));
    const db = await getDb();

    const duplicate = await db.query('SELECT id FROM products WHERE lower(sku) = lower($1)', [
      body.sku,
    ]);
    if (duplicate.length) throw new ApiError(409, 'SKU produk sudah digunakan.');

    if (body.categoryId) {
      const category = await db.query('SELECT id FROM product_categories WHERE id = $1', [
        body.categoryId,
      ]);
      if (!category.length) throw new ApiError(422, 'Kategori produk tidak ditemukan.');
    }

    await validateRecipe(db, body.recipe);

    const result = await db.transaction(async (tx) => {
      const id = `prod-${randomUUID()}`;
      await tx.query(
        `INSERT INTO products
          (id, sku, name, category_id, volume_ml, price, cost, stock, min_stock, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          id,
          body.sku.toUpperCase(),
          body.name,
          body.categoryId || null,
          body.volumeMl || null,
          body.price,
          body.cost,
          body.stock,
          body.minStock,
          body.active,
        ]
      );
      if (body.recipe.length) {
        for (const item of body.recipe) {
          await tx.query(
            `INSERT INTO recipe_items (id, product_id, ingredient_id, quantity)
             VALUES ($1, $2, $3, $4)`,
            [randomUUID(), id, item.ingredientId, item.quantity]
          );
        }
      }
      if (body.stock > 0) {
        await tx.query(
          `INSERT INTO stock_movements
            (id, product_id, type, quantity, unit_cost, reason, reference_type, reference_id,
             dedupe_key, created_by, created_at)
           VALUES ($1, $2, 'ADJUSTMENT', $3, $4, $5, 'PRODUCT_CREATE', $2, $6, $7, now())`,
          [
            randomUUID(),
            id,
            body.stock,
            body.cost,
            'Stok awal saat produk dibuat',
            `product-open:${id}`,
            user.id,
          ]
        );
      }
      await recordAudit(tx, {
        actorId: user.id,
        action: 'PRODUCT_CREATED',
        entityType: 'PRODUCT',
        entityId: id,
        summary: `Produk ${body.name} (${body.sku.toUpperCase()}) ditambahkan.`,
        metadata: { price: body.price, stock: body.stock },
      });
      return { id };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
