import {
  LIMITS,
  MAX_IMPORT_ROWS,
  addStudentBody,
  type AddStudentBody,
  type ImportResult,
  type ImportRowResult,
  type ImportStudentsBody,
  type StudentFilter,
  type StudentInfo,
  type UpdateStudentBody,
} from "@lms/shared";
import { requireTeacherTenant, type Actor } from "../auth/actor";
import type { Ctx } from "../auth/service";
import { audit, auditStatement } from "../audit";
import { AppError } from "../lib/errors";
import { uuidv7 } from "../lib/id";
import { authorize } from "../policy";
import {
  existingEmails,
  findStudentByEmail,
  findStudentWithInvite,
  insertStudent,
  listStudents,
  setStudentArchived,
  updateStudentProfile,
  type StudentListRow,
} from "../repos/students";
import { invitesInLastDay } from "../repos/tokens";
import { INVITES_PER_DAY, issueInvite } from "./invites";

export const toStudentInfo = (r: StudentListRow): StudentInfo => ({
  id: r.id,
  name: r.name,
  email: r.email,
  phone: r.phone,
  access: r.user_id ? "joined" : r.ever_invited ? "invited" : "not_invited",
  archived: r.status === "archived",
  teacherNote: r.teacher_note,
  version: r.version,
  createdAt: r.created_at,
});

async function load(ctx: Ctx, tenantId: string, id: string): Promise<StudentListRow> {
  const row = await findStudentWithInvite(ctx.env.DB, tenantId, id);
  if (!row) throw new AppError("NOT_FOUND"); // also the answer for another teacher's student
  return row;
}

export async function studentList(
  ctx: Ctx,
  actor: Actor,
  q: { search: string; filter: StudentFilter; page: number; pageSize?: number },
): Promise<{ students: StudentInfo[]; total: number; page: number; pageSize: number }> {
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "student", "read", { tenantId });
  const page = Math.max(1, q.page);
  const pageSize = Math.min(LIMITS.maxPageSize, Math.max(1, q.pageSize ?? LIMITS.pageSize));
  const { rows, total } = await listStudents(ctx.env.DB, tenantId, {
    search: q.search.trim().slice(0, 100),
    filter: q.filter,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  return { students: rows.map(toStudentInfo), total, page, pageSize };
}

export async function studentGet(ctx: Ctx, actor: Actor, id: string): Promise<StudentInfo> {
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "student", "read", { tenantId });
  return toStudentInfo(await load(ctx, tenantId, id));
}

const alreadyAdded = (archived: boolean) =>
  new AppError("VALIDATION_FAILED", {
    fields: {
      email: archived ? "This student is archived. Restore them instead." : "You already added this student.",
    },
  });

export async function studentAdd(ctx: Ctx, actor: Actor, body: AddStudentBody): Promise<StudentInfo> {
  const db = ctx.env.DB;
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "student", "create", { tenantId });

  if (body.invite) {
    // Checked before anything is saved, so a refused invite does not leave a half-made student.
    if (!actor.emailVerified) throw new AppError("EMAIL_NOT_VERIFIED");
    if ((await invitesInLastDay(db, tenantId)) >= INVITES_PER_DAY) throw new AppError("INVITE_LIMIT");
  }
  const existing = await findStudentByEmail(db, tenantId, body.email);
  if (existing) throw alreadyAdded(existing.status === "archived");

  const id = uuidv7();
  try {
    await db.batch([
      insertStudent(db, { id, tenantId, name: body.name, email: body.email, phone: body.phone ?? "" }),
      auditStatement(db, {
        action: "student.added",
        actorUserId: actor.userId,
        tenantId,
        targetType: "student",
        targetId: id,
        ipHash: ctx.ipHash,
      }),
    ]);
  } catch (err) {
    if (String(err).includes("UNIQUE")) throw alreadyAdded(false); // added at the same moment by another request
    throw err;
  }
  if (body.invite) await issueInvite(ctx, actor, tenantId, { id, name: body.name, email: body.email }, []);
  return toStudentInfo(await load(ctx, tenantId, id));
}

export async function studentUpdate(
  ctx: Ctx,
  actor: Actor,
  id: string,
  body: UpdateStudentBody,
): Promise<StudentInfo> {
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "student", "update", { tenantId });
  await load(ctx, tenantId, id);
  const { version, ...profile } = body;
  const res = await updateStudentProfile(ctx.env.DB, tenantId, id, version, profile).run();
  if (!res.meta.changes) throw new AppError("CONFLICT");
  await audit(ctx.env.DB, {
    action: "student.updated",
    actorUserId: actor.userId,
    tenantId,
    targetType: "student",
    targetId: id,
    ipHash: ctx.ipHash,
  });
  return toStudentInfo(await load(ctx, tenantId, id));
}

export async function studentSetArchived(
  ctx: Ctx,
  actor: Actor,
  id: string,
  archived: boolean,
): Promise<StudentInfo> {
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "student", archived ? "delete" : "update", { tenantId });
  await load(ctx, tenantId, id);
  const res = await setStudentArchived(ctx.env.DB, tenantId, id, archived).run();
  if (!res.meta.changes) throw new AppError("CONFLICT");
  await audit(ctx.env.DB, {
    action: archived ? "student.archived" : "student.restored",
    actorUserId: actor.userId,
    tenantId,
    targetType: "student",
    targetId: id,
    ipHash: ctx.ipHash,
  });
  return toStudentInfo(await load(ctx, tenantId, id));
}

/**
 * CSV import (rows come from the browser, which reads the file).
 * dryRun: only check every row. Otherwise: create the rows that are "new".
 * Rows with a problem never stop the good rows, and the answer says what happened to each row.
 */
export async function studentImport(ctx: Ctx, actor: Actor, body: ImportStudentsBody): Promise<ImportResult> {
  const db = ctx.env.DB;
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "student", "create", { tenantId });
  if (body.rows.length > MAX_IMPORT_ROWS) throw new AppError("VALIDATION_FAILED");

  const parsed = body.rows.map((raw) => {
    const r = addStudentBody.safeParse({
      name: raw.name,
      email: raw.email,
      phone: raw.phone?.trim() || undefined,
    });
    return r.success
      ? { ok: true as const, value: r.data }
      : { ok: false as const, message: r.error.issues[0]?.message ?? "This row is not valid." };
  });
  const known = await existingEmails(
    db,
    tenantId,
    parsed.flatMap((p) => (p.ok ? [p.value.email] : [])),
  );

  const seen = new Set<string>();
  const results: ImportRowResult[] = [];
  const toCreate: { name: string; email: string; phone: string }[] = [];
  parsed.forEach((p, i) => {
    const row = i + 1;
    if (!p.ok) return void results.push({ row, result: "invalid", message: p.message });
    const { email, name, phone } = p.value;
    if (seen.has(email))
      return void results.push({
        row,
        result: "duplicate_in_list",
        message: "This email is in the list more than once.",
      });
    seen.add(email);
    if (known.has(email))
      return void results.push({ row, result: "exists", message: "You already added this student." });
    results.push({ row, result: "new" });
    toCreate.push({ name, email, phone: phone ?? "" });
  });

  if (body.dryRun) return { rows: results, created: 0 };

  try {
    for (let i = 0; i < toCreate.length; i += 50) {
      await db.batch(
        toCreate.slice(i, i + 50).map((s) => insertStudent(db, { id: uuidv7(), tenantId, ...s })),
      );
    }
  } catch (err) {
    // Someone added one of these emails while we were working.
    if (String(err).includes("UNIQUE")) throw new AppError("CONFLICT");
    throw err;
  }
  await audit(db, {
    action: "student.imported",
    actorUserId: actor.userId,
    tenantId,
    ipHash: ctx.ipHash,
    meta: { created: toCreate.length },
  });
  return { rows: results, created: toCreate.length };
}
