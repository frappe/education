import type {
  AssignmentInfo,
  CreateAssignmentBody,
  MaterialBody,
  MaterialInfo,
  QuestionInfo,
  UpdateAssignmentBody,
} from "@lms/shared";
import { requireTeacherTenant, type Actor } from "../auth/actor";
import type { Ctx } from "../auth/service";
import { audit } from "../audit";
import { AppError } from "../lib/errors";
import { normalizeAnswer, summaryKind, totalPoints } from "../lib/grade";
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
  parseList,
  parsePoints,
  publishStatement,
  questionsOf,
  setQuestionsStatement,
  targetIds,
  updateAssignmentStatement,
  updateMaterialStatement,
  type AssignmentRow,
} from "../repos/assignments";
import { findCourse } from "../repos/courses";
import { handedInAnswers, regradeStatement } from "../repos/grading";
import { tenantTimezone } from "../repos/lessons";

export function toAssignmentInfo(r: AssignmentRow, zone: string, studentIds: string[] = []): AssignmentInfo {
  const due = r.due_at ? utcToLocal(r.due_at, zone) : null;
  return {
    id: r.id,
    courseId: r.course_id,
    courseName: r.course_name,
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

/** Gives every new question an id, and keeps the ids of the ones that were already there. */
export function withIds(input: CreateAssignmentBody["questions"]): QuestionInfo[] {
  return input.map((q) => ({
    id: q.id ?? `q_${crypto.randomUUID().slice(0, 8)}`,
    kind: q.kind,
    text: q.text,
    points: q.points,
    options: q.kind === "choice" ? q.options : [],
    correct: q.kind === "choice" ? q.correct : null,
    accepted: q.kind === "short" ? q.accepted.filter((x) => x.trim() !== "") : [],
  }));
}

/** The same questions in the same order, apart from the words of the question. */
const sameExceptWording = (a: QuestionInfo[], b: QuestionInfo[]) =>
  a.length === b.length &&
  a.every((q, i) => JSON.stringify({ ...q, text: "" }) === JSON.stringify({ ...b[i]!, text: "" }));

const writeOf = (body: CreateAssignmentBody, questions: QuestionInfo[], zone: string) => ({
  type: summaryKind(questions),
  title: body.title,
  instructions: body.instructions,
  questions,
  links: body.links,
  dueAt: body.dueDate && body.dueTime ? localToUtc(body.dueDate, body.dueTime, zone) : null,
  allowLate: body.allowLate,
  maxScore: totalPoints(questions),
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
    insertAssignmentStatement(db, {
      id,
      tenantId,
      courseId,
      ...writeOf(body, withIds(body.questions), zone),
    }),
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
    meta: { questions: body.questions.length },
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
  const questions = withIds(body.questions);
  // Once students started answering, only the wording of a question may change. The kind, the points, the
  // answers and the correct answer stay, because the answers and scores that exist depend on them.
  if (!sameExceptWording(questionsOf(current), questions) && (await hasSubmissions(db, tenantId, id))) {
    throw new AppError("CONFLICT", {
      message: "Students already started, so only the wording of the questions can change.",
    });
  }
  if (body.targetMode === "selected") await checkChosen(ctx, tenantId, current.course_id, body.studentIds);

  const zone = await tenantTimezone(db, tenantId);
  const next = body.version + 1;
  const [changed] = await db.batch([
    updateAssignmentStatement(db, { tenantId, id, version: body.version, ...writeOf(body, questions, zone) }),
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

/**
 * Accepts one more answer for a short answer question, also after students handed in. Every handed in answer that
 * matches it (and was scored 0) gets the points of the question, and its total goes up by the same. Answers that
 * were already right, or that do not match, are not touched. Asking again with an answer that is already accepted
 * only scores the answers again, so a save that was cut short can be finished.
 */
export async function acceptAnswer(
  ctx: Ctx,
  actor: Actor,
  id: string,
  questionId: string,
  answer: string,
): Promise<{ assignment: AssignmentInfo; regraded: number }> {
  const db = ctx.env.DB;
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "assignment", "update", { tenantId });
  const current = await load(ctx, tenantId, id);
  if (current.status === "draft") {
    throw new AppError("CONFLICT", { message: "Change the answers in the form. Nobody has answered yet." });
  }
  const questions = questionsOf(current);
  const q = questions.find((x) => x.id === questionId);
  if (!q) throw new AppError("NOT_FOUND");
  if (q.kind !== "short" || q.accepted.length === 0) {
    throw new AppError("CONFLICT", {
      message: "Only a short answer question that the system scores can do this.",
    });
  }
  const wanted = normalizeAnswer(answer);
  const already = q.accepted.some((a) => normalizeAnswer(a) === wanted);
  const accepted = already ? q.accepted : [...q.accepted, answer];
  if (accepted.length > 10) {
    throw new AppError("VALIDATION_FAILED", {
      fields: { answer: "This question has too many accepted answers." },
    });
  }
  const next = questions.map((x) => (x.id === questionId ? { ...x, accepted } : x));

  // Which answers become right now.
  const rows = (await handedInAnswers(db, tenantId, id)).flatMap((r) => {
    const mine = parseList<{ questionId: string; text: string }>(r.responses).find(
      (a) => a.questionId === questionId,
    );
    const before = parsePoints(r.question_points)[questionId] ?? 0;
    const right =
      mine !== undefined && accepted.some((a) => normalizeAnswer(a) === normalizeAnswer(mine.text));
    return right && before < q.points ? [{ id: r.id, version: r.version, delta: q.points - before }] : [];
  });

  const expectVersion = already ? current.version : current.version + 1;
  const statements = [
    ...(already
      ? []
      : [setQuestionsStatement(db, { tenantId, id, version: current.version, questions: next })]),
    ...(rows.length > 0
      ? [
          regradeStatement(db, {
            tenantId,
            assignmentId: id,
            expectVersion,
            questionId,
            points: q.points,
            rows,
            graderId: actor.userId,
          }),
        ]
      : []),
  ];
  let regraded = 0;
  if (statements.length > 0) {
    const results = await db.batch(statements);
    if (!already && !results[0]?.meta.changes) throw new AppError("CONFLICT");
    if (rows.length > 0) {
      // (`meta.changes` also counts the history lines the database writes, so the answers are read again.)
      const after = new Map((await handedInAnswers(db, tenantId, id)).map((r) => [r.id, r]));
      regraded = rows.filter(
        (r) => (parsePoints(after.get(r.id)?.question_points ?? null)[questionId] ?? 0) >= q.points,
      ).length;
    }
  }
  await audit(db, {
    action: "assignment.answer_accepted",
    actorUserId: actor.userId,
    tenantId,
    targetType: "assignment",
    targetId: id,
    ipHash: ctx.ipHash,
    meta: { regraded },
  });
  return { assignment: await present(ctx, tenantId, id), regraded };
}
