import type { QuestionInfo } from "@lms/shared";
import { describe, expect, it } from "vitest";
import { correctAnswerText, gradeAuto, normalizeAnswer, summaryKind, totalPoints } from "../src/lib/grade";

const q = (over: Partial<QuestionInfo> & { id: string }): QuestionInfo => ({
  kind: "choice",
  text: "Q",
  points: 1,
  options: ["a", "b", "c"],
  correct: null,
  accepted: [],
  ...over,
});
const a = (questionId: string, over: Record<string, unknown> = {}) => ({
  questionId,
  choice: null,
  text: "",
  link: null,
  ...over,
});

describe("normalizeAnswer", () => {
  it("ignores spaces and capital letters, but not accents", () => {
    expect(normalizeAnswer("  Hello   World ")).toBe("hello world");
    expect(normalizeAnswer("HELLO\tworld")).toBe("hello world");
    expect(normalizeAnswer("Việt Nam")).not.toBe(normalizeAnswer("Viet Nam"));
    // the same accent written in two ways is the same answer
    expect(normalizeAnswer("é")).toBe(normalizeAnswer("é"));
  });
});

describe("gradeAuto", () => {
  const questions = [
    q({ id: "c1", correct: 1, points: 2 }),
    q({ id: "c2", correct: 0, points: 1.5 }),
    q({ id: "s1", kind: "short", options: [], accepted: ["goes", "Goes to"], points: 3 }),
    q({ id: "w1", kind: "written", options: [], points: 5 }),
    q({ id: "v1", kind: "speaking", options: [], points: 4 }),
    q({ id: "c3", correct: null, points: 2 }), // a choice question with no answer key: the teacher scores it
    q({ id: "s2", kind: "short", options: [], accepted: [], points: 2 }), // no accepted answers: the teacher scores it
  ];

  it("gives the points of right answers and 0 for wrong or missing ones", () => {
    const r = gradeAuto(questions, [
      a("c1", { choice: 1 }),
      a("c2", { choice: 2 }),
      a("s1", { text: "  GOES " }),
    ]);
    expect(r.points).toEqual({ c1: 2, c2: 0, s1: 3 });
    expect(r.correct).toEqual({ c1: true, c2: false, s1: true });
    expect(r.autoAwarded).toBe(5);
    expect(r.autoMax).toBe(6.5);
  });

  it("only leaves out the questions nobody can score by machine", () => {
    const r = gradeAuto(questions, []);
    expect(r.manualIds).toEqual(["w1", "v1", "c3", "s2"]);
    expect(r.points).toEqual({ c1: 0, c2: 0, s1: 0 });
    expect(r.autoAwarded).toBe(0);
  });

  it("accepts any of the accepted answers", () => {
    expect(gradeAuto(questions, [a("s1", { text: "goes to" })]).correct.s1).toBe(true);
    expect(gradeAuto(questions, [a("s1", { text: "go" })]).correct.s1).toBe(false);
    expect(gradeAuto(questions, [a("s1", { text: "" })]).correct.s1).toBe(false);
  });

  it("a quiz with only scored questions has nothing for the teacher", () => {
    const quiz = [q({ id: "1", correct: 0 }), q({ id: "2", correct: 2 })];
    const r = gradeAuto(quiz, [a("1", { choice: 0 }), a("2", { choice: 2 })]);
    expect(r.manualIds).toEqual([]);
    expect(r.autoAwarded).toBe(2);
    expect(r.autoMax).toBe(2);
  });

  it("choice 0 is a real answer, not 'no answer'", () => {
    const only = [q({ id: "1", correct: 0 })];
    expect(gradeAuto(only, [a("1", { choice: 0 })]).correct["1"]).toBe(true);
    expect(gradeAuto(only, [a("1", { choice: null })]).correct["1"]).toBe(false);
  });
});

describe("helpers", () => {
  it("shows the correct answer in words", () => {
    expect(correctAnswerText(q({ id: "1", correct: 1 }))).toBe("b");
    expect(correctAnswerText(q({ id: "1", kind: "short", options: [], accepted: ["x", "y"] }))).toBe("x / y");
    expect(correctAnswerText(q({ id: "1", correct: null }))).toBeNull();
    expect(correctAnswerText(q({ id: "1", kind: "written", options: [] }))).toBeNull();
  });

  it("summarises the kind and adds the points", () => {
    expect(summaryKind([q({ id: "1" }), q({ id: "2" })])).toBe("multiple_choice");
    expect(summaryKind([q({ id: "1", kind: "speaking", options: [] })])).toBe("speaking");
    expect(summaryKind([q({ id: "1" }), q({ id: "2", kind: "written", options: [] })])).toBe("essay");
    expect(totalPoints([q({ id: "1", points: 1.5 }), q({ id: "2", points: 2 })])).toBe(3.5);
  });
});
