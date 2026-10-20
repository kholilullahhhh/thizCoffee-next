import { NextResponse } from 'next/server';
import { handleApiError, requireSameOrigin } from '@/lib/api';
import {
  clearSessionCookie,
  getCurrentUser,
  revokeCurrentSession,
} from '@/lib/auth/session';
import { recordAudit } from '@/lib/audit';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await getCurrentUser();
    await revokeCurrentSession();
    clearSessionCookie();
    if (user) {
      const db = await getDb();
      await recordAudit(db, {
        actorId: user.id,
        action: 'LOGOUT',
        entityType: 'SESSION',
        entityId: user.id,
        summary: `${user.name} keluar dari dashboard.`,
      });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
