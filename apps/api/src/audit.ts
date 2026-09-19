import { uuidv7 } from "./lib/id";
import { nowIso } from "./lib/time";

export interface AuditEntry {
  action: string;
  tenantId?: string | null;
  actorUserId?: string | null;
  targetType?: string;
  targetId?: string;
  ipHash?: string;
  /** Small facts only. Never put passwords, tokens or full emails here. */
  meta?: Record<string, string | number | boolean | null>;
}

/** Adds one row to the audit log. The table refuses updates and deletes. */
export function auditStatement(db: D1Database, e: AuditEntry): D1PreparedStatement {
  return db
    .prepare(
      `INSERT INTO audit_log (id, at, tenant_id, actor_user_id, action, target_type, target_id, ip_hash, meta)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      uuidv7(),
      nowIso(),
      e.tenantId ?? null,
      e.actorUserId ?? null,
      e.action,
      e.targetType ?? null,
      e.targetId ?? null,
      e.ipHash ?? null,
      e.meta ? JSON.stringify(e.meta) : null,
    );
}

export async function audit(db: D1Database, e: AuditEntry): Promise<void> {
  await auditStatement(db, e).run();
}
