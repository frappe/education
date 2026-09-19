import type {
  ExtensionBody,
  GradeBody,
  QueueItem,
  RevisionBody,
  SubmissionDetail,
  SubmissionRow,
} from "@lms/shared";
import { toAssignmentInfo } from "../assignments/service";
import { requireTeacherTenant, type Actor } from "../auth/actor";
import type { Ctx } from "../auth/service";
import { audit } from "../audit";
import { AppError } from "../lib/errors";
import { nowIso } from "../lib/time";
import { localToUtc } from "../lib/zone";
import { authorize } from "../policy";
import { findAssignment, parseList, targetIds } from "../repos/assignments";
import {
  clearExtensionStatement,
  findSubmission,
  gradeStatement,
  historyOf,
  queueOf,
  requestRevisionStatement,
  returnStatement,
  rosterOf,
  setExtensionStatement,
  type SubmissionRowFull,
} from "../repos/grading";
import { tenantTimezone } from "../repos/lessons";

async function assignmentOf(ctx: Ctx, tenantId: string, id: string) {
  const a = await findAssignment(ctx.env.DB, tenantId, id);
  if (!a) throw new AppError("NOT_FOUND"); // also the answer for another teacher's assignment
  return a;
}

async function submissionOf(ctx: Ctx, tenantId: string, assignmentId: string, studentId: string) {
  const s = await findSubmission(ctx.env.DB, tenantId, assignmentId, studentId);
  if (!s) throw new AppError("NOT_FOUND"); // nothing handed in yet, or not this teacher's student
  return s;
}

export async function submissionList(ctx: Ctx, actor: Actor, assignmentId: string): Promise<SubmissionRow[]> {
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "submission", "read", { tenantId });
  const a = await assignmentOf(ctx, tenantId, assignmentId);
  const rows = await rosterOf(ctx.env.DB, tenantId, assignmentId, a.course_id, a.target_mode);
  return rows.map((r) => ({
    studentId: r.student_id,
    studentName: r.name,
    status: r.status ?? "not_started",
    isLate: r.is_late === 1,
    submittedAt: r.submitted_at,
    score: r.score,
    version: r.version,
    extensionUntil: r.until_at,
  }));
}

async function detailOf(
  ctx: Ctx,
  tenantId: string,
  assignmentId: string,
  studentId: string,
  s?: SubmissionRowFull,
): Promise<SubmissionDetail> {
  const a = await assignmentOf(ctx, tenantId, assignmentId);
  const sub = s ?? (await submissionOf(ctx, tenantId, assignmentId, studentId));
  const zone = await tenantTimezone(ctx.env.DB, tenantId);
  const ids = a.target_mode === "selected" ? await targetIds(ctx.env.DB, tenantId, assignmentId) : [];
  return {
    assignment: toAssignmentInfo(a, zone, ids),
    studentId: sub.student_id,
    studentName: sub.student_name,
    status: sub.status,
    isLate: sub.is_late === 1,
    submittedAt: sub.submitted_at,
    revisionCount: sub.revision_count,
    answer: { textAnswer: sub.text_answer, linkUrl: sub.link_url, answers: parseList<number>(sub.answers) },
    score: sub.score,
    feedback: sub.feedback,
    version: sub.version,
    history: (await historyOf(ctx.env.DB, tenantId, sub.id)).map((h) => ({
      at: h.at,
      by: h.by_name,
      oldScore: h.old_score,
      newScore: h.new_score,
      feedback: h.new_feedback,
    })),
    extensionUntil: sub.until_at,
  };
}

export async function submissionGet(
  ctx: Ctx,
  actor: Actor,
  assignmentId: string,
  studentId: string,
): Promise<SubmissionDetail> {
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "submission", "read", { tenantId });
  return detailOf(ctx, tenantId, assignmentId, studentId);
}

const conflictText = "This answer was changed since you opened it. Please open it again.";

export async function grade(
  ctx: Ctx,
  actor: Actor,
  assignmentId: string,
  studentId: string,
  body: GradeBody,
): Promise<SubmissionDetail> {
  const db = ctx.env.DB;
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "submission", "grade", { tenantId });
  const a = await assignmentOf(ctx, tenantId, assignmentId);
  if (body.score > a.max_score) {
    throw new AppError("VALIDATION_FAILED", {
      fields: { score: `The most for this work is ${a.max_score}.` },
    });
  }
  const current = await submissionOf(ctx, tenantId, assignmentId, studentId);
  if (current.version !== body.version) throw new AppError("CONFLICT", { message: conflictText });

  const changed = await gradeStatement(db, {
    tenantId,
    assignmentId,
    studentId,
    version: body.version,
    score: body.score,
    feedback: body.feedback,
    graderId: actor.userId,
  }).run();
  if (!changed.meta.changes) throw new AppError("CONFLICT", { message: conflictText });
  await audit(db, {
    action: "submission.graded",
    actorUserId: actor.userId,
    tenantId,
    targetType: "assignment",
    targetId: assignmentId,
    ipHash: ctx.ipHash,
    meta: { returned: current.status === "returned" },
  });
  return detailOf(ctx, tenantId, assignmentId, studentId);
}

/** From now on the student sees the score and feedback. */
export async function giveBack(
  ctx: Ctx,
  actor: Actor,
  assignmentId: string,
  studentId: string,
  version: number,
): Promise<SubmissionDetail> {
  const db = ctx.env.DB;
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "submission", "grade", { tenantId });
  await assignmentOf(ctx, tenantId, assignmentId);
  const current = await submissionOf(ctx, tenantId, assignmentId, studentId);
  if (current.version !== version) throw new AppError("CONFLICT", { message: conflictText });
  const res = await returnStatement(db, { tenantId, assignmentId, studentId, version }).run();
  if (!res.meta.changes) {
    throw new AppError("CONFLICT", { message: "Give a score first. Only scored work can be returned." });
  }
  await audit(db, {
    action: "submission.returned",
    actorUserId: actor.userId,
    tenantId,
    targetType: "assignment",
    targetId: assignmentId,
    ipHash: ctx.ipHash,
  });
  return detailOf(ctx, tenantId, assignmentId, studentId);
}

/** Asks the student to do it again. The reason is shown to the student. */
export async function askAgain(
  ctx: Ctx,
  actor: Actor,
  assignmentId: string,
  studentId: string,
  body: RevisionBody,
): Promise<SubmissionDetail> {
  const db = ctx.env.DB;
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "submission", "grade", { tenantId });
  const a = await assignmentOf(ctx, tenantId, assignmentId);
  const current = await submissionOf(ctx, tenantId, assignmentId, studentId);
  if (current.version !== body.version) throw new AppError("CONFLICT", { message: conflictText });
  if (a.status === "closed") {
    throw new AppError("CONFLICT", { message: "This work is closed. Open it again first." });
  }
  const changed = await requestRevisionStatement(db, {
    tenantId,
    assignmentId,
    studentId,
    version: body.version,
    feedback: body.feedback,
    graderId: actor.userId,
  }).run();
  if (!changed.meta.changes) throw new AppError("CONFLICT", { message: conflictText });
  await audit(db, {
    action: "submission.revision_requested",
    actorUserId: actor.userId,
    tenantId,
    targetType: "assignment",
    targetId: assignmentId,
    ipHash: ctx.ipHash,
  });
  return detailOf(ctx, tenantId, assignmentId, studentId);
}

// ---------------------------------------------------------------- more time

export async function giveMoreTime(
  ctx: Ctx,
  actor: Actor,
  assignmentId: string,
  studentId: string,
  body: ExtensionBody,
): Promise<SubmissionRow[]> {
  const db = ctx.env.DB;
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "submission", "update", { tenantId });
  const a = await assignmentOf(ctx, tenantId, assignmentId);
  if (a.status === "draft") throw new AppError("CONFLICT", { message: "Publish the work first." });
  const roster = await rosterOf(db, tenantId, assignmentId, a.course_id, a.target_mode);
  if (!roster.some((r) => r.student_id === studentId)) throw new AppError("NOT_FOUND");
  const untilAt = localToUtc(body.date, body.time, await tenantTimezone(db, tenantId));
  if (untilAt <= nowIso()) {
    throw new AppError("VALIDATION_FAILED", { fields: { date: "Please choose a time in the future." } });
  }
  const res = await setExtensionStatement(db, { tenantId, assignmentId, studentId, untilAt }).run();
  if (!res.meta.changes) throw new AppError("NOT_FOUND");
  await audit(db, {
    action: "submission.extended",
    actorUserId: actor.userId,
    tenantId,
    targetType: "assignment",
    targetId: assignmentId,
    ipHash: ctx.ipHash,
  });
  return submissionList(ctx, actor, assignmentId);
}

export async function takeBackTime(
  ctx: Ctx,
  actor: Actor,
  assignmentId: string,
  studentId: string,
): Promise<SubmissionRow[]> {
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "submission", "update", { tenantId });
  await assignmentOf(ctx, tenantId, assignmentId);
  await clearExtensionStatement(ctx.env.DB, tenantId, assignmentId, studentId).run();
  return submissionList(ctx, actor, assignmentId);
}

// -------------------------------------------------------------------- queue

export async function queue(ctx: Ctx, actor: Actor): Promise<QueueItem[]> {
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "submission", "read", { tenantId });
  return (await queueOf(ctx.env.DB, tenantId)).map((r) => ({
    assignmentId: r.assignment_id,
    assignmentTitle: r.title,
    courseId: r.course_id,
    courseName: r.course_name,
    studentId: r.student_id,
    studentName: r.student_name,
    submittedAt: r.submitted_at,
    isLate: r.is_late === 1,
  }));
}
