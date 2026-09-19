import type { NoteInfo } from "@lms/shared";
import { nowIso } from "../lib/time";

interface NoteRow {
  id: string;
  body: string;
  visibility: "student_visible" | "private";
  author_name: string;
  created_at: string;
}

/** Newest first. Every note query takes the tenant id, so another teacher's note is never returned. */
export async function notesOf(db: D1Database, tenantId: string, studentId: string): Promise<NoteInfo[]> {
  const res = await db
    .prepare(
      `SELECT n.id, n.body, n.visibility, u.name AS author_name, n.created_at
       FROM student_notes n JOIN users u ON u.id = n.author_user_id
       WHERE n.tenant_id = ? AND n.student_id = ? ORDER BY n.created_at DESC, n.id DESC LIMIT 200`,
    )
    .bind(tenantId, studentId)
    .all<NoteRow>();
  return res.results.map((r) => ({
    id: r.id,
    body: r.body,
    visibility: r.visibility,
    authorName: r.author_name,
    createdAt: r.created_at,
  }));
}

/** Adds a note only if the student belongs to this tenant and is not archived (checked in the statement). */
export const insertNote = (
  db: D1Database,
  n: { id: string; tenantId: string; studentId: string; authorId: string; visibility: string; body: string },
): D1PreparedStatement =>
  db
    .prepare(
      `INSERT INTO student_notes (id, tenant_id, student_id, author_user_id, visibility, body, created_at)
       SELECT ?1, s.tenant_id, s.id, ?2, ?3, ?4, ?5 FROM students s
       WHERE s.tenant_id = ?6 AND s.id = ?7 AND s.status != 'archived'`,
    )
    .bind(n.id, n.authorId, n.visibility, n.body, nowIso(), n.tenantId, n.studentId);

export const setNoteVisibility = (
  db: D1Database,
  tenantId: string,
  studentId: string,
  noteId: string,
  visibility: string,
): D1PreparedStatement =>
  db
    .prepare("UPDATE student_notes SET visibility = ? WHERE tenant_id = ? AND student_id = ? AND id = ?")
    .bind(visibility, tenantId, studentId, noteId);
