import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { requireApiUser, handleApiError, readJson, requireSameOrigin, ApiError } from '@/lib/api';
import { recordAudit } from '@/lib/audit';
import { hashPassword, isValidPassword } from '@/lib/auth/password';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email('Email tidak valid.').max(200),
  role: z.enum(['OWNER', 'STAFF', 'INVENTORY']),
  password: z.string().min(8, 'Password minimal 8 karakter.').max(128),
});

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const actor = await requireApiUser(['OWNER']);
    const body = schema.parse(await readJson(request));
    if (!isValidPassword(body.password)) {
      throw new ApiError(422, 'Password harus 8–128 karakter.');
    }
    const db = await getDb();
    const duplicate = await db.query('SELECT id FROM users WHERE lower(email) = lower($1)', [
      body.email,
    ]);
    if (duplicate.length) throw new ApiError(409, 'Email sudah digunakan akun lain.');

    const id = `user-${randomUUID()}`;
    await db.transaction(async (tx) => {
      await tx.query(
        `INSERT INTO users (id, name, email, password_hash, role, active)
         VALUES ($1, $2, $3, $4, $5, TRUE)`,
        [id, body.name, body.email.toLowerCase(), hashPassword(body.password), body.role]
      );
      await recordAudit(tx, {
        actorId: actor.id,
        action: 'USER_CREATED',
        entityType: 'USER',
        entityId: id,
        summary: `Akun ${body.name} (${body.role}) dibuat.`,
      });
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
