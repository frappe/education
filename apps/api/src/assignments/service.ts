import type {
  AssignmentInfo,
  CreateAssignmentBody,
  MaterialBody,
  MaterialInfo,
  UpdateAssignmentBody,
} from "@lms/shared";
import { requireTeacherTenant, type Actor } from "../auth/actor";
import type { Ctx } from "../auth/service";
import { audit } from "../audit";
import { AppError } from "../lib/errors";
import { uuidv7 } from "../lib/id";
import { localToUtc, utcToLocal } from "../lib/zone";
import { authorize } from "../policy";
import {
  assignmentsOfCourse,
  clearTargetsStatement,
  closeStatement,
  deleteDraftStatement,
  deleteDraftTargetsStatement,
  deleteMaterialStatement,
  enrolledAmong,
  findAssignment,
  hasSubmissions,
  insertAssignmentStatement,
  insertMaterialStatement,
  insertTargetsAfterUpdateStatement,
  insertTargetsStatement,
  linksOf,
  materialsOf,
  publishStatement,
  questionsOf,
  targetIds,
  updateAssignmentStatement,
  updateMaterialStatement,
  type AssignmentRow,
} from "../repos/assignments";
import { findCourse } from "../repos/courses";
import { tenantTimezone } from "../repos/lessons";

export function toAssignmentInfo(r: AssignmentRow, zone: string, studentIds: string[] = []): AssignmentInfo {
  const due = r.due_at ? utcToLocal(r.due_at, zone) : null;
  return {
    id: r.id,
    courseId: r.course_id,
    courseName: r.course_name,
    type: r.type,
    title: r.title,
    instructions: r.instructions,
    questions: questionsOf(r),
    links: linksOf(r),
    dueDate: due?.date ?? null,
    dueTime: due?.time ?? null,
    dueAt: r.due_at,
    allowLate: r.allow_late === 1,
    maxScore: r.max_score,
    targetMode: r.target_mode,
    studentIds,
    status: r.status,
    version: r.version,
    counts: { targeted: r.targeted, handedIn: r.handed_in, toGrade: r.to_grade },
  };
}

async function load(ctx: Ctx, tenantId: string, id: string): Promise<AssignmentRow> {
  const row = await findAssignment(ctx.env.DB, tenantId, id);
  if (!row) throw new AppError("NOT_FOUND"); // also the answer for another teacher's assignment
  return row;
}

async function present(ctx: Ctx, tenantId: string, id: string): Promise<AssignmentInfo> {
  const row = await load(ctx, tenantId, id);
  const ids = row.target_mode === "selected" ? await targetIds(ctx.env.DB, tenantId, id) : [];
  return toAssignmentInfo(row, await tenantTimezone(ctx.env.DB, tenantId), ids);
}

/** The chosen students must all be in the course now. */
async function checkChosen(ctx: Ctx, tenantId: string, courseId: string, ids: string[]) {
  const ok = await enrolledAmong(ctx.env.DB, tenantId, courseId, ids);
  if (new Set(ids).size !== ids.length || ids.some((id) => !ok.has(id))) {
    throw new AppError("VALIDATION_FAILED", {
      fields: { studentIds: "Choose only students who are in this course." },
    });
  }
}

const writeOf = (body: CreateAssignmentBody, zone: string) => ({
  type: body.type,
  title: body.title,
  instructions: body.instructions,
  questions: body.questions,
  links: body.links,
  dueAt: body.dueDate && body.dueTime ? localToUtc(body.dueDate, body.dueTime, zone) : null,
  allowLate: body.allowLate,
  maxScore: body.maxScore,
  targetMode: body.targetMode,
});

export async function listAssignments(ctx: Ctx, actor: Actor, courseId: string): Promise<AssignmentInfo[]> {
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "assignment", "read", { tenantId });
  if (!(await findCourse(ctx.env.DB, tenantId, courseId))) throw new AppError("NOT_FOUND");
  const zone = await tenantTimezone(ctx.env.DB, tenantId);
  return (await assignmentsOfCourse(ctx.env.DB, tenantId, courseId)).map((r) => toAssignmentInfo(r, zone));
}

export async function getAssignment(ctx: Ctx, actor: Actor, id: string): Promise<AssignmentInfo> {
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "assignment", "read", { tenantId });
  return present(ctx, tenantId, id);
}

export async function createAssignment(
  ctx: Ctx,
  actor: Actor,
  courseId: string,
  body: CreateAssignmentBody,
): Promise<AssignmentInfo> {
  const db = ctx.env.DB;
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "assignment", "create", { tenantId });
  const course = await findCourse(db, tenantId, courseId);
  if (!course) throw new AppError("NOT_FOUND");
  if (course.status === "archived") {
    throw new AppError("CONFLICT", { message: "This course is archived. Restore it first." });
  }
  if (body.targetMode === "selected") await checkChosen(ctx, tenantId, courseId, body.studentIds);

  const id = uuidv7();
  const zone = await tenantTimezone(db, tenantId);
  const [made] = await db.batch([
    insertAssignmentStatement(db, { id, tenantId, courseId, ...writeOf(body, zone) }),
    ...(body.targetMode === "selected" ? [insertTargetsStatement(db, tenantId, id, body.studentIds)] : []),
  ]);
  if (!made?.meta.changes) throw new AppError("CONFLICT");
  await audit(db, {
    action: "assignment.created",
    actorUserId: actor.userId,
    tenantId,
    targetType: "assignment",
    targetId: id,
    ipHash: ctx.ipHash,
    meta: { type: body.type },
  });
  return present(ctx, tenantId, id);
}

export async function updateAssignment(
  ctx: Ctx,
  actor: Actor,
  id: string,
  body: UpdateAssignmentBody,
): Promise<AssignmentInfo> {
  const db = ctx.env.DB;
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "assignment", "update", { tenantId });
  const current = await load(ctx, tenantId, id);
  if (current.version !== body.version) throw new AppError("CONFLICT");
  if (current.status !== "draft" && current.type !== body.type) {
    throw new AppError("CONFLICT", { message: "The kind of work cannot change after it was published." });
  }
  if (
    JSON.stringify(questionsOf(current)) !== JSON.stringify(body.questions) &&
    (await hasSubmissions(db, tenantId, id))
  ) {
    throw new AppError("CONFLICT", {
      message: "The questions cannot change after students started answering.",
    });
  }
  if (body.targetMode === "selected") await checkChosen(ctx, tenantId, current.course_id, body.studentIds);

  const zone = await tenantTimezone(db, tenantId);
  const next = body.version + 1;
  const [changed] = await db.batch([
    updateAssignmentStatement(db, { tenantId, id, version: body.version, ...writeOf(body, zone) }),
    clearTargetsStatement(db, tenantId, id, next),
    ...(body.targetMode === "selected"
      ? [insertTargetsAfterUpdateStatement(db, tenantId, id, next, body.studentIds)]
      : []),
  ]);
  if (!changed?.meta.changes) throw new AppError("CONFLICT");
  await audit(db, {
    action: "assignment.updated",
    actorUserId: actor.userId,
    tenantId,
    targetType: "assignment",
    targetId: id,
    ipHash: ctx.ipHash,
  });
  return present(ctx, tenantId, id);
}

async function change(
  ctx: Ctx,
  actor: Actor,
  id: string,
  action: "publish" | "close",
  statement: (db: D1Database, tenantId: string, id: string) => D1PreparedStatement,
  conflict: string,
): Promise<AssignmentInfo> {
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "assignment", action === "publish" ? "publish" : "update", { tenantId });
  await load(ctx, tenantId, id);
  const res = await statement(ctx.env.DB, tenantId, id).run();
  if (!res.meta.changes) throw new AppError("CONFLICT", { message: conflict });
  await audit(ctx.env.DB, {
    action: `assignment.${action === "publish" ? "published" : "closed"}`,
    actorUserId: actor.userId,
    tenantId,
    targetType: "assignment",
    targetId: id,
    ipHash: ctx.ipHash,
  });
  return present(ctx, tenantId, id);
}

/** Students see it from now on. Also brings a closed one back. */
export const publishAssignment = (ctx: Ctx, actor: Actor, id: string) =>
  change(
    ctx,
    actor,
    id,
    "publish",
    publishStatement,
    "This work is already published, or its course is archived.",
  );

/** Students can no longer hand in. What they handed in stays. */
export const closeAssignment = (ctx: Ctx, actor: Actor, id: string) =>
  change(ctx, actor, id, "close", closeStatement, "Only published work can be closed.");

export async function deleteAssignment(ctx: Ctx, actor: Actor, id: string): Promise<void> {
  const db = ctx.env.DB;
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "assignment", "delete", { tenantId });
  await load(ctx, tenantId, id);
  const [, res] = await db.batch([
    deleteDraftTargetsStatement(db, tenantId, id),
    deleteDraftStatement(db, tenantId, id),
  ]);
  if (!res?.meta.changes) {
    throw new AppError("CONFLICT", { message: "Only a draft that nobody answered can be deleted." });
  }
  await audit(db, {
    action: "assignment.deleted",
    actorUserId: actor.userId,
    tenantId,
    targetType: "assignment",
    targetId: id,
    ipHash: ctx.ipHash,
  });
}

// ------------------------------------------------------------------ course links

const toMaterial = (r: {
  id: string;
  title: string;
  url: string;
  published: number;
  created_at: string;
}): MaterialInfo => ({
  id: r.id,
  title: r.title,
  url: r.url,
  published: r.published === 1,
  createdAt: r.created_at,
});

export async function listMaterials(ctx: Ctx, actor: Actor, courseId: string): Promise<MaterialInfo[]> {
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "material", "read", { tenantId });
  if (!(await findCourse(ctx.env.DB, tenantId, courseId))) throw new AppError("NOT_FOUND");
  return (await materialsOf(ctx.env.DB, tenantId, courseId)).map(toMaterial);
}

export async function addMaterial(
  ctx: Ctx,
  actor: Actor,
  courseId: string,
  body: MaterialBody,
): Promise<MaterialInfo[]> {
  const db = ctx.env.DB;
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "material", "create", { tenantId });
  const course = await findCourse(db, tenantId, courseId);
  if (!course) throw new AppError("NOT_FOUND");
  if (course.status === "archived") {
    throw new AppError("CONFLICT", { message: "This course is archived. Restore it first." });
  }
  const res = await insertMaterialStatement(db, { id: uuidv7(), tenantId, courseId, ...body }).run();
  if (!res.meta.changes) throw new AppError("CONFLICT");
  return (await materialsOf(db, tenantId, courseId)).map(toMaterial);
}

export async function editMaterial(
  ctx: Ctx,
  actor: Actor,
  courseId: string,
  id: string,
  body: MaterialBody,
): Promise<MaterialInfo[]> {
  const db = ctx.env.DB;
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "material", "update", { tenantId });
  const res = await updateMaterialStatement(db, { tenantId, courseId, id, ...body }).run();
  if (!res.meta.changes) throw new AppError("NOT_FOUND");
  return (await materialsOf(db, tenantId, courseId)).map(toMaterial);
}

export async function removeMaterial(
  ctx: Ctx,
  actor: Actor,
  courseId: string,
  id: string,
): Promise<MaterialInfo[]> {
  const db = ctx.env.DB;
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "material", "delete", { tenantId });
  const res = await deleteMaterialStatement(db, tenantId, courseId, id).run();
  if (!res.meta.changes) throw new AppError("NOT_FOUND");
  return (await materialsOf(db, tenantId, courseId)).map(toMaterial);
}
