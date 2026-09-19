import type { LessonInfo } from "@lms/shared";

/**
 * What to show for a lesson. A lesson that is over but has no attendance yet is not really "planned"
 * any more: the teacher still has something to do, so it says so.
 */
export type LessonLabel = "scheduled" | "held" | "cancelled" | "needs_attendance";

export function lessonLabel(l: Pick<LessonInfo, "status" | "endsAt">, now: Date = new Date()): LessonLabel {
  if (l.status === "scheduled" && l.endsAt < now.toISOString()) return "needs_attendance";
  return l.status;
}
