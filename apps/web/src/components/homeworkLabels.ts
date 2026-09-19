import { messages } from "@/messages";

const t = messages.homework;

/** The words and colors for kinds and states of work. One place, used by every screen. */
export const typeText = {
  essay: t.typeEssay,
  speaking: t.typeSpeaking,
  multiple_choice: t.typeQuiz,
} as const;
export const typeIcon = { essay: "edit", speaking: "video", multiple_choice: "attendance" } as const;
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
