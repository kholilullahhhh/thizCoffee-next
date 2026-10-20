import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { requireApiUser, handleApiError, readJson, requireSameOrigin, ApiError } from '@/lib/api';
import { recordAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({
  categoryId: z.string().min(1),
  amount: z.number().int().positive().max(1_000_000_000),
  method: z.string().trim().min(1).max(40),
  occurredAt: z.string().datetime({ offset: true }).or(z.string().datetime()),
  description: z.string().trim().min(3).max(300),
  notes: z.string().trim().max(1000).nullable().optional(),
  supplierId: z.string().nullable().optional(),
  idempotencyKey: z.string().trim().min(8).max(120).optional(),
});

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await requireApiUser(['OWNER']);
    const body = schema.parse(await readJson(request));
    const db = await getDb();
    const dedupeKey = `manual:${body.idempotencyKey || randomUUID()}`;
    const existing = await db.query<{ id: string }>(
      'SELECT id FROM financial_entries WHERE dedupe_key = $1',
      [dedupeKey]
    );
    if (existing.length) {
      return NextResponse.json({ id: existing[0].id, alreadyExisted: true });
    }

    const categories = await db.query<{ id: string; kind: string; name: string; active: boolean }>(
      'SELECT id, kind, name, active FROM financial_categories WHERE id = $1',
      [body.categoryId]
    );
    const category = categories[0];
    if (!category || !category.active) throw new ApiError(422, 'Kategori keuangan tidak ditemukan.');
    if (!['OTHER_INCOME', 'OPERATING_EXPENSE', 'INVENTORY_PURCHASE'].includes(category.kind)) {
      throw new ApiError(
        422,
        'Kategori sistem penjualan/refund tidak dapat dicatat manual. Gunakan modul pesanan.'
      );
    }

    const methodCode = body.method.trim().toUpperCase();
    const method = await db.query('SELECT id FROM payment_methods WHERE code = $1 AND active = TRUE', [
      methodCode,
    ]);
    if (!method.length) throw new ApiError(422, 'Metode pembayaran tidak valid.');

    if (body.supplierId) {
      const supplier = await db.query('SELECT id FROM suppliers WHERE id = $1', [body.supplierId]);
      if (!supplier.length) throw new ApiError(422, 'Pemasok tidak ditemukan.');
    }

    const occurred = new Date(body.occurredAt);
    if (Number.isNaN(occurred.getTime())) throw new ApiError(422, 'Tanggal transaksi tidak valid.');
    if (occurred.getTime() > Date.now() + 86_400_000) {
      throw new ApiError(422, 'Tanggal transaksi tidak boleh lebih dari satu hari ke depan.');
    }

    const id = `fin-${randomUUID()}`;
    const type = category.kind === 'OTHER_INCOME' ? 'INCOME' : 'EXPENSE';
    const result = await db.transaction(async (tx) => {
      const inserted = await tx.query<{ id: string }>(
        `INSERT INTO financial_entries
          (id, type, category_id, amount, method, occurred_at, description, notes,
           supplier_id, dedupe_key, created_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now())
         ON CONFLICT (dedupe_key) DO NOTHING
         RETURNING id`,
        [
          id,
          type,
          category.id,
          body.amount,
          methodCode,
          occurred.toISOString(),
          body.description,
          body.notes?.trim() || null,
          body.supplierId || null,
          dedupeKey,
          user.id,
        ]
      );
      if (!inserted.length) {
        const rows = await tx.query<{ id: string }>(
          'SELECT id FROM financial_entries WHERE dedupe_key = $1',
          [dedupeKey]
        );
        return { id: rows[0]?.id || id, alreadyExisted: true };
      }
      await recordAudit(tx, {
        actorId: user.id,
        action: type === 'INCOME' ? 'INCOME_CREATED' : 'EXPENSE_CREATED',
        entityType: 'FINANCIAL_ENTRY',
        entityId: id,
        summary: `${type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran'} ${category.name}: ${body.description}.`,
        metadata: { amount: body.amount, method: methodCode },
      });
      return { id, alreadyExisted: false };
    });

    return NextResponse.json(result, { status: result.alreadyExisted ? 200 : 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
