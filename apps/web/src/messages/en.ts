import { GLOSSARY } from "@lms/shared";

/**
 * All text shown to people. Plain English (level A2-B1): short sentences, common
 * words, clear verbs. New words go in the glossary in packages/shared first.
 * Only English for now; a new language is a new file with the same keys.
 */
export const en = {
  app: { name: "LMS" },
  home: {
    title: "Welcome",
    intro: "Manage your students, lessons, homework and invoices in one place.",
    statusTitle: "Service status",
    statusOk: "Everything is working.",
    statusProblem: "We have a problem. Please try again in a few minutes.",
    statusChecking: "Checking...",
    retry: "Check again",
  },
  glossary: GLOSSARY,
} as const;

export type Messages = typeof en;
