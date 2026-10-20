import { randomUUID } from 'crypto';
import { getDb } from '@/lib/db';
import type { DbExecutor } from '@/lib/db';
import { recordAudit } from '@/lib/audit';
import { toNumber } from '@/lib/format';
import { makassarToday } from '@/lib/dates';
import type { SessionUser } from '@/lib/types';
import { ApiError } from '@/lib/api';

export type StockAdjustmentType = 'PURCHASE' | 'ADJUSTMENT' | 'WASTAGE' | 'RETURN';

export interface StockAdjustmentItemInput {
  productId?: string | null;
  ingredientId?: string | null;
  quantity: number;
  unitCost: number;
}

export interface StockAdjustmentInput {
  idempotencyKey: string;
  type: StockAdjustmentType;
  reason: string;
  notes?: string | null;
  supplierId?: string | null;
  recordExpense: boolean;
  method: string;
  items: StockAdjustmentItemInput[];
}

async function nextAdjustmentNumber(tx: DbExecutor) {
  const rows = await tx.query<{ seq: unknown }>(
    "SELECT nextval('adjustment_number_seq') AS seq"
  );
  return `ADJ-${makassarToday().replaceAll('-', '')}-${String(toNumber(rows[0]?.seq)).padStart(4, '0')}`;
}

export async function createStockAdjustment(
  input: StockAdjustmentInput,
  actor: SessionUser
) {
  if (!input.items.length) throw new ApiError(422, 'Minimal satu item stok harus diisi.');
  if (input.reason.trim().length < 4) {
    throw new ApiError(422, 'Alasan penyesuaian minimal 4 karakter.');
  }
  const seenItems = new Set<string>();
  for (const item of input.items) {
    if (!!item.productId === !!item.ingredientId) {
      throw new ApiError(422, 'Setiap baris harus memilih tepat satu produk atau bahan.');
    }
    const itemKey = item.productId ? `product:${item.productId}` : `ingredient:${item.ingredientId}`;
    if (seenItems.has(itemKey)) {
      throw new ApiError(422, 'Satu produk atau bahan tidak boleh muncul lebih dari sekali.');
    }
    seenItems.add(itemKey);
    if (!Number.isFinite(item.quantity) || item.quantity === 0) {
      throw new ApiError(422, 'Kuantitas penyesuaian tidak boleh nol.');
    }
    if (input.type === 'PURCHASE' || input.type === 'RETURN') {
      if (item.quantity <= 0) throw new ApiError(422, 'Kuantitas penerimaan harus positif.');
    }
    if (input.type === 'WASTAGE' && item.quantity >= 0) {
      throw new ApiError(422, 'Kuantitas kerusakan harus negatif.');
    }
    if (item.productId && !Number.isInteger(item.quantity)) {
      throw new ApiError(422, 'Kuantitas produk jadi harus bilangan bulat.');
    }
    if (item.unitCost < 0) throw new ApiError(422, 'Biaya satuan tidak boleh negatif.');
  }

  const db = await getDb();
  const expenseMethod = input.method.trim().toUpperCase();
  const adjustmentId = `adj-${input.idempotencyKey}`;
  const existing = await db.query<{ id: string; adjustment_no: string }>(
    'SELECT id, adjustment_no FROM stock_adjustments WHERE id = $1',
    [adjustmentId]
  );
  if (existing.length) {
    return { id: existing[0].id, adjustmentNo: existing[0].adjustment_no, alreadyExisted: true };
  }

  if (input.recordExpense && input.type === 'PURCHASE') {
    const method = await db.query(
      'SELECT id FROM payment_methods WHERE code = $1 AND active = TRUE',
      [expenseMethod]
    );
    if (!method.length) throw new ApiError(422, 'Metode pembayaran tidak valid.');
  }

  return db.transaction(async (tx) => {
    if (input.supplierId) {
      const rows = await tx.query('SELECT id FROM suppliers WHERE id = $1 AND active = TRUE', [
        input.supplierId,
      ]);
      if (!rows.length) throw new ApiError(422, 'Pemasok tidak ditemukan.');
    }

    const adjustmentNo = await nextAdjustmentNumber(tx);
    let totalCost = 0;
    const prepared: Array<{
      productId: string | null;
      ingredientId: string | null;
      quantity: number;
      unitCost: number;
      lineCost: number;
      name: string;
    }> = [];

    for (const item of input.items) {
      if (item.productId) {
        const rows = await tx.query<{ id: string; name: string; stock: number }>(
          'SELECT id, name, stock FROM products WHERE id = $1 AND active = TRUE FOR UPDATE',
          [item.productId]
        );
        if (!rows.length) throw new ApiError(422, 'Produk tidak ditemukan atau nonaktif.');
        if (toNumber(rows[0].stock) + item.quantity < 0) {
          throw new ApiError(409, `Stok ${rows[0].name} tidak mencukupi untuk penyesuaian ini.`);
        }
        prepared.push({
          productId: item.productId,
          ingredientId: null,
          quantity: item.quantity,
          unitCost: item.unitCost,
          lineCost: Math.round(Math.abs(item.quantity) * item.unitCost),
          name: rows[0].name,
        });
      } else if (item.ingredientId) {
        const rows = await tx.query<{ id: string; name: string; stock: unknown }>(
          'SELECT id, name, stock FROM ingredients WHERE id = $1 AND active = TRUE FOR UPDATE',
          [item.ingredientId]
        );
        if (!rows.length) throw new ApiError(422, 'Bahan tidak ditemukan atau nonaktif.');
        if (toNumber(rows[0].stock) + item.quantity < 0) {
          throw new ApiError(409, `Stok ${rows[0].name} tidak mencukupi untuk penyesuaian ini.`);
        }
        prepared.push({
          productId: null,
          ingredientId: item.ingredientId,
          quantity: item.quantity,
          unitCost: item.unitCost,
          lineCost: Math.round(Math.abs(item.quantity) * item.unitCost),
          name: rows[0].name,
        });
      }
      totalCost = prepared.reduce((sum, row) => sum + row.lineCost, 0);
    }

    const inserted = await tx.query<{ id: string }>(
      `INSERT INTO stock_adjustments
        (id, adjustment_no, type, reason, notes, supplier_id, total_cost, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO NOTHING RETURNING id`,
      [
        adjustmentId,
        adjustmentNo,
        input.type,
        input.reason.trim(),
        input.notes?.trim() || null,
        input.supplierId || null,
        totalCost,
        actor.id,
      ]
    );
    if (!inserted.length) {
      const rows = await tx.query<{ id: string; adjustment_no: string }>(
        'SELECT id, adjustment_no FROM stock_adjustments WHERE id = $1',
        [adjustmentId]
      );
      return {
        id: rows[0]?.id || adjustmentId,
        adjustmentNo: rows[0]?.adjustment_no || adjustmentNo,
        alreadyExisted: true,
      };
    }

    for (const item of prepared) {
      if (item.productId) {
        await tx.query(
          `UPDATE products SET stock = stock + $1::int, updated_at = now() WHERE id = $2`,
          [item.quantity, item.productId]
        );
      } else if (item.ingredientId) {
        await tx.query(
          `UPDATE ingredients SET stock = stock + $1, updated_at = now() WHERE id = $2`,
          [item.quantity, item.ingredientId]
        );
      }
      await tx.query(
        `INSERT INTO stock_adjustment_items
          (id, adjustment_id, product_id, ingredient_id, quantity, unit_cost, line_cost)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          randomUUID(),
          adjustmentId,
          item.productId,
          item.ingredientId,
          item.quantity,
          item.unitCost,
          item.lineCost,
        ]
      );
      await tx.query(
        `INSERT INTO stock_movements
          (id, product_id, ingredient_id, type, quantity, unit_cost, reason,
           reference_type, reference_id, adjustment_id, dedupe_key, created_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'ADJUSTMENT', $8, $8, $9, $10, now())`,
        [
          randomUUID(),
          item.productId,
          item.ingredientId,
          input.type,
          item.quantity,
          item.unitCost,
          input.reason.trim(),
          adjustmentId,
          `adjustment:${adjustmentId}:${item.productId ? 'product' : 'ingredient'}:${item.productId || item.ingredientId}`,
          actor.id,
        ]
      );
    }

    if (input.recordExpense && input.type === 'PURCHASE' && totalCost > 0) {
      await tx.query(
        `INSERT INTO financial_entries
          (id, type, category_id, amount, method, occurred_at, description, notes,
           supplier_id, dedupe_key, created_by, created_at)
         VALUES ($1, 'EXPENSE', 'fcat-inventory', $2, $3, now(), $4, $5, $6, $7, $8, now())
         ON CONFLICT (dedupe_key) DO NOTHING`,
        [
          `fin-${randomUUID()}`,
          totalCost,
          expenseMethod || 'CASH',
          `Pembelian persediaan ${adjustmentNo}`,
          input.reason.trim(),
          input.supplierId || null,
          `adjustment:${adjustmentId}`,
          actor.id,
        ]
      );
    }

    await recordAudit(tx, {
      actorId: actor.id,
      action: 'STOCK_ADJUSTED',
      entityType: 'STOCK_ADJUSTMENT',
      entityId: adjustmentId,
      summary: `${input.type} ${adjustmentNo}: ${input.reason.trim()} (${prepared.length} item).`,
      metadata: { totalCost, recordExpense: input.recordExpense },
    });

    return { id: adjustmentId, adjustmentNo, alreadyExisted: false };
  });
}
