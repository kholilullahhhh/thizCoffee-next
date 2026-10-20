import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { requireApiUser, handleApiError, readJson, requireSameOrigin, ApiError } from '@/lib/api';
import { recordAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({
  businessName: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(40),
  email: z.string().trim().email('Email bisnis tidak valid.').max(200),
  address: z.string().trim().max(500),
  dailyTarget: z.number().int().min(0).max(1_000_000_000),
  defaultDeliveryFee: z.number().int().min(0).max(1_000_000_000),
  receiptNote: z.string().trim().max(500),
});

export async function PATCH(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await requireApiUser(['OWNER']);
    const body = schema.parse(await readJson(request));
    const db = await getDb();
    await db.transaction(async (tx) => {
      const result = await tx.query(
        `UPDATE business_settings SET business_name = $1, phone = $2, email = $3,
           address = $4, daily_target = $5, default_delivery_fee = $6, receipt_note = $7,
           updated_at = now()
         WHERE id = 'default' RETURNING id`,
        [
          body.businessName,
          body.phone,
          body.email,
          body.address,
          body.dailyTarget,
          body.defaultDeliveryFee,
          body.receiptNote,
        ]
      );
      if (!result.length) throw new ApiError(500, 'Pengaturan bisnis tidak ditemukan.');
      await recordAudit(tx, {
        actorId: user.id,
        action: 'SETTINGS_UPDATED',
        entityType: 'BUSINESS_SETTINGS',
        entityId: 'default',
        summary: 'Pengaturan profil bisnis diperbarui.',
      });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
