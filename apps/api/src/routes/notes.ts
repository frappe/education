import { addNoteBody, noteVisibilityBody } from "@lms/shared";
import { Hono } from "hono";
import { makeCtx } from "../auth/service";
import type { AppBindings } from "../env";
import { actorOf, requireTeacher } from "../middleware/auth";
import { addNote, changeVisibility, listNotes } from "../students/notes";
import { parseBody } from "./helpers";

/** Teacher only. The tenant always comes from the session, never from the request. */
export const notes = new Hono<AppBindings>();

notes.get("/students/:id/notes", requireTeacher, async (c) => {
  return c.json({ notes: await listNotes(await makeCtx(c), actorOf(c), c.req.param("id")) });
});

notes.post("/students/:id/notes", requireTeacher, async (c) => {
  const body = await parseBody(c, addNoteBody);
  return c.json({ notes: await addNote(await makeCtx(c), actorOf(c), c.req.param("id"), body) }, 201);
});

notes.put("/students/:id/notes/:noteId", requireTeacher, async (c) => {
  const { visibility } = await parseBody(c, noteVisibilityBody);
  const list = await changeVisibility(
    await makeCtx(c),
    actorOf(c),
    c.req.param("id"),
    c.req.param("noteId"),
    visibility,
  );
  return c.json({ notes: list });
});
