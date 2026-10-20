import { randomUUID } from 'crypto';
import type { DbExecutor } from '@/lib/db';

export async function recordAudit(
  db: DbExecutor,
  input: {
    actorId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    summary: string;
    metadata?: Record<string, unknown> | null;
  }
) {
  await db.query(
    `INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, summary, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
    [
      randomUUID(),
      input.actorId ?? null,
      input.action,
      input.entityType,
      input.entityId ?? null,
      input.summary,
      input.metadata ? JSON.stringify(input.metadata) : null,
    ]
  );
}
