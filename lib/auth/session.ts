import { randomBytes, createHash } from 'crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { getDb } from '@/lib/db';
import type { Role, SessionUser } from '@/lib/types';

export const SESSION_COOKIE = 'thiz_session';
const SESSION_DAYS = 14;

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function canAccess(role: Role, allowed?: Role[]): boolean {
  return !allowed || allowed.includes(role);
}

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const rows = await db.query<{
    id: string;
    name: string;
    email: string;
    role: Role;
  }>(
    `SELECT u.id, u.name, u.email, u.role
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now() AND u.active = TRUE
     LIMIT 1`,
    [hashToken(token)]
  );
  const row = rows[0];
  return row ? { id: row.id, name: row.name, email: row.email, role: row.role } : null;
});

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  const db = await getDb();
  await db.query('DELETE FROM sessions WHERE expires_at <= now()');
  await db.query(
    `INSERT INTO sessions (id, token_hash, user_id, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [randomBytes(16).toString('hex'), hashToken(token), userId, expiresAt.toISOString()]
  );
  return { token, expiresAt };
}

export function writeSessionCookie(token: string, expiresAt: Date) {
  cookies().set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  });
}

export function clearSessionCookie() {
  cookies().set({
    name: SESSION_COOKIE,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(0),
  });
}

export async function revokeCurrentSession() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return;
  const db = await getDb();
  await db.query('DELETE FROM sessions WHERE token_hash = $1', [hashToken(token)]);
}

export async function requireUser(nextPath = '/dashboard'): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
  return user;
}

export async function requirePageRole(
  roles: Role[],
  nextPath = '/dashboard'
): Promise<SessionUser> {
  const user = await requireUser(nextPath);
  if (!canAccess(user.role, roles)) {
    redirect('/dashboard?denied=1');
  }
  return user;
}
