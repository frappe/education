import type { QuestionInfo } from "@lms/shared";
import { expect } from "vitest";
import { call, createStudent, type Person } from "./helpers";

// ---- questions, as a teacher writes them
export const choice = (text: string, options: string[], correct: number | null, points = 1) => ({
  kind: "choice",
  text,
  points,
  options,
  correct,
  accepted: [] as string[],
});
export const short = (text: string, accepted: string[], points = 1) => ({
  kind: "short",
  text,
  points,
  options: [] as string[],
  correct: null,
  accepted,
});
export const written = (text = "Write about your weekend.", points = 10) => ({
  kind: "written",
  text,
  points,
  options: [] as string[],
  correct: null,
  accepted: [] as string[],
});
export const speaking = (text = "Introduce yourself in a video.", points = 10) => ({
  kind: "speaking",
  text,
  points,
  options: [] as string[],
  correct: null,
  accepted: [] as string[],
});

/** A whole homework body. Only what is different needs to be given. */
export const homework = (over: Record<string, unknown> = {}) => ({
  title: "My weekend",
  instructions: "Do your best.",
  questions: [written()],
  links: [],
  dueDate: "2099-01-10",
  dueTime: "18:00",
  allowLate: false,
  targetMode: "all",
  studentIds: [],
  ...over,
});

/** A quiz where the system scores every question. */
export const quiz = (over: Record<string, unknown> = {}) =>
  homework({
    title: "Grammar quiz",
    questions: [
      choice("She ___ to school.", ["go", "goes", "going"], 1, 2),
      choice("They ___ happy.", ["is", "are"], 1, 1),
      short("The past of 'go' is ___.", ["went"], 2),
    ],
    ...over,
  });

/** Some questions the system scores, and some the teacher scores. */
export const mixed = (over: Record<string, unknown> = {}) =>
  homework({
    title: "Unit 1 test",
    questions: [
      choice("Pick the right word.", ["a", "b", "c"], 2, 2),
      short("Type the word for 'cat' in Spanish.", ["gato"], 3),
      written("Write about your family.", 5),
      speaking("Say hello in a video.", 5),
    ],
    ...over,
  });

// ---- what a student sends
export const a = {
  choice: (questionId: string, choice: number | null) => ({ questionId, choice, text: "", link: null }),
  text: (questionId: string, text: string) => ({ questionId, choice: null, text, link: null }),
  video: (questionId: string, link: string | null, text = "") => ({ questionId, choice: null, text, link }),
};

/** Answers for every question of a homework, right for the scored ones, so they can be changed one by one. */
export function fullAnswers(
  questions: { id: string; kind: string; correct: number | null; accepted: string[] }[],
) {
  return questions.map((q) => {
    if (q.kind === "choice") return a.choice(q.id, q.correct ?? 0);
    if (q.kind === "short") return a.text(q.id, q.accepted[0] ?? "something");
    if (q.kind === "written") return a.text(q.id, "My long answer.");
    return a.video(q.id, "https://youtu.be/abc123", "My note");
  });
}

// ---- people
export type Kid = Person & { studentId: string };
export async function joinedKid(t: Person, courseId: string, name = "Kid"): Promise<Kid> {
  const kid = await createStudent(t, name);
  const all = (await call("/api/students?page=1", { cookie: t.cookie })).json.students as {
    id: string;
    email: string;
  }[];
  const studentId = all.find((s) => s.email === kid.email)!.id;
  await call(`/api/courses/${courseId}/students`, {
    method: "POST",
    cookie: t.cookie,
    body: { studentIds: [studentId], customPrice: null },
  });
  return { ...kid, studentId };
}

/** Makes the homework and opens it for students. Returns its id and its questions (with the ids the server gave). */
export async function publish(t: Person, courseId: string, body: Record<string, unknown> = homework()) {
  const made = await call(`/api/courses/${courseId}/assignments`, { method: "POST", cookie: t.cookie, body });
  expect(made.status, JSON.stringify(made.json)).toBe(201);
  const id = made.json.assignment.id as string;
  expect(
    (await call(`/api/assignments/${id}/publish`, { method: "POST", cookie: t.cookie, body: {} })).status,
  ).toBe(200);
  return { id, questions: made.json.assignment.questions as QuestionInfo[] };
}

// ---- the student's calls
export const myWorkDetail = (kid: Person, id: string) => call(`/api/my/work/${id}`, { cookie: kid.cookie });
export const draft = (kid: Person, id: string, answers: unknown[]) =>
  call(`/api/my/work/${id}/draft`, { method: "PUT", cookie: kid.cookie, body: { answers } });
export const submit = (kid: Person, id: string, answers: unknown[]) =>
  call(`/api/my/work/${id}/submit`, { method: "POST", cookie: kid.cookie, body: { answers } });
export const myWork = async (kid: Person) =>
  (await call("/api/my/work", { cookie: kid.cookie })).json.work as {
    id: string;
    title: string;
    status: string;
    score: number | null;
    dueDate: string | null;
    dueTime: string | null;
    dueAt: string | null;
    isLate: boolean;
    questionCount: number;
    maxScore: number;
  }[];
