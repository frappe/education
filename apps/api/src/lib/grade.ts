import { isAutoQuestion, type AnswerItem, type QuestionInfo } from "@lms/shared";

/** Spaces and capital letters do not matter when a typed answer is checked. Accents do. */
export const normalizeAnswer = (text: string): string =>
  text.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();

export interface AutoResult {
  /** The points for each question the system scored (0 when wrong). */
  points: Record<string, number>;
  correct: Record<string, boolean>;
  autoAwarded: number;
  /** The most the scored questions could give. */
  autoMax: number;
  /** The questions only the teacher can score. */
  manualIds: string[];
}

/** Scores the questions that have a correct answer. Nothing else is touched. */
export function gradeAuto(questions: QuestionInfo[], answers: AnswerItem[]): AutoResult {
  const byId = new Map(answers.map((a) => [a.questionId, a]));
  const result: AutoResult = { points: {}, correct: {}, autoAwarded: 0, autoMax: 0, manualIds: [] };
  for (const q of questions) {
    if (!isAutoQuestion(q)) {
      result.manualIds.push(q.id);
      continue;
    }
    const a = byId.get(q.id);
    const right =
      q.kind === "choice"
        ? a?.choice === q.correct
        : a !== undefined && q.accepted.some((x) => normalizeAnswer(x) === normalizeAnswer(a.text));
    result.correct[q.id] = right;
    result.points[q.id] = right ? q.points : 0;
    result.autoAwarded += result.points[q.id]!;
    result.autoMax += q.points;
  }
  return result;
}

/** The correct answer as words, to show a student after they handed in. */
export function correctAnswerText(q: QuestionInfo): string | null {
  if (q.kind === "choice" && q.correct !== null) return q.options[q.correct] ?? null;
  if (q.kind === "short" && q.accepted.length > 0) return q.accepted.join(" / ");
  return null;
}

/** The old "kind of work" column keeps a summary: only choice questions is a quiz, only speaking is speaking. */
export function summaryKind(questions: QuestionInfo[]): "multiple_choice" | "speaking" | "essay" {
  if (questions.every((q) => q.kind === "choice")) return "multiple_choice";
  if (questions.every((q) => q.kind === "speaking")) return "speaking";
  return "essay";
}

export const totalPoints = (questions: QuestionInfo[]): number =>
  questions.reduce((sum, q) => sum + q.points, 0);
