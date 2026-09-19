import type { InviteInfo } from "@lms/shared";
import { teacherMembership, type Actor } from "../auth/actor";
import { openSession, sendMail, type Ctx } from "../auth/service";
import type { NewSession } from "../auth/session";
import { auditStatement } from "../audit";
import { inviteMessage } from "../email/templates";
import { appUrl } from "../lib/config";
import { AppError } from "../lib/errors";
import { uuidv7 } from "../lib/id";
import { authorize } from "../policy";
import {
  activateStudent,
  findStudent,
  findStudentByEmail,
  insertStudent,
  listInvites,
  reinviteStudent,
  type StudentRow,
} from "../repos/students";
import { consumeToken, invitesInLastDay, newToken, revokeInvites } from "../repos/tokens";
import {
  findUserByEmail,
  insertMembership,
  insertUser,
  markEmailVerified,
  tenantIsActive,
} from "../repos/users";
import { hit } from "../security/rate-limit";
import { hmacHex } from "../lib/crypto";
import { hmacKey } from "../lib/config";

const INVITES_PER_DAY = 50;
const INVITE_DAYS = 7;

function teacherOf(actor: Actor): { tenantId: string } {
  const m = teacherMembership(actor);
  if (!m) throw new AppError("FORBIDDEN");
  return { tenantId: m.tenantId };
}

/** Makes a new invite link (older ones stop working) and emails it. */
async function issueInvite(
  ctx: Ctx,
  actor: Actor,
  tenantId: string,
  student: Pick<StudentRow, "id" | "name" | "email">,
  before: D1PreparedStatement[],
) {
  const db = ctx.env.DB;
  const { token, statement } = await newToken(db, {
    kind: "invite",
    email: student.email,
    ttlMinutes: INVITE_DAYS * 24 * 60,
    tenantId,
    studentId: student.id,
  });
  await db.batch([
    ...before,
    revokeInvites(db, student.id),
    statement,
    auditStatement(db, {
      action: "student.invited",
      actorUserId: actor.userId,
      tenantId,
      targetType: "student",
      targetId: student.id,
      ipHash: ctx.ipHash,
    }),
  ]);
  await sendMail(
    ctx,
    inviteMessage(student.email, student.name, actor.name, `${appUrl(ctx.env)}/accept-invite?token=${token}`),
  );
}

export async function inviteStudent(
  ctx: Ctx,
  actor: Actor,
  input: { name: string; email: string },
): Promise<void> {
  const db = ctx.env.DB;
  const { tenantId } = teacherOf(actor);
  authorize(actor, "student", "create", { tenantId });
  // A teacher must prove their own email first, so the platform cannot be used to mail strangers.
  if (!actor.emailVerified) throw new AppError("EMAIL_NOT_VERIFIED");
  if ((await invitesInLastDay(db, tenantId)) >= INVITES_PER_DAY) throw new AppError("INVITE_LIMIT");
  const burst = await hit(db, `invite:${await hmacHex(hmacKey(ctx.env), `tenant:${tenantId}`)}`, 20, 60);
  if (!burst.allowed) throw new AppError("RATE_LIMITED");

  const existing = await findStudentByEmail(db, tenantId, input.email);
  if (existing?.status === "active") {
    throw new AppError("VALIDATION_FAILED", { fields: { email: "This student has already joined." } });
  }
  if (existing) {
    await issueInvite(ctx, actor, tenantId, { id: existing.id, name: input.name, email: existing.email }, [
      reinviteStudent(db, tenantId, existing.id, input.name),
    ]);
    return;
  }
  const id = uuidv7();
  await issueInvite(ctx, actor, tenantId, { id, name: input.name, email: input.email }, [
    insertStudent(db, { id, tenantId, name: input.name, email: input.email }),
  ]);
}

export async function resendInvite(ctx: Ctx, actor: Actor, studentId: string): Promise<void> {
  const db = ctx.env.DB;
  const { tenantId } = teacherOf(actor);
  authorize(actor, "student", "update", { tenantId });
  if (!actor.emailVerified) throw new AppError("EMAIL_NOT_VERIFIED");
  // The tenant id is part of the lookup, so another teacher's student is simply "not found".
  const student = await findStudent(db, tenantId, studentId);
  if (!student || student.status !== "invited") throw new AppError("NOT_FOUND");
  if ((await invitesInLastDay(db, tenantId)) >= INVITES_PER_DAY) throw new AppError("INVITE_LIMIT");
  await issueInvite(ctx, actor, tenantId, student, []);
}

export async function revokeInvite(ctx: Ctx, actor: Actor, studentId: string): Promise<void> {
  const db = ctx.env.DB;
  const { tenantId } = teacherOf(actor);
  authorize(actor, "student", "update", { tenantId });
  const student = await findStudent(db, tenantId, studentId);
  if (!student || student.status !== "invited") throw new AppError("NOT_FOUND");
  await db.batch([
    revokeInvites(db, student.id),
    auditStatement(db, {
      action: "student.invite_revoked",
      actorUserId: actor.userId,
      tenantId,
      targetType: "student",
      targetId: student.id,
      ipHash: ctx.ipHash,
    }),
  ]);
}

export async function invitesOf(ctx: Ctx, actor: Actor): Promise<InviteInfo[]> {
  const { tenantId } = teacherOf(actor);
  authorize(actor, "student", "read", { tenantId });
  const now = Date.now();
  return (await listInvites(ctx.env.DB, tenantId)).map((r) => ({
    studentId: r.id,
    name: r.name,
    email: r.email,
    sentAt: r.sent_at,
    state:
      r.revoked_at || !r.sent_at
        ? "revoked"
        : new Date(r.expires_at ?? 0).getTime() <= now
          ? "expired"
          : "sent",
  }));
}

/** A student opens the invite link. Creates the account if needed and signs them in. */
export async function acceptInvite(ctx: Ctx, token: string, trustDevice: boolean): Promise<NewSession> {
  const db = ctx.env.DB;
  const limit = await hit(db, `token:ip:${ctx.ipHash}`, 60, 900);
  if (!limit.allowed) throw new AppError("RATE_LIMITED");

  const row = await consumeToken(db, token, "invite");
  if (!row?.tenant_id || !row.student_id) throw new AppError("LINK_EXPIRED");

  if (!(await tenantIsActive(db, row.tenant_id))) throw new AppError("ACCOUNT_PAUSED");

  const student = await findStudent(db, row.tenant_id, row.student_id);
  if (!student || student.status === "archived") throw new AppError("LINK_EXPIRED");

  const existing = await findUserByEmail(db, student.email);
  if (existing?.disabled_at) throw new AppError("ACCOUNT_PAUSED");

  const userId = existing?.id ?? uuidv7();
  const before: D1PreparedStatement[] = existing
    ? [markEmailVerified(db, userId)]
    : [
        insertUser(db, {
          id: userId,
          email: student.email,
          name: student.name,
          passwordHash: null,
          verified: true,
        }),
      ];
  before.push(
    insertMembership(db, { userId, tenantId: row.tenant_id, role: "student" }),
    activateStudent(db, row.tenant_id, student.id, userId),
  );
  return openSession(ctx, userId, {
    trustDevice,
    before,
    action: "student.invite_accepted",
    tenantId: row.tenant_id,
  });
}
