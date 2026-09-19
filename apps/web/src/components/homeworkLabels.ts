import { messages } from "@/messages";

const t = messages.homework;

/** The words and colors for kinds and states of work. One place, used by every screen. */
export const kindText = {
  choice: t.kindChoice,
  short: t.kindShort,
  written: t.kindWritten,
  speaking: t.kindSpeaking,
} as const;
export const kindIcon = { choice: "attendance", short: "edit", written: "note", speaking: "video" } as const;

/** "5 questions · 20 points" */
export function summaryLine(questions: number, points: number): string {
  const q = questions === 1 ? t.questionOne : t.questionsCount.replace("{n}", String(questions));
  const p = points === 1 ? t.pointsOne : t.pointsTotal.replace("{n}", String(points));
  return `${q} · ${p}`;
}
export const assignmentStatusText = {
  draft: t.statusDraft,
  published: t.statusPublished,
  closed: t.statusClosed,
} as const;
export const assignmentStatusTone = { draft: "warning", published: "success", closed: "neutral" } as const;

export const submissionText = {
  not_started: t.stateNotStarted,
  drafted: t.stateNotStarted,
  submitted: t.stateSubmitted,
  graded: t.stateGraded,
  returned: t.stateReturned,
  revision_requested: t.stateAgain,
} as const;
export const submissionTone = {
  not_started: "neutral",
  drafted: "neutral",
  submitted: "warning",
  graded: "info",
  returned: "success",
  revision_requested: "error",
} as const;
