import type { AddNoteBody, NoteInfo } from "@lms/shared";
import { requireTeacherTenant, type Actor } from "../auth/actor";
import type { Ctx } from "../auth/service";
import { audit } from "../audit";
import { AppError } from "../lib/errors";
import { uuidv7 } from "../lib/id";
import { authorize } from "../policy";
import { insertNote, notesOf, setNoteVisibility } from "../repos/notes";
import { findStudent } from "../repos/students";

async function student(ctx: Ctx, tenantId: string, id: string) {
  const s = await findStudent(ctx.env.DB, tenantId, id);
  if (!s) throw new AppError("NOT_FOUND"); // also the answer for another teacher's student
  return s;
}

export async function listNotes(ctx: Ctx, actor: Actor, studentId: string): Promise<NoteInfo[]> {
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "comment", "read", { tenantId });
  await student(ctx, tenantId, studentId);
  return notesOf(ctx.env.DB, tenantId, studentId);
}

export async function addNote(
  ctx: Ctx,
  actor: Actor,
  studentId: string,
  body: AddNoteBody,
): Promise<NoteInfo[]> {
  const db = ctx.env.DB;
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "comment", "create", { tenantId });
  const s = await student(ctx, tenantId, studentId);
  if (s.status === "archived") {
    throw new AppError("CONFLICT", { message: "This student is archived. Restore them to add a note." });
  }
  const id = uuidv7();
  const res = await insertNote(db, {
    id,
    tenantId,
    studentId,
    authorId: actor.userId,
    visibility: body.visibility,
    body: body.body,
  }).run();
  if (!res.meta.changes) throw new AppError("CONFLICT");
  await audit(db, {
    action: "note.created",
    actorUserId: actor.userId,
    tenantId,
    targetType: "student",
    targetId: studentId,
    ipHash: ctx.ipHash,
    meta: { visibility: body.visibility }, // never the text of the note
  });
  return notesOf(db, tenantId, studentId);
}

export async function changeVisibility(
  ctx: Ctx,
  actor: Actor,
  studentId: string,
  noteId: string,
  visibility: "student_visible" | "private",
): Promise<NoteInfo[]> {
  const db = ctx.env.DB;
  const tenantId = requireTeacherTenant(actor);
  authorize(actor, "comment", "update", { tenantId });
  await student(ctx, tenantId, studentId);
  const res = await setNoteVisibility(db, tenantId, studentId, noteId, visibility).run();
  if (!res.meta.changes) throw new AppError("NOT_FOUND");
  await audit(db, {
    action: "note.visibility_changed",
    actorUserId: actor.userId,
    tenantId,
    targetType: "student",
    targetId: studentId,
    ipHash: ctx.ipHash,
    meta: { visibility },
  });
  return notesOf(db, tenantId, studentId);
}
