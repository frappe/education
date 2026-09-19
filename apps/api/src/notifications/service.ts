import type { NotificationList } from "@lms/shared";
import type { Actor } from "../auth/actor";
import type { Ctx } from "../auth/service";
import { markReadStatement, notificationsOf, unreadCount } from "../repos/notifications";

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
