import type { MyWorkItem } from "@lms/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAutosave } from "../my/autosave";
import { newQuestion, questionPayload, totalOf } from "./useHomework";
import { dueWords, groupWork, isOverdue, scoreText } from "./dates";

const NOW = new Date("2026-10-05T12:00:00.000Z");
const at = (ms: number) => new Date(NOW.getTime() + ms).toISOString();
const H = 3_600_000;
const D = 24 * H;

describe("dueWords", () => {
  it("says when it is due, in plain words", () => {
    expect(dueWords(null, NOW)).toBe("No due date");
    expect(dueWords(at(30 * 60_000), NOW)).toBe("Due in less than an hour");
    expect(dueWords(at(H), NOW)).toBe("Due in 1 hour");
    expect(dueWords(at(5 * H), NOW)).toBe("Due in 5 hours");
    expect(dueWords(at(25 * H), NOW)).toBe("Due in 1 day");
    expect(dueWords(at(3 * D + H), NOW)).toBe("Due in 3 days");
  });

  it("says when it is late", () => {
    expect(dueWords(at(-H), NOW)).toBe("Overdue since today");
    expect(dueWords(at(-D - H), NOW)).toBe("Overdue by 1 day");
    expect(dueWords(at(-4 * D), NOW)).toBe("Overdue by 4 days");
  });

  it("knows what overdue is", () => {
    expect(isOverdue(null, NOW)).toBe(false);
    expect(isOverdue(at(-1), NOW)).toBe(true);
    expect(isOverdue(at(1), NOW)).toBe(false);
  });
});

describe("scoreText", () => {
  it("shows a score out of the maximum, with halves", () => {
    expect(scoreText(null, 10)).toBe("-");
    expect(scoreText(8, 10)).toBe("8 / 10");
    expect(scoreText(7.5, 10)).toBe("7.5 / 10");
    expect(scoreText(0, 100)).toBe("0 / 100");
  });
});

const work = (over: Partial<MyWorkItem>): MyWorkItem => ({
  id: "a",
  courseId: "c",
  courseName: "English",
  title: "A",
  questionCount: 1,
  assignmentStatus: "published",
  dueAt: null,
  dueDate: null,
  dueTime: null,
  allowLate: false,
  maxScore: 10,
  status: "not_started",
  isLate: false,
  submittedAt: null,
  score: null,
  ...over,
});

describe("groupWork", () => {
  it("puts work in the group that says what to do, and sorts by due time with no date last", () => {
    const g = groupWork([
      work({ id: "1", title: "Later", dueAt: at(5 * D) }),
      work({ id: "2", title: "Soon", dueAt: at(D), status: "drafted" }),
      work({ id: "3", title: "No date" }),
      work({ id: "4", title: "Try again", status: "revision_requested", dueAt: at(2 * D) }),
      work({ id: "5", title: "Sent", status: "submitted", submittedAt: at(-D) }),
      work({ id: "6", title: "Scored, hidden", status: "graded", submittedAt: at(-2 * D) }),
      work({ id: "7", title: "Back", status: "returned", submittedAt: at(-3 * D), score: 9 }),
    ]);
    expect(g.todo.map((w) => w.title)).toEqual(["Soon", "Later", "No date"]);
    expect(g.again.map((w) => w.title)).toEqual(["Try again"]);
    expect(g.waiting.map((w) => w.title)).toEqual(["Sent", "Scored, hidden"]);
    expect(g.done.map((w) => w.title)).toEqual(["Back"]);
  });

  it("leaves out closed work the student never handed in, but keeps closed work that was handed in", () => {
    const g = groupWork([
      work({ id: "1", assignmentStatus: "closed" }),
      work({ id: "2", assignmentStatus: "closed", status: "submitted" }),
      work({ id: "3", assignmentStatus: "closed", status: "returned", score: 5 }),
    ]);
    expect(g.todo).toEqual([]);
    expect(g.waiting).toHaveLength(1);
    expect(g.done).toHaveLength(1);
  });
});

describe("createAutosave", () => {
  afterEach(() => vi.useRealTimers());

  it("waits until the person stops typing, then saves once", async () => {
    vi.useFakeTimers();
    const save = vi.fn(async () => {});
    const states: string[] = [];
    const a = createAutosave({ save, delayMs: 1000, onState: (s) => states.push(s) });
    a.touch();
    await vi.advanceTimersByTimeAsync(600);
    a.touch(); // typing again resets the wait
    await vi.advanceTimersByTimeAsync(600);
    expect(save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(500);
    expect(save).toHaveBeenCalledTimes(1);
    expect(states.at(-1)).toBe("saved");
  });

  it("saves again when the person typed while a save was running, never two at once", async () => {
    vi.useFakeTimers();
    let running = 0;
    let maxRunning = 0;
    const save = vi.fn(async () => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((r) => setTimeout(r, 500));
      running--;
    });
    const a = createAutosave({ save, delayMs: 100 });
    a.touch();
    await vi.advanceTimersByTimeAsync(150); // the first save starts
    a.touch();
    await vi.advanceTimersByTimeAsync(150); // the second one is due while the first still runs
    await vi.advanceTimersByTimeAsync(2000);
    expect(save).toHaveBeenCalledTimes(2);
    expect(maxRunning).toBe(1);
  });

  it("says so when saving fails, and can try again", async () => {
    vi.useFakeTimers();
    let fail = true;
    const save = vi.fn(async () => {
      if (fail) throw new Error("offline");
    });
    const states: string[] = [];
    const a = createAutosave({ save, delayMs: 100, onState: (s) => states.push(s) });
    a.touch();
    await vi.advanceTimersByTimeAsync(200);
    expect(states.at(-1)).toBe("error");
    fail = false;
    a.touch();
    await vi.advanceTimersByTimeAsync(200);
    expect(states.at(-1)).toBe("saved");
  });

  it("flush saves at once without waiting", async () => {
    vi.useFakeTimers();
    const save = vi.fn(async () => {});
    const a = createAutosave({ save, delayMs: 10_000 });
    a.touch();
    const done = a.flush();
    await vi.advanceTimersByTimeAsync(50);
    await done;
    expect(save).toHaveBeenCalledTimes(1);
  });
});

describe("questionPayload", () => {
  const q = (over: Record<string, unknown> = {}) => ({ ...newQuestion("choice"), text: "Q", ...over });

  it("leaves out empty answers and moves the correct answer with its answer", () => {
    const p = questionPayload(q({ options: ["a", "", "c", "  ", "e"], correct: 4 }));
    expect(p.options).toEqual(["a", "c", "e"]);
    expect(p.correct).toBe(2); // "e" was the fifth, and is now the third
  });

  it("has no correct answer when the marked answer was empty, or none was marked", () => {
    expect(questionPayload(q({ options: ["a", "", "c"], correct: 1 })).correct).toBeNull();
    expect(questionPayload(q({ options: ["a", "b"], correct: null })).correct).toBeNull();
    expect(questionPayload(q({ options: ["a", "b"], correct: 0 })).correct).toBe(0);
  });

  it("only sends what belongs to the kind of question", () => {
    const short = questionPayload({
      ...newQuestion("short"),
      text: "S",
      accepted: ["went", " ", "gone"],
      options: ["x"],
      correct: 0,
    });
    expect(short).toMatchObject({ kind: "short", options: [], correct: null, accepted: ["went", "gone"] });
    const written = questionPayload({
      ...newQuestion("written"),
      text: "W",
      accepted: ["x"],
      options: ["y"],
      correct: 0,
    });
    expect(written).toMatchObject({ options: [], correct: null, accepted: [] });
  });

  it("reads points typed with a comma, keeps the id, and leaves empty points for the check to refuse", () => {
    expect(questionPayload(q({ points: "1,5" })).points).toBe(1.5);
    expect(questionPayload(q({ points: "" })).points).toBeUndefined();
    expect(questionPayload(q({ id: "q_abc" })).id).toBe("q_abc");
    expect("id" in questionPayload(q())).toBe(false);
  });

  it("starts each kind with sensible points and fields", () => {
    expect(newQuestion("choice")).toMatchObject({ points: "1", options: ["", ""], accepted: [] });
    expect(newQuestion("short")).toMatchObject({ points: "1", options: [], accepted: [""] });
    expect(newQuestion("written").points).toBe("5");
    expect(newQuestion("speaking").points).toBe("5");
  });
});

describe("totalOf", () => {
  it("adds up the points, also halves, and ignores what is not a number", () => {
    const one = (points: string) => ({ ...newQuestion("written"), points });
    expect(totalOf([one("5"), one("1,5"), one("2.5")])).toBe(9);
    expect(totalOf([one(""), one("abc"), one("-3"), one("2")])).toBe(2);
    expect(totalOf([])).toBe(0);
  });
});
