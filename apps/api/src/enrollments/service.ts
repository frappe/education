import type {
  EnrollBody,
  EnrollOutcome,
  EnrollResult,
  EnrollmentInfo,
  StudentCourseInfo,
  UpdateEnrollmentBody,
} from "@lms/shared";
import { requireTeacherTenant, type Actor } from "../auth/actor";
import type { Ctx } from "../auth/service";
import { audit } from "../audit";
import { AppError } from "../lib/errors";
import { uuidv7 } from "../lib/id";
import { authorize } from "../policy";
import { findCourse } from "../repos/courses";
import {
  coursesOfStudent,
  enrollStatement,
  findEnrollmentStatus,
  roster,
  statusesAmong,
  studentsAmong,
  updateEnrollmentStatement,
} from "../repos/enrollments";
import { findStudent } from "../repos/students";

async function loadCourse(ctx: Ctx, tenantId: string, courseId: string) {
  const course = await findCourse(ctx.env.DB, tenantId, courseId);
  if (!course) throw new AppError("NOT_FOUND"); // also the answer for another teacher's course
  return course;
}

export async function courseRoster(ctx: Ctx, actor: Actor, courseId: string): Promise<EnrollmentInfo[]> {
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "enrollment", "read", { tenantId });
  await loadCourse(ctx, tenantId, courseId);
  return roster(ctx.env.DB, tenantId, courseId);
}

export async function studentCourses(
  ctx: Ctx,
  actor: Actor,
  studentId: string,
): Promise<StudentCourseInfo[]> {
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "enrollment", "read", { tenantId });
  if (!(await findStudent(ctx.env.DB, tenantId, studentId))) throw new AppError("NOT_FOUND");
  return coursesOfStudent(ctx.env.DB, tenantId, studentId);
}

/**
 * Adds several students to a course. The answer says what happened to each one, so the screen
 * can say "3 added, 1 already in the course, 1 could not join because the course is full".
 */
export async function enroll(
  ctx: Ctx,
  actor: Actor,
  courseId: string,
  body: EnrollBody,
): Promise<EnrollResult> {
  const db = ctx.env.DB;
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "enrollment", "create", { tenantId });
  const course = await loadCourse(ctx, tenantId, courseId);
  if (course.status === "archived") {
    throw new AppError("CONFLICT", {
      message: "This course is archived. Restore it before adding students.",
    });
  }

  const ids = [...new Set(body.studentIds)];
  const [known, existing] = await Promise.all([
    studentsAmong(db, tenantId, ids),
    statusesAmong(db, tenantId, courseId, ids),
  ]);

  const outcomes = new Map<string, EnrollOutcome["result"]>();
  const candidates: string[] = [];
  for (const id of ids) {
    const student = known.get(id);
    if (!student || student.archived)
      outcomes.set(id, "not_found"); // another teacher's student looks the same as a missing one
    else if (existing.get(id) === "active") outcomes.set(id, "already_enrolled");
    else candidates.push(id);
  }

  if (candidates.length > 0) {
    const results = await db.batch(
      candidates.map((studentId) =>
        enrollStatement(db, { id: uuidv7(), tenantId, courseId, studentId, customPrice: body.customPrice }),
      ),
    );
    for (const [i, studentId] of candidates.entries()) {
      if (results[i]?.meta.changes) {
        outcomes.set(studentId, "enrolled");
        continue;
      }
      // No change: no free seat, or someone else added this student a moment ago.
      const now = await findEnrollmentStatus(db, tenantId, courseId, studentId);
      outcomes.set(studentId, now?.status === "active" ? "already_enrolled" : "full");
    }
  }

  const results = ids.map((studentId) => ({ studentId, result: outcomes.get(studentId)! }));
  const enrolled = results.filter((r) => r.result === "enrolled").length;
  if (enrolled > 0) {
    await audit(db, {
      action: "enrollment.added",
      actorUserId: actor.userId,
      tenantId,
      targetType: "course",
      targetId: courseId,
      ipHash: ctx.ipHash,
      meta: { count: enrolled },
    });
  }
  return { results, enrolled };
}

export async function updateEnrollment(
  ctx: Ctx,
  actor: Actor,
  courseId: string,
  studentId: string,
  body: UpdateEnrollmentBody,
): Promise<EnrollmentInfo[]> {
  const db = ctx.env.DB;
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "enrollment", "update", { tenantId });
  const course = await loadCourse(ctx, tenantId, courseId);
  if (course.status === "archived") {
    throw new AppError("CONFLICT", {
      message: "This course is archived. Restore it before changing students.",
    });
  }
  const current = await findEnrollmentStatus(db, tenantId, courseId, studentId);
  if (!current) throw new AppError("NOT_FOUND");

  const res = await updateEnrollmentStatement(db, { tenantId, courseId, studentId, ...body }).run();
  if (!res.meta.changes) throw new AppError("COURSE_FULL"); // the only way this can fail once the row exists

  await audit(db, {
    action: `enrollment.${body.status}`,
    actorUserId: actor.userId,
    tenantId,
    targetType: "student",
    targetId: studentId,
    ipHash: ctx.ipHash,
    meta: { courseId },
  });
  return roster(db, tenantId, courseId);
}
