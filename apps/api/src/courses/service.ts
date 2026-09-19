import type { CourseInfo, CreateCourseBody, UpdateCourseBody } from "@lms/shared";
import { requireTeacherTenant, type Actor } from "../auth/actor";
import type { Ctx } from "../auth/service";
import { audit } from "../audit";
import { AppError } from "../lib/errors";
import { uuidv7 } from "../lib/id";
import { authorize } from "../policy";
import {
  archiveCourse,
  findCourse,
  insertCourse,
  listCourses,
  restoreCourse,
  toCourseInfo,
  updateCourse,
} from "../repos/courses";

async function load(ctx: Ctx, tenantId: string, id: string) {
  const row = await findCourse(ctx.env.DB, tenantId, id);
  if (!row) throw new AppError("NOT_FOUND"); // also the answer for another teacher's course
  return row;
}

export async function createCourse(ctx: Ctx, actor: Actor, body: CreateCourseBody): Promise<CourseInfo> {
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "course", "create", { tenantId });
  const id = uuidv7();
  await insertCourse(ctx.env.DB, { id, tenantId, ...body }).run();
  await audit(ctx.env.DB, {
    action: "course.created",
    actorUserId: actor.userId,
    tenantId,
    targetType: "course",
    targetId: id,
    ipHash: ctx.ipHash,
  });
  return toCourseInfo(await load(ctx, tenantId, id));
}

export async function courseList(ctx: Ctx, actor: Actor, includeArchived: boolean): Promise<CourseInfo[]> {
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "course", "read", { tenantId });
  return (await listCourses(ctx.env.DB, tenantId, includeArchived)).map(toCourseInfo);
}

export async function courseGet(ctx: Ctx, actor: Actor, id: string): Promise<CourseInfo> {
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "course", "read", { tenantId });
  return toCourseInfo(await load(ctx, tenantId, id));
}

export async function courseUpdate(
  ctx: Ctx,
  actor: Actor,
  id: string,
  body: UpdateCourseBody,
): Promise<CourseInfo> {
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "course", "update", { tenantId });
  const current = await load(ctx, tenantId, id);
  if (current.status === "archived")
    throw new AppError("CONFLICT", { message: "This course is archived. Restore it first." });

  const { version, ...fields } = body;
  const res = await updateCourse(ctx.env.DB, tenantId, id, version, fields).run();
  // Nothing changed: the course was saved by someone else since this person opened it.
  if (!res.meta.changes) throw new AppError("CONFLICT");
  await audit(ctx.env.DB, {
    action: "course.updated",
    actorUserId: actor.userId,
    tenantId,
    targetType: "course",
    targetId: id,
    ipHash: ctx.ipHash,
  });
  return toCourseInfo(await load(ctx, tenantId, id));
}

export async function courseSetArchived(
  ctx: Ctx,
  actor: Actor,
  id: string,
  archived: boolean,
): Promise<CourseInfo> {
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "course", "update", { tenantId });
  await load(ctx, tenantId, id);
  const stmt = archived ? archiveCourse(ctx.env.DB, tenantId, id) : restoreCourse(ctx.env.DB, tenantId, id);
  const res = await stmt.run();
  if (!res.meta.changes) throw new AppError("CONFLICT");
  await audit(ctx.env.DB, {
    action: archived ? "course.archived" : "course.restored",
    actorUserId: actor.userId,
    tenantId,
    targetType: "course",
    targetId: id,
    ipHash: ctx.ipHash,
  });
  return toCourseInfo(await load(ctx, tenantId, id));
}
