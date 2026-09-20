import {
  LIMITS,
  type AttendanceBody,
  type AttendanceSheet,
  type CancelLessonBody,
  type CreateLessonsBody,
  type LessonInfo,
  type ScheduleLesson,
  type StudentAttendanceInfo,
  type UpdateLessonBody,
} from "@lms/shared";
import { requireTeacherTenant, type Actor } from "../auth/actor";
import type { Ctx } from "../auth/service";
import { audit } from "../audit";
import { AppError } from "../lib/errors";
import { uuidv7 } from "../lib/id";
import { nowIso } from "../lib/time";
import { addDays, daysBetween, localToUtc, utcToLocal } from "../lib/zone";
import { authorize } from "../policy";
import { everyWeeks, repeatDays } from "./repeat";
import {
  attendanceOfStudent,
  markLessonHeldStatement,
  saveMarksStatement,
  sheetRows,
} from "../repos/attendance";
import { findCourse } from "../repos/courses";
import {
  activeStudentNames,
  cancelLessonsStatement,
  deleteEmptySeriesStatement,
  endSeriesStatement,
  insertSeriesStatement,
  findLesson,
  insertLessonsStatement,
  lessonsBetween,
  lessonsByIds,
  lessonsOfCourse,
  restoreLessonStatement,
  seriesFrom,
  tenantTimezone,
  updateLessonsStatement,
  type LessonRow,
} from "../repos/lessons";
import { findStudent } from "../repos/students";

const toInfo = (r: LessonRow, zone: string): LessonInfo => {
  const start = utcToLocal(r.starts_at, zone);
  return {
    id: r.id,
    courseId: r.course_id,
    courseName: r.course_name,
    seriesId: r.series_id,
    title: r.title,
    date: start.date,
    startTime: start.time,
    endTime: utcToLocal(r.ends_at, zone).time,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    place: r.place,
    onlineUrl: r.online_url,
    status: r.status,
    version: r.version,
  };
};

const infos = (rows: LessonRow[], zone: string) => rows.map((r) => toInfo(r, zone));

async function load(ctx: Ctx, tenantId: string, id: string): Promise<LessonRow> {
  const row = await findLesson(ctx.env.DB, tenantId, id);
  if (!row) throw new AppError("NOT_FOUND"); // also the answer for another teacher's lesson
  return row;
}

const endsAt = (startsAt: string, minutes: number) =>
  new Date(new Date(startsAt).getTime() + minutes * 60_000).toISOString();

// ------------------------------------------------------------------ reading

export async function courseLessons(ctx: Ctx, actor: Actor, courseId: string): Promise<LessonInfo[]> {
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "lesson", "read", { tenantId });
  if (!(await findCourse(ctx.env.DB, tenantId, courseId))) throw new AppError("NOT_FOUND");
  return infos(
    await lessonsOfCourse(ctx.env.DB, tenantId, courseId),
    await tenantTimezone(ctx.env.DB, tenantId),
  );
}

/** The calendar: all lessons from day `from` up to and including day `to`, in the teacher's time zone. */
export async function calendar(ctx: Ctx, actor: Actor, from: string, to: string): Promise<ScheduleLesson[]> {
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "lesson", "read", { tenantId });
  const zone = await tenantTimezone(ctx.env.DB, tenantId);
  const rows = await lessonsBetween(
    ctx.env.DB,
    tenantId,
    localToUtc(from, "00:00", zone),
    localToUtc(addDays(to, 1), "00:00", zone),
  );
  const names = await activeStudentNames(ctx.env.DB, tenantId, [...new Set(rows.map((r) => r.course_id))]);
  return infos(rows, zone).map((l) => ({ ...l, students: names.get(l.courseId) ?? [] }));
}

export async function lessonGet(ctx: Ctx, actor: Actor, id: string): Promise<LessonInfo> {
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "lesson", "read", { tenantId });
  return toInfo(await load(ctx, tenantId, id), await tenantTimezone(ctx.env.DB, tenantId));
}

// ----------------------------------------------------------------- changing

export async function createLessons(
  ctx: Ctx,
  actor: Actor,
  courseId: string,
  body: CreateLessonsBody,
): Promise<LessonInfo[]> {
  const db = ctx.env.DB;
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "lesson", "create", { tenantId });
  const course = await findCourse(db, tenantId, courseId);
  if (!course) throw new AppError("NOT_FOUND");
  if (course.status === "archived") {
    throw new AppError("CONFLICT", { message: "This course is archived. Restore it first." });
  }
  const zone = await tenantTimezone(db, tenantId);

  // The days of the lessons, each at the same clock time. Each one is worked out from the local date.
  const every = everyWeeks(body.repeat);
  const days = repeatDays({
    date: body.date,
    every,
    until: body.repeatUntil,
    today: utcToLocal(nowIso(), zone).date,
  });
  if (days === null) {
    throw new AppError("VALIDATION_FAILED", {
      fields:
        body.repeatUntil !== null
          ? { repeatUntil: "That is too many lessons. Please choose an earlier end date." }
          : { date: "This date is too far back to repeat with no end date." },
    });
  }
  const lessons = days.map((day) => {
    const startsAt = localToUtc(day, body.startTime, zone);
    return { id: uuidv7(), startsAt, endsAt: endsAt(startsAt, body.durationMinutes) };
  });
  const openEnded = every > 0 && body.repeatUntil === null;
  const seriesId = every > 0 && lessons.length > 1 ? uuidv7() : null;
  if (openEnded && seriesId) await insertSeriesStatement(db, tenantId, courseId, seriesId, every).run();
  const res = await insertLessonsStatement(db, {
    tenantId,
    courseId,
    seriesId,
    title: body.title,
    place: body.place,
    onlineUrl: body.onlineUrl,
    lessons,
  }).run();
  if (res.meta.changes !== lessons.length) {
    if (seriesId) await deleteEmptySeriesStatement(db, tenantId, seriesId).run();
    throw new AppError("CONFLICT", {
      message:
        "A course can have at most 500 lessons, or the course was archived. Please check and try again.",
    });
  }
  await audit(db, {
    action: "lesson.created",
    actorUserId: actor.userId,
    tenantId,
    targetType: "course",
    targetId: courseId,
    ipHash: ctx.ipHash,
    meta: { count: lessons.length },
  });
  return infos(
    await lessonsByIds(
      db,
      tenantId,
      lessons.map((l) => l.id),
    ),
    zone,
  );
}

/** The lessons a change applies to: this one, or this one and the later ones of its series. */
async function targetsOf(ctx: Ctx, tenantId: string, lesson: LessonRow, scope: "this" | "following") {
  if (scope === "this" || !lesson.series_id) return [lesson];
  const later = await seriesFrom(ctx.env.DB, tenantId, lesson.series_id, lesson.starts_at);
  return later.length > 0 ? later : [lesson];
}

export async function lessonUpdate(
  ctx: Ctx,
  actor: Actor,
  id: string,
  body: UpdateLessonBody,
): Promise<LessonInfo[]> {
  const db = ctx.env.DB;
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "lesson", "update", { tenantId });
  const lesson = await load(ctx, tenantId, id);
  if (lesson.status !== "scheduled") {
    throw new AppError("CONFLICT", { message: "Only lessons that have not happened yet can be changed." });
  }
  if (lesson.version !== body.version) throw new AppError("CONFLICT");
  const zone = await tenantTimezone(db, tenantId);

  // The new date of this lesson decides how far the later ones move, so a whole series can shift.
  const shift = daysBetween(utcToLocal(lesson.starts_at, zone).date, body.date);
  const targets = await targetsOf(ctx, tenantId, lesson, body.scope);
  const moved = targets.map((t) => {
    const startsAt = localToUtc(addDays(utcToLocal(t.starts_at, zone).date, shift), body.startTime, zone);
    return { id: t.id, startsAt, endsAt: endsAt(startsAt, body.durationMinutes) };
  });
  const res = await updateLessonsStatement(db, {
    tenantId,
    targetId: lesson.id,
    version: body.version,
    title: body.title,
    place: body.place,
    onlineUrl: body.onlineUrl,
    lessons: moved,
  }).run();
  if (!res.meta.changes) throw new AppError("CONFLICT"); // saved by someone else, or no longer scheduled
  await audit(db, {
    action: "lesson.updated",
    actorUserId: actor.userId,
    tenantId,
    targetType: "lesson",
    targetId: id,
    ipHash: ctx.ipHash,
    meta: { count: res.meta.changes, scope: body.scope },
  });
  return infos(
    await lessonsByIds(
      db,
      tenantId,
      moved.map((m) => m.id),
    ),
    zone,
  );
}

export async function lessonCancel(
  ctx: Ctx,
  actor: Actor,
  id: string,
  body: CancelLessonBody,
): Promise<LessonInfo[]> {
  const db = ctx.env.DB;
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "lesson", "update", { tenantId });
  const lesson = await load(ctx, tenantId, id);
  if (lesson.status !== "scheduled") {
    throw new AppError("CONFLICT", { message: "Only lessons that have not happened yet can be cancelled." });
  }
  const targets = await targetsOf(ctx, tenantId, lesson, body.scope);
  const following = body.scope === "following" && lesson.series_id !== null;
  const res = await cancelLessonsStatement(db, {
    tenantId,
    id,
    seriesId: lesson.series_id,
    startsAt: lesson.starts_at,
    following,
  }).run();
  if (!res.meta.changes) throw new AppError("CONFLICT");
  // "This and the next lessons" also stops a repeat that has no end date from making more.
  if (following && lesson.series_id) await endSeriesStatement(db, tenantId, lesson.series_id).run();
  await audit(db, {
    action: "lesson.cancelled",
    actorUserId: actor.userId,
    tenantId,
    targetType: "lesson",
    targetId: id,
    ipHash: ctx.ipHash,
    meta: { count: res.meta.changes, scope: body.scope },
  });
  const zone = await tenantTimezone(db, tenantId);
  return infos(
    await lessonsByIds(
      db,
      tenantId,
      targets.map((t) => t.id),
    ),
    zone,
  );
}

export async function lessonRestore(ctx: Ctx, actor: Actor, id: string): Promise<LessonInfo> {
  const db = ctx.env.DB;
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "lesson", "update", { tenantId });
  const lesson = await load(ctx, tenantId, id);
  if (lesson.status !== "cancelled")
    throw new AppError("CONFLICT", { message: "This lesson is not cancelled." });
  const res = await restoreLessonStatement(db, tenantId, id).run();
  if (!res.meta.changes) throw new AppError("CONFLICT");
  await audit(db, {
    action: "lesson.restored",
    actorUserId: actor.userId,
    tenantId,
    targetType: "lesson",
    targetId: id,
    ipHash: ctx.ipHash,
  });
  return toInfo(await load(ctx, tenantId, id), await tenantTimezone(db, tenantId));
}

// --------------------------------------------------------------- attendance

async function sheetOf(
  ctx: Ctx,
  tenantId: string,
  lesson: LessonRow,
  zone: string,
): Promise<AttendanceSheet> {
  const rows = await sheetRows(ctx.env.DB, tenantId, lesson.id);
  return {
    lesson: toInfo(lesson, zone),
    students: rows.map((r) => ({
      studentId: r.student_id,
      name: r.name,
      // Nothing saved yet: everyone starts as "attended", except a student who joined after the lesson.
      status: r.saved_status ?? (r.joined_after === 1 ? "absent" : "attended"),
      saved: r.saved_status !== null,
      inCourse: r.in_course === 1,
      joinedAfter: r.joined_after === 1,
    })),
  };
}

export async function attendanceSheet(ctx: Ctx, actor: Actor, lessonId: string): Promise<AttendanceSheet> {
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "attendance", "read", { tenantId });
  const lesson = await load(ctx, tenantId, lessonId);
  return sheetOf(ctx, tenantId, lesson, await tenantTimezone(ctx.env.DB, tenantId));
}

/**
 * Saves the marks for a lesson in one go. Taking attendance also marks the lesson as held.
 * The marks are only about students on the sheet, so a student of another lesson or teacher
 * cannot be marked here.
 */
export async function saveAttendance(
  ctx: Ctx,
  actor: Actor,
  lessonId: string,
  body: AttendanceBody,
): Promise<AttendanceSheet> {
  const db = ctx.env.DB;
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "attendance", "update", { tenantId });
  const lesson = await load(ctx, tenantId, lessonId);
  if (lesson.status === "cancelled") {
    throw new AppError("CONFLICT", { message: "This lesson was cancelled, so there is no attendance." });
  }
  if (lesson.starts_at > nowIso()) {
    throw new AppError("CONFLICT", { message: "This lesson has not started yet." });
  }
  const zone = await tenantTimezone(db, tenantId);

  const onSheet = new Set((await sheetRows(db, tenantId, lessonId)).map((r) => r.student_id));
  const seen = new Set<string>();
  for (const r of body.records) {
    if (!onSheet.has(r.studentId) || seen.has(r.studentId)) {
      throw new AppError("VALIDATION_FAILED", {
        fields: { records: "One of the students is not part of this lesson, or is in the list twice." },
      });
    }
    seen.add(r.studentId);
  }

  const [saved] = await db.batch([
    saveMarksStatement(db, {
      tenantId,
      lessonId,
      userId: actor.userId,
      marks: body.records.map((r) => ({ id: uuidv7(), studentId: r.studentId, status: r.status })),
    }),
    markLessonHeldStatement(db, tenantId, lessonId),
  ]);
  await audit(db, {
    action: "attendance.saved",
    actorUserId: actor.userId,
    tenantId,
    targetType: "lesson",
    targetId: lessonId,
    ipHash: ctx.ipHash,
    meta: {
      absent: body.records.filter((r) => r.status === "absent").length,
      attended: body.records.filter((r) => r.status === "attended").length,
      changed: saved?.meta.changes ?? 0,
    },
  });
  return sheetOf(ctx, tenantId, await load(ctx, tenantId, lessonId), zone);
}

/** How many marks one page of a student's attendance shows. */
export const ATTENDANCE_PAGE_SIZE = LIMITS.pageSize;

export async function studentAttendance(
  ctx: Ctx,
  actor: Actor,
  studentId: string,
  page = 1,
): Promise<StudentAttendanceInfo> {
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "attendance", "read", { tenantId });
  if (!(await findStudent(ctx.env.DB, tenantId, studentId))) throw new AppError("NOT_FOUND");
  const zone = await tenantTimezone(ctx.env.DB, tenantId);
  const at = Math.max(1, page);
  const r = await attendanceOfStudent(
    ctx.env.DB,
    tenantId,
    studentId,
    ATTENDANCE_PAGE_SIZE,
    (at - 1) * ATTENDANCE_PAGE_SIZE,
  );
  return {
    attended: r.attended,
    absent: r.absent,
    total: r.attended + r.absent, // a mark is either "attended" or "absent"
    page: at,
    pageSize: ATTENDANCE_PAGE_SIZE,
    recent: r.recent.map((x) => {
      const start = utcToLocal(x.starts_at, zone);
      return {
        lessonId: x.lesson_id,
        courseName: x.course_name,
        title: x.title,
        date: start.date,
        startTime: start.time,
        status: x.status,
      };
    }),
  };
}
