import type { MyWorkItem } from "@lms/shared";

const DAY = 86_400_000;

/**
 * The due time in plain words: "Due in 3 days", "Due today", "Overdue by 2 days".
 * `dueAt` is a UTC moment; `now` is passed in so the words can be tested.
 */
export function dueWords(dueAt: string | null, now: Date = new Date()): string {
  if (!dueAt) return "No due date";
  const diff = new Date(dueAt).getTime() - now.getTime();
  if (diff < 0) {
    const days = Math.floor(-diff / DAY);
    if (days === 0) return "Overdue since today";
    return days === 1 ? "Overdue by 1 day" : `Overdue by ${days} days`;
  }
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "Due in less than an hour";
  if (hours < 24) return hours === 1 ? "Due in 1 hour" : `Due in ${hours} hours`;
  const days = Math.floor(diff / DAY);
  return days === 1 ? "Due in 1 day" : `Due in ${days} days`;
}

export const isOverdue = (dueAt: string | null, now: Date = new Date()): boolean =>
  dueAt !== null && new Date(dueAt).getTime() < now.getTime();

/** How much of the score, for a badge like "8 / 10". */
export const scoreText = (score: number | null, max: number): string =>
  score === null ? "-" : `${Number.isInteger(score) ? score : score.toFixed(1)} / ${max}`;

export interface WorkGroups {
  /** The teacher asked for another try. */
  again: MyWorkItem[];
  /** Still to do. The ones that are due first come first. */
  todo: MyWorkItem[];
  /** Handed in, waiting for the teacher. */
  waiting: MyWorkItem[];
  /** The teacher returned it. */
  done: MyWorkItem[];
}

/**
 * Sorts a student's work into what to do next. Work the teacher closed and the student never handed in is
 * left out (nothing more can be done), unless it is already handed in.
 */
export function groupWork(items: MyWorkItem[]): WorkGroups {
  const byDue = (a: MyWorkItem, b: MyWorkItem) =>
    (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999") || a.title.localeCompare(b.title);
  const groups: WorkGroups = { again: [], todo: [], waiting: [], done: [] };
  for (const w of items) {
    if (w.status === "revision_requested") groups.again.push(w);
    else if (w.status === "submitted" || w.status === "graded") groups.waiting.push(w);
    else if (w.status === "returned") groups.done.push(w);
    else if (w.assignmentStatus === "published") groups.todo.push(w);
  }
  groups.again.sort(byDue);
  groups.todo.sort(byDue);
  groups.waiting.sort((a, b) => (b.submittedAt ?? "").localeCompare(a.submittedAt ?? ""));
  groups.done.sort((a, b) => (b.submittedAt ?? "").localeCompare(a.submittedAt ?? ""));
  return groups;
}
