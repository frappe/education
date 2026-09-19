import {
  isAutoQuestion,
  type AnswerBody,
  type AnswerItem,
  type MyCourseDetail,
  type MyCourseInfo,
  type MyWorkDetail,
  type MyWorkItem,
  type QuestionInfo,
  type QuestionResult,
  type SubmissionStatus,
} from "@lms/shared";
import type { Actor } from "../auth/actor";
import type { Ctx } from "../auth/service";
import { audit } from "../audit";
import { correctAnswerText, gradeAuto } from "../lib/grade";
import { AppError } from "../lib/errors";
import { uuidv7 } from "../lib/id";
import { nowIso } from "../lib/time";
import { utcToLocal } from "../lib/zone";
import { authorize } from "../policy";
import { linksOf, parseList, parseNotes, parsePoints, questionsOf } from "../repos/assignments";
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
    questionCount: questionsOf(r).length,
    assignmentStatus: r.assignment_status,
    dueAt: due,
    dueDate: local?.date ?? null,
    dueTime: local?.time ?? null,
    allowLate: r.allow_late === 1,
    maxScore: r.max_score,
    status: (r.sub_status ?? "not_started") as SubmissionStatus,
    isLate: r.is_late === 1,
    submittedAt: r.submitted_at,
    // The total stays hidden until the work is scored (returned).
    score: r.sub_status === "returned" ? r.score : null,
  };
}

/** The saved answers, one entry for each question, in the order of the questions. */
function answersOf(r: Pick<MyWorkRow, "responses" | "questions">): AnswerItem[] {
  const saved = new Map(parseList<AnswerItem>(r.responses ?? "[]").map((a) => [a.questionId, a]));
  return questionsOf(r).map(
    (q) => saved.get(q.id) ?? { questionId: q.id, choice: null, text: "", link: null },
  );
}

/** How it went, for a student who handed in. The teacher's points only show once the work was returned. */
function resultsOf(r: MyWorkRow, questions: QuestionInfo[], answers: AnswerItem[]): MyWorkDetail["results"] {
  const auto = gradeAuto(questions, answers);
  const saved = parsePoints(r.question_points);
  const returned = r.sub_status === "returned";
  // The teacher's comments show with the returned work, like the points do.
  const notes = returned ? parseNotes(r.question_notes) : {};
  const perQuestion: QuestionResult[] = questions.map((q) => {
    if (isAutoQuestion(q)) {
      return {
        questionId: q.id,
        correct: auto.correct[q.id] ?? false,
        awarded: saved[q.id] ?? auto.points[q.id] ?? 0,
        correctAnswer: correctAnswerText(q),
        note: notes[q.id] ?? "",
      };
    }
    return {
      questionId: q.id,
      correct: null,
      awarded: returned ? (saved[q.id] ?? null) : null,
      correctAnswer: null,
      note: notes[q.id] ?? "",
    };
  });
  return {
    perQuestion,
    autoAwarded: auto.autoAwarded,
    autoMax: auto.autoMax,
    waitingForTeacher: returned ? 0 : auto.manualIds.length,
  };
}

function toDetail(r: MyWorkRow, now: string): MyWorkDetail {
  const item = toItem(r);
  const questions = questionsOf(r);
  const answers = answersOf(r);
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
    // The correct answers are never sent while the student can still change their work.
    questions: questions.map((q) => ({
      id: q.id,
      kind: q.kind,
      text: q.text,
      points: q.points,
      options: q.options,
    })),
    links: linksOf(r),
    answers,
    results: handedIn ? resultsOf(r, questions, answers) : null,
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
 * Checks what the student wrote against each question and keeps only the parts that belong to its kind.
 * Returns one entry for each question, in order. A draft may be incomplete; handing in needs every question answered.
 */
function shapeAnswers(questions: QuestionInfo[], body: AnswerBody, handIn: boolean): AnswerItem[] {
  const fail = (message: string): never => {
    throw new AppError("VALIDATION_FAILED", { fields: { answers: message } });
  };
  const byId = new Map<string, AnswerItem>();
  for (const a of body.answers) {
    if (byId.has(a.questionId) || !questions.some((q) => q.id === a.questionId)) {
      fail("One of the answers is not for a question of this homework, or is there twice.");
    }
    byId.set(a.questionId, a);
  }
  return questions.map((q, i) => {
    const a = byId.get(q.id) ?? { questionId: q.id, choice: null, text: "", link: null };
    const n = `Question ${i + 1}: `;
    const text = a.text.trim();
    if (q.kind === "choice") {
      if (a.choice !== null && a.choice >= q.options.length) fail(`${n}this answer is not on the list.`);
      if (handIn && a.choice === null) fail(`${n}please choose an answer.`);
      return { questionId: q.id, choice: a.choice, text: "", link: null };
    }
    if (q.kind === "short") {
      if (text.length > 500) fail(`${n}this answer is too long.`);
      if (handIn && text === "") fail(`${n}please write your answer.`);
      return { questionId: q.id, choice: null, text, link: null };
    }
    if (q.kind === "written") {
      if (handIn && text === "") fail(`${n}please write your answer.`);
      return { questionId: q.id, choice: null, text, link: null };
    }
    if (text.length > 2000) fail(`${n}this note is too long.`);
    if (handIn && !a.link) fail(`${n}please add the link to your video.`);
    return { questionId: q.id, choice: null, text, link: a.link };
  });
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
  const questions = questionsOf(row);
  const answers = shapeAnswers(questions, body, handIn);

  // The system scores the questions that have a correct answer at the moment the work is handed in.
  // When there is nothing left for the teacher, the student gets the result at once.
  const auto = handIn ? gradeAuto(questions, answers) : null;
  const allAuto = auto !== null && auto.manualIds.length === 0;

  const res = await saveAnswerStatement(db, {
    id: uuidv7(),
    userId: actor.userId,
    tenantId: row.tenant_id,
    studentId: row.student_id,
    assignmentId: row.id,
    status: !handIn ? "drafted" : allAuto ? "returned" : "submitted",
    responses: answers,
    points: auto?.points ?? {},
    score: allAuto ? auto.autoAwarded : null,
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
      meta: { scored_by_system: allAuto },
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
