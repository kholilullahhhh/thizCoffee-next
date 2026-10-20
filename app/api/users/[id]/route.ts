import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { requireApiUser, handleApiError, readJson, requireSameOrigin, ApiError } from '@/lib/api';
import { recordAudit } from '@/lib/audit';
import { hashPassword, isValidPassword } from '@/lib/auth/password';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  role: z.enum(['OWNER', 'STAFF', 'INVENTORY']).optional(),
  active: z.boolean().optional(),
  password: z.string().min(8).max(128).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    requireSameOrigin(request);
    const actor = await requireApiUser(['OWNER']);
    const body = schema.parse(await readJson(request));
    const db = await getDb();

    const rows = await db.query<{ id: string; name: string; role: string; active: boolean }>(
      'SELECT id, name, role, active FROM users WHERE id = $1',
      [params.id]
    );
    const target = rows[0];
    if (!target) throw new ApiError(404, 'Akun tidak ditemukan.');

    const isSelf = target.id === actor.id;
    if (isSelf && body.active === false) {
      throw new ApiError(409, 'Anda tidak dapat menonaktifkan akun sendiri.');
    }
    if (target.role === 'OWNER' && (body.role !== undefined && body.role !== 'OWNER' || body.active === false)) {
      const owners = await db.query<{ count: unknown }>(
        "SELECT COUNT(*) AS count FROM users WHERE role = 'OWNER' AND active = TRUE"
      );
      if (Number(owners[0]?.count || 0) <= 1) {
        throw new ApiError(409, 'Harus ada minimal satu akun OWNER yang aktif.');
      }
    }

    const fields: string[] = [];
    const values: unknown[] = [];
    const add = (column: string, value: unknown) => {
      values.push(value);
      fields.push(`${column} = $${values.length}`);
    };
    if (body.name !== undefined) add('name', body.name);
    if (body.role !== undefined) add('role', body.role);
    if (body.active !== undefined) add('active', body.active);
    if (body.password !== undefined) {
      if (!isValidPassword(body.password)) throw new ApiError(422, 'Password harus 8–128 karakter.');
      add('password_hash', hashPassword(body.password));
    }
    await db.transaction(async (tx) => {
      if (fields.length) {
        values.push(params.id);
        await tx.query(
          `UPDATE users SET ${fields.join(', ')}, updated_at = now() WHERE id = $${values.length}`,
          values
        );
        if (body.active === false || body.password !== undefined) {
          await tx.query('DELETE FROM sessions WHERE user_id = $1', [params.id]);
        }
      }

      await recordAudit(tx, {
        actorId: actor.id,
        action: 'USER_UPDATED',
        entityType: 'USER',
        entityId: params.id,
        summary: `Akun ${target.name} diperbarui.`,
        metadata: { fields: Object.keys(body) },
      });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
