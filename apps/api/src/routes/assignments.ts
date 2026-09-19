import { acceptAnswerBody, createAssignmentBody, materialBody, updateAssignmentBody } from "@lms/shared";
import { Hono } from "hono";
import {
  acceptAnswer,
  addMaterial,
  closeAssignment,
  createAssignment,
  deleteAssignment,
  editMaterial,
  getAssignment,
  listAssignments,
  listMaterials,
  publishAssignment,
  removeMaterial,
  updateAssignment,
} from "../assignments/service";
import { makeCtx } from "../auth/service";
import type { AppBindings } from "../env";
import { actorOf, requireTeacher } from "../middleware/auth";
import { parseBody } from "./helpers";

/** Teacher only. The tenant always comes from the session, never from the request. */
export const assignments = new Hono<AppBindings>();

assignments.get("/courses/:id/assignments", requireTeacher, async (c) => {
  return c.json({ assignments: await listAssignments(await makeCtx(c), actorOf(c), c.req.param("id")) });
});

assignments.post("/courses/:id/assignments", requireTeacher, async (c) => {
  const body = await parseBody(c, createAssignmentBody);
  const made = await createAssignment(await makeCtx(c), actorOf(c), c.req.param("id"), body);
  return c.json({ assignment: made }, 201);
});

assignments.get("/assignments/:id", requireTeacher, async (c) => {
  return c.json({ assignment: await getAssignment(await makeCtx(c), actorOf(c), c.req.param("id")) });
});

assignments.put("/assignments/:id", requireTeacher, async (c) => {
  const body = await parseBody(c, updateAssignmentBody);
  return c.json({
    assignment: await updateAssignment(await makeCtx(c), actorOf(c), c.req.param("id"), body),
  });
});

assignments.post("/assignments/:id/publish", requireTeacher, async (c) => {
  return c.json({ assignment: await publishAssignment(await makeCtx(c), actorOf(c), c.req.param("id")) });
});

assignments.post("/assignments/:id/close", requireTeacher, async (c) => {
  return c.json({ assignment: await closeAssignment(await makeCtx(c), actorOf(c), c.req.param("id")) });
});

assignments.post("/assignments/:id/questions/:questionId/accept", requireTeacher, async (c) => {
  const body = await parseBody(c, acceptAnswerBody);
  return c.json(
    await acceptAnswer(
      await makeCtx(c),
      actorOf(c),
      c.req.param("id"),
      c.req.param("questionId"),
      body.answer,
    ),
  );
});

assignments.delete("/assignments/:id", requireTeacher, async (c) => {
  await deleteAssignment(await makeCtx(c), actorOf(c), c.req.param("id"));
  return c.json({ ok: true });
});

assignments.get("/courses/:id/materials", requireTeacher, async (c) => {
  return c.json({ materials: await listMaterials(await makeCtx(c), actorOf(c), c.req.param("id")) });
});

assignments.post("/courses/:id/materials", requireTeacher, async (c) => {
  const body = await parseBody(c, materialBody);
  return c.json({ materials: await addMaterial(await makeCtx(c), actorOf(c), c.req.param("id"), body) }, 201);
});

assignments.put("/courses/:id/materials/:materialId", requireTeacher, async (c) => {
  const body = await parseBody(c, materialBody);
  const list = await editMaterial(
    await makeCtx(c),
    actorOf(c),
    c.req.param("id"),
    c.req.param("materialId"),
    body,
  );
  return c.json({ materials: list });
});

assignments.delete("/courses/:id/materials/:materialId", requireTeacher, async (c) => {
  const list = await removeMaterial(
    await makeCtx(c),
    actorOf(c),
    c.req.param("id"),
    c.req.param("materialId"),
  );
  return c.json({ materials: list });
});
