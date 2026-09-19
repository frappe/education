import { auditStatement } from "../audit";
import type { Flow } from "../google/flow";
import type { GoogleIdentity } from "../google/client";
import { AppError } from "../lib/errors";
import { uuidv7 } from "../lib/id";
import { findUserByGoogle, hasGoogle, linkGoogle } from "../repos/identities";
import { findStudent, openInvitesForEmail } from "../repos/students";
import { consumeToken, peekToken, useUpInvites } from "../repos/tokens";
import {
  findUserByEmail,
  insertMembership,
  insertTenant,
  insertUser,
  markEmailVerified,
  membershipsOf,
  tenantIsActive,
  type UserRow,
} from "../repos/users";
import { hit } from "../security/rate-limit";
import { joinStatements } from "../students/invites";
import { limitTokenTries, openSession, type Ctx } from "./service";
import type { NewSession } from "./session";

/**
 * Finishes "Continue with Google". By now Google has proved the person owns `id.email`.
 *
 * The rule for who may get in is the same as for email links: nobody gets an account just
 * because they have a Google account.
 *  - a teacher creates their own account ("sign-up");
 *  - a student gets in only when a teacher added and invited exactly this email address;
 *  - anyone who already has an account gets back in.
 */
export async function signInWithGoogle(ctx: Ctx, id: GoogleIdentity, flow: Flow): Promise<NewSession> {
  await limitTokenTries(ctx);
  const db = ctx.env.DB;

  // 1. Who is this? Google's own id first. The email only counts when no Google account is linked yet.
  let user: UserRow | null = await findUserByGoogle(db, id.subject);
  const linked = user !== null;
  if (!user) {
    user = await findUserByEmail(db, id.email);
    // The address already belongs to someone who uses another Google account. Google accounts can be
    // deleted and the address reused, so we do not hand over the old account. The email link still works.
    if (user && (await hasGoogle(db, user.id))) throw new AppError("GOOGLE_ACCOUNT_CHANGED");
  }
  if (user?.disabled_at) throw new AppError("ACCOUNT_PAUSED");

  const before: D1PreparedStatement[] = [];
  let tenantId: string | null = null;
  let action = "auth.google_sign_in";
  const joined: { tenantId: string; studentId: string }[] = [];

  // 2. Which classes is this email invited to? Only these can be joined.
  let invites: { id: string; tenant_id: string; name: string }[];
  if (flow.intent === "invite") {
    // The student opened an invite link, so this one invite is being accepted. The email Google gives
    // must be exactly the one the teacher typed. We check before using the link up, so a wrong
    // Google account does not waste it.
    const row = flow.invite ? await peekToken(db, flow.invite, "invite") : null;
    if (!row?.tenant_id || !row.student_id) throw new AppError("LINK_EXPIRED");
    if (!(await tenantIsActive(db, row.tenant_id))) throw new AppError("ACCOUNT_PAUSED");
    const student = await findStudent(db, row.tenant_id, row.student_id);
    if (!student || student.status === "archived") throw new AppError("LINK_EXPIRED");
    if (student.email !== id.email) throw new AppError("NOT_INVITED");
    if (!(await consumeToken(db, flow.invite!, "invite"))) throw new AppError("LINK_EXPIRED");
    invites = [{ id: student.id, tenant_id: student.tenant_id, name: student.name }];
  } else {
    invites = await openInvitesForEmail(db, id.email);
  }

  // 3. Make or update the account.
  const userId = user?.id ?? uuidv7();
  if (!user) {
    if (flow.intent === "sign-up") {
      const limit = await hit(db, `signup:ip:${ctx.ipHash}`, 10, 3600);
      if (!limit.allowed) throw new AppError("RATE_LIMITED");
      tenantId = uuidv7();
      before.push(
        insertTenant(db, { id: tenantId, name: `${id.name}'s classroom` }),
        insertUser(db, { id: userId, email: id.email, name: id.name, passwordHash: null, verified: true }),
        insertMembership(db, { userId, tenantId, role: "teacher" }),
        auditStatement(db, { action: "auth.sign_up", actorUserId: userId, tenantId, ipHash: ctx.ipHash }),
      );
      action = "auth.google_sign_up";
    } else if (invites.length === 0) {
      throw new AppError("NOT_INVITED");
    }
  } else {
    before.push(markEmailVerified(db, userId));
    if ((await membershipsOf(db, userId)).length === 0 && invites.length === 0) {
      throw new AppError("ACCOUNT_PAUSED");
    }
  }

  // 4. Join the invited classes. A new person (no account, not a teacher) is created by the first join.
  let created = user !== null || flow.intent === "sign-up";
  for (const inv of invites) {
    if (!(await tenantIsActive(db, inv.tenant_id))) continue;
    before.push(
      ...joinStatements(db, {
        tenantId: inv.tenant_id,
        student: { id: inv.id, name: inv.name, email: id.email },
        userId,
        userExists: created,
      }),
      useUpInvites(db, inv.id),
      auditStatement(db, {
        action: "student.invite_accepted",
        actorUserId: userId,
        tenantId: inv.tenant_id,
        targetType: "student",
        targetId: inv.id,
        ipHash: ctx.ipHash,
        meta: { via: "google" },
      }),
    );
    created = true;
    joined.push({ tenantId: inv.tenant_id, studentId: inv.id });
  }
  if (!created) throw new AppError("NOT_INVITED"); // every invite was in a paused tenant

  if (!linked) before.push(linkGoogle(db, userId, id.subject));

  try {
    return await openSession(ctx, userId, {
      trustDevice: flow.keep,
      before,
      action,
      tenantId: tenantId ?? joined[0]?.tenantId ?? null,
    });
  } catch (err) {
    // Two sign ins for the same new person at the same moment: the database refused the second one.
    if (String(err).includes("UNIQUE")) throw new AppError("GOOGLE_FAILED");
    throw err;
  }
}
