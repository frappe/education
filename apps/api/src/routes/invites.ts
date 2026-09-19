import { inviteStudentBody } from "@lms/shared";
import { Hono } from "hono";
import { makeCtx } from "../auth/service";
import type { AppBindings } from "../env";
import { actorOf, requireTeacher } from "../middleware/auth";
import { invitesOf, inviteStudent, resendInvite, revokeInvite } from "../students/invites";
import { accepted, parseBody } from "./helpers";

/** Teacher only. Every handler works out the tenant from the session, never from the request. */
export const invites = new Hono<AppBindings>();

invites.get("/invites", requireTeacher, async (c) => {
  return c.json({ invites: await invitesOf(await makeCtx(c), actorOf(c)) });
});

invites.post("/invites", requireTeacher, async (c) => {
  const body = await parseBody(c, inviteStudentBody);
  await inviteStudent(await makeCtx(c), actorOf(c), body);
  return accepted(c);
});

invites.post("/invites/:studentId/resend", requireTeacher, async (c) => {
  await resendInvite(await makeCtx(c), actorOf(c), c.req.param("studentId"));
  return accepted(c);
});

invites.delete("/invites/:studentId", requireTeacher, async (c) => {
  await revokeInvite(await makeCtx(c), actorOf(c), c.req.param("studentId"));
  return c.json({ ok: true });
});
