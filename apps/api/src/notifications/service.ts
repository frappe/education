import { EMAIL_KINDS, type NotificationList, type NotificationSettings } from "@lms/shared";
import type { Actor } from "../auth/actor";
import type { Ctx } from "../auth/service";
import {
  markReadStatement,
  mutedKindsOf,
  notificationsOf,
  setMutedKindsStatement,
  unreadCount,
} from "../repos/notifications";

/** The person's own notifications, newest first. */
export async function list(ctx: Ctx, actor: Actor): Promise<NotificationList> {
  const [rows, unread] = await Promise.all([
    notificationsOf(ctx.env.DB, actor.userId, 50),
    unreadCount(ctx.env.DB, actor.userId),
  ]);
  return {
    items: rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      title: r.title,
      body: r.body,
      link: r.link,
      at: r.created_at,
      read: r.read_at !== null,
    })),
    unread,
  };
}

export const unread = (ctx: Ctx, actor: Actor) => unreadCount(ctx.env.DB, actor.userId);

/** Marks some (or all) of the person's notifications as read. */
export async function markRead(ctx: Ctx, actor: Actor, ids: string[] | undefined): Promise<number> {
  await markReadStatement(ctx.env.DB, actor.userId, ids ?? null).run();
  return unreadCount(ctx.env.DB, actor.userId);
}

/** Only a student gets these emails, so a teacher sees no choices. */
export async function settingsGet(ctx: Ctx, actor: Actor): Promise<NotificationSettings> {
  if (!actor.memberships.some((m) => m.role === "student")) return { kinds: [] };
  const muted = new Set(await mutedKindsOf(ctx.env.DB, actor.userId));
  return { kinds: EMAIL_KINDS.map((kind) => ({ kind, email: !muted.has(kind) })) };
}

export async function settingsSet(ctx: Ctx, actor: Actor, muted: string[]): Promise<NotificationSettings> {
  await setMutedKindsStatement(ctx.env.DB, actor.userId, [...new Set(muted)]).run();
  return settingsGet(ctx, actor);
}

/**
 * Runs a statement that makes notifications. A notification that could not be made never turns a good action
 * (opening work, handing in, scoring) into an error: it is logged for us and the action stays done.
 */
export async function tell(statement: D1PreparedStatement): Promise<void> {
  try {
    await statement.run();
  } catch (err) {
    console.error(JSON.stringify({ msg: "notification not made", err: String(err) }));
  }
}
