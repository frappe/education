import type {
  AnswerBody,
  MyCourseDetail,
  MyCourseInfo,
  MyWorkDetail,
  MyWorkItem,
  SubmissionStatus,
} from "@lms/shared";
import type { Actor } from "../auth/actor";
import type { Ctx } from "../auth/service";
import { audit } from "../audit";
import { AppError } from "../lib/errors";
import { uuidv7 } from "../lib/id";
import { nowIso } from "../lib/time";
import { utcToLocal } from "../lib/zone";
import { authorize } from "../policy";
import { linksOf, parseList, questionsOf } from "../repos/assignments";
import { lessonsOfCourse } from "../repos/lessons";
import {
  findMyCourse,
  findMyWork,
  myCourses,
  myWork,
  publishedMaterials,
  saveAnswerStatement,
  type MyCourseRow,
  type MyWorkRow,
} from "../repos/mywork";

/** The person is always found from the session. Every id in the address only picks among their own things. */
const own = (actor: Actor, tenantId: string) => ({
  tenantId,
  ownerUserId: actor.userId,
  courseStudentUserIds: [actor.userId],
});

/** The due time that counts: the later of the normal one and more time the teacher gave this student. */
const effectiveDue = (row: Pick<MyWorkRow, "due_at" | "until_at">): string | null =>
  row.until_at && (!row.due_at || row.until_at > row.due_at) ? row.until_at : row.due_at;

function toItem(r: MyWorkRow): MyWorkItem {
  const due = effectiveDue(r);
  const local = due ? utcToLocal(due, r.timezone) : null;
  return {
    id: r.id,
    courseId: r.course_id,
    courseName: r.course_name,
    title: r.title,
    type: r.type,
    assignmentStatus: r.assignment_status,
    dueAt: due,
    dueDate: local?.date ?? null,
    dueTime: local?.time ?? null,
    allowLate: r.allow_late === 1,
    maxScore: r.max_score,
    status: (r.sub_status ?? "not_started") as SubmissionStatus,
    isLate: r.is_late === 1,
    submittedAt: r.submitted_at,
    // A score stays hidden until the teacher returns the work.
    score: r.sub_status === "returned" ? r.score : null,
  };
}

function toDetail(r: MyWorkRow, now: string): MyWorkDetail {
  const item = toItem(r);
  const handedIn = r.sub_status === "submitted" || r.sub_status === "graded" || r.sub_status === "returned";
  const timeUp = item.dueAt !== null && item.dueAt < now && !item.allowLate;
  const blocked = handedIn
    ? "handed_in"
    : r.assignment_status === "closed"
      ? "closed"
      : timeUp
        ? "deadline"
        : null;
  return {
    ...item,
    instructions: r.instructions,
    questions: questionsOf(r),
    links: linksOf(r),
    answer: {
      textAnswer: r.text_answer ?? "",
      linkUrl: r.link_url,
      answers: parseList<number>(r.answers ?? "[]"),
    },
    // The teacher's words show with a returned score, or as the reason for a new try. Never before.
    feedback: r.sub_status === "returned" || r.sub_status === "revision_requested" ? (r.feedback ?? "") : "",
    canEdit: blocked === null,
    blocked,
  };
}

async function loadWork(ctx: Ctx, actor: Actor, id: string): Promise<MyWorkRow> {
  const row = await findMyWork(ctx.env.DB, actor.userId, id);
  if (!row) throw new AppError("NOT_FOUND"); // the same answer for work of someone else, or that does not exist
  authorize(actor, "assignment", "read", own(actor, row.tenant_id));
  return row;
}

export async function workList(ctx: Ctx, actor: Actor): Promise<MyWorkItem[]> {
  return (await myWork(ctx.env.DB, actor.userId)).map(toItem);
}

export async function workGet(ctx: Ctx, actor: Actor, id: string): Promise<MyWorkDetail> {
  return toDetail(await loadWork(ctx, actor, id), nowIso());
}

/**
 * Checks what the student wrote against the kind of work, and keeps only the parts that belong to it.
 * A draft may be incomplete. Handing in needs a real answer.
 */
function shapeAnswer(row: MyWorkRow, body: AnswerBody, handIn: boolean): AnswerBody {
  const questions = questionsOf(row);
  const fail = (field: string, message: string): never => {
    throw new AppError("VALIDATION_FAILED", { fields: { [field]: message } });
  };
  if (row.type === "multiple_choice") {
    if (body.answers.length !== questions.length) fail("answers", "Please answer each question.");
    body.answers.forEach((a, i) => {
      if (a < -1 || a >= questions[i]!.options.length)
        fail("answers", "One of the answers is not on the list.");
      if (handIn && a === -1) fail("answers", "Please answer every question before you hand in.");
    });
    return { textAnswer: "", linkUrl: null, answers: body.answers };
  }
  if (row.type === "speaking") {
    if (body.textAnswer.length > 2000) fail("textAnswer", "This note is too long.");
    if (handIn && !body.linkUrl) fail("linkUrl", "Please add the link to your video.");
    return { textAnswer: body.textAnswer.trim(), linkUrl: body.linkUrl, answers: [] };
  }
  if (handIn && body.textAnswer.trim() === "" && !body.linkUrl)
    fail("textAnswer", "Please write your answer.");
  return { textAnswer: body.textAnswer.trim(), linkUrl: body.linkUrl, answers: [] };
}

async function save(
  ctx: Ctx,
  actor: Actor,
  id: string,
  body: AnswerBody,
  handIn: boolean,
): Promise<MyWorkDetail> {
  const db = ctx.env.DB;
  const row = await loadWork(ctx, actor, id);
  authorize(actor, "submission", row.sub_status ? "update" : "create", own(actor, row.tenant_id));
  const shaped = shapeAnswer(row, body, handIn);

  const res = await saveAnswerStatement(db, {
    id: uuidv7(),
    userId: actor.userId,
    tenantId: row.tenant_id,
    studentId: row.student_id,
    assignmentId: row.id,
    handIn,
    text: shaped.textAnswer,
    link: shaped.linkUrl,
    answers: shaped.answers,
  }).run();

  if (!res.meta.changes) {
    // Say why, from what is true now.
    const now = toDetail((await findMyWork(db, actor.userId, id)) ?? row, nowIso());
    if (now.blocked === "deadline") throw new AppError("DEADLINE_PASSED");
    if (now.blocked === "closed") {
      throw new AppError("CONFLICT", { message: "The teacher closed this work, so you cannot change it." });
    }
    throw new AppError("CONFLICT", { message: "You already handed this in, so you cannot change it." });
  }
  if (handIn) {
    await audit(db, {
      action: "submission.handed_in",
      actorUserId: actor.userId,
      tenantId: row.tenant_id,
      targetType: "assignment",
      targetId: id,
      ipHash: ctx.ipHash,
    });
  }
  return toDetail((await findMyWork(db, actor.userId, id))!, nowIso());
}

export const saveDraft = (ctx: Ctx, actor: Actor, id: string, body: AnswerBody) =>
  save(ctx, actor, id, body, false);
export const handIn = (ctx: Ctx, actor: Actor, id: string, body: AnswerBody) =>
  save(ctx, actor, id, body, true);

// ------------------------------------------------------------------ courses

const nextLessonOf = (lessons: { starts_at: string; ends_at: string; status: string; title: string }[]) =>
  lessons.find((l) => l.status !== "cancelled" && l.ends_at >= nowIso());

async function courseInfo(ctx: Ctx, c: MyCourseRow, openWork: number): Promise<MyCourseInfo> {
  const lessons = await lessonsOfCourse(ctx.env.DB, c.tenant_id, c.id);
  const next = nextLessonOf(lessons);
  const start = next ? utcToLocal(next.starts_at, c.timezone) : null;
  return {
    id: c.id,
    name: c.name,
    description: c.description,
    teacherName: c.teacher_name ?? "",
    nextLesson:
      next && start
        ? {
            date: start.date,
            startTime: start.time,
            endTime: utcToLocal(next.ends_at, c.timezone).time,
            title: next.title,
          }
        : null,
    openWork,
  };
}

/** Work the student can still do: not handed in yet, and open. */
const isOpen = (w: MyWorkItem) =>
  w.assignmentStatus === "published" &&
  (w.status === "not_started" || w.status === "drafted" || w.status === "revision_requested");

export async function courseList(ctx: Ctx, actor: Actor): Promise<MyCourseInfo[]> {
  const work = (await myWork(ctx.env.DB, actor.userId)).map(toItem);
  const rows = await myCourses(ctx.env.DB, actor.userId);
  return Promise.all(
    rows.map((c) => courseInfo(ctx, c, work.filter((w) => w.courseId === c.id && isOpen(w)).length)),
  );
}

export async function courseGet(ctx: Ctx, actor: Actor, courseId: string): Promise<MyCourseDetail> {
  const row = await findMyCourse(ctx.env.DB, actor.userId, courseId);
  if (!row) throw new AppError("NOT_FOUND");
  authorize(actor, "course", "read", own(actor, row.tenant_id));
  const work = (await myWork(ctx.env.DB, actor.userId)).map(toItem).filter((w) => w.courseId === courseId);
  const lessons = await lessonsOfCourse(ctx.env.DB, row.tenant_id, courseId);
  const now = nowIso();
  // The coming lessons, and the last few that took place.
  const shown = [
    ...lessons.filter((l) => l.ends_at >= now),
    ...lessons.filter((l) => l.ends_at < now).slice(-5),
  ];
  return {
    course: await courseInfo(ctx, row, work.filter(isOpen).length),
    materials: await publishedMaterials(ctx.env.DB, row.tenant_id, courseId),
    lessons: shown
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
      .map((l) => {
        const start = utcToLocal(l.starts_at, row.timezone);
        return {
          id: l.id,
          title: l.title,
          date: start.date,
          startTime: start.time,
          endTime: utcToLocal(l.ends_at, row.timezone).time,
          place: l.place,
          onlineUrl: l.online_url,
          status: l.status,
        };
      }),
    work,
  };
}
