import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { requireApiUser, handleApiError, readJson, requireSameOrigin } from '@/lib/api';
import { recordAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(40).nullable().optional(),
  email: z.string().trim().email('Email tidak valid.').max(200).nullable().optional().or(z.literal('')),
  address: z.string().trim().max(500).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
  active: z.boolean().default(true),
});

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await requireApiUser(['OWNER', 'STAFF']);
    const body = schema.parse(await readJson(request));
    const db = await getDb();
    const id = `cust-${randomUUID()}`;
    await db.transaction(async (tx) => {
      await tx.query(
        `INSERT INTO customers (id, name, phone, email, address, notes, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          id,
          body.name,
          body.phone || null,
          body.email || null,
          body.address || null,
          body.notes || null,
          body.active,
        ]
      );
      await recordAudit(tx, {
        actorId: user.id,
        action: 'CUSTOMER_CREATED',
        entityType: 'CUSTOMER',
        entityId: id,
        summary: `Pelanggan ${body.name} ditambahkan.`,
      });
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
