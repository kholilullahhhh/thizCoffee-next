import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { requireApiUser, handleApiError, readJson, requireSameOrigin, ApiError } from '@/lib/api';
import { recordAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({
  reason: z.string().trim().min(4).max(500),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    requireSameOrigin(request);
    const user = await requireApiUser(['OWNER']);
    const body = schema.parse(await readJson(request));
    const db = await getDb();

    const rows = await db.query<{
      id: string;
      description: string;
      amount: unknown;
      is_voided: boolean;
      payment_id: string | null;
      dedupe_key: string;
    }>(
      `SELECT id, description, amount, is_voided, payment_id, dedupe_key
       FROM financial_entries WHERE id = $1`,
      [params.id]
    );
    const entry = rows[0];
    if (!entry) throw new ApiError(404, 'Transaksi keuangan tidak ditemukan.');
    if (entry.is_voided) throw new ApiError(409, 'Transaksi sudah dibatalkan sebelumnya.');
    if (entry.payment_id) {
      throw new ApiError(
        409,
        'Transaksi pembayaran penjualan tidak dapat di-void langsung. Batalkan pesanan agar stok dan kas ikut terkoreksi.'
      );
    }
    if (entry.dedupe_key.startsWith('adjustment:')) {
      throw new ApiError(
        409,
        'Pengeluaran pembelian stok terhubung dengan mutasi inventaris dan tidak dapat di-void terpisah.'
      );
    }

    await db.transaction(async (tx) => {
      await tx.query(
        `UPDATE financial_entries
         SET is_voided = TRUE, voided_at = now(), voided_by = $1, void_reason = $2, updated_at = now()
         WHERE id = $3`,
        [user.id, body.reason, params.id]
      );
      await recordAudit(tx, {
        actorId: user.id,
        action: 'FINANCIAL_ENTRY_VOIDED',
        entityType: 'FINANCIAL_ENTRY',
        entityId: params.id,
        summary: `Transaksi "${entry.description}" di-void: ${body.reason}`,
        metadata: { amount: entry.amount },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
