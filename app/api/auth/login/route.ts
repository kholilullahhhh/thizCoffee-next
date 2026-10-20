import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  ApiError,
  handleApiError,
  readJson,
  requireSameOrigin,
} from '@/lib/api';
import { verifyPassword, DUMMY_HASH } from '@/lib/auth/password';
import { createSession, writeSessionCookie } from '@/lib/auth/session';
import { recordAudit } from '@/lib/audit';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({
  email: z.string().trim().email('Email tidak valid.').max(200),
  password: z.string().min(1, 'Password wajib diisi.').max(200),
});

type Attempt = { count: number; resetAt: number };
const attempts = new Map<string, Attempt>();

function rateLimitKey(request: Request, email: string) {
  const forwarded = request.headers.get('x-forwarded-for') || '';
  const ip = forwarded.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'local';
  return `${ip}:${email.toLowerCase()}`;
}

function checkRateLimit(key: string) {
  const now = Date.now();
  if (attempts.size > 5_000) {
    for (const [storedKey, entry] of Array.from(attempts.entries())) {
      if (entry.resetAt < now) attempts.delete(storedKey);
    }
  }
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + 15 * 60_000 });
    return;
  }
  entry.count += 1;
  if (entry.count > 10) {
    throw new ApiError(429, 'Terlalu banyak percobaan masuk. Coba lagi dalam 15 menit.');
  }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const body = schema.parse(await readJson(request));
    const email = body.email.toLowerCase();
    const key = rateLimitKey(request, email);
    checkRateLimit(key);

    const db = await getDb();
    const rows = await db.query<{
      id: string;
      name: string;
      email: string;
      role: 'OWNER' | 'STAFF' | 'INVENTORY';
      password_hash: string;
      active: boolean;
    }>(
      `SELECT id, name, email, role, password_hash, active
       FROM users WHERE lower(email) = $1 LIMIT 1`,
      [email]
    );
    const user = rows[0];
    const valid = verifyPassword(body.password, user?.password_hash ?? DUMMY_HASH);

    if (!user || !user.active || !valid) {
      throw new ApiError(401, 'Email atau password salah.');
    }

    attempts.delete(key);
    const session = await createSession(user.id);
    writeSessionCookie(session.token, session.expiresAt);
    await recordAudit(db, {
      actorId: user.id,
      action: 'LOGIN',
      entityType: 'SESSION',
      entityId: user.id,
      summary: `${user.name} masuk ke dashboard.`,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
