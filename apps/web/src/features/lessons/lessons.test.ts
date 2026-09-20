import type { LessonInfo } from "@lms/shared";
import { describe, expect, it } from "vitest";
import { addDays, formatDayShort, formatWeek, startOfWeek, today } from "../format";
import { lessonLabel } from "./status";
import { lessonPayload, recentLessons, splitLessons, type LessonFormValues } from "./useLessons";

const lesson = (over: Partial<LessonInfo>): LessonInfo => ({
  id: "x",
  courseId: "c",
  courseName: "English",
  seriesId: null,
  title: "",
  date: "2026-10-05",
  startTime: "18:00",
  endTime: "19:00",
  startsAt: "2026-10-05T11:00:00.000Z",
  endsAt: "2026-10-05T12:00:00.000Z",
  place: "",
  onlineUrl: null,
  status: "scheduled",
  version: 1,
  ...over,
});

describe("calendar days", () => {
  it("adds days across months, years and leap days", () => {
    expect(addDays("2026-10-28", 7)).toBe("2026-11-04");
    expect(addDays("2026-12-28", 7)).toBe("2027-01-04");
    expect(addDays("2028-02-25", 7)).toBe("2028-03-03");
    expect(addDays("2026-10-05", -5)).toBe("2026-09-30");
  });

  it("finds the Monday of a week, also when the day is a Sunday", () => {
    expect(startOfWeek("2026-10-05")).toBe("2026-10-05"); // a Monday
    expect(startOfWeek("2026-10-07")).toBe("2026-10-05");
    expect(startOfWeek("2026-10-11")).toBe("2026-10-05"); // a Sunday belongs to the week before it
    expect(startOfWeek("2026-10-12")).toBe("2026-10-12");
    expect(startOfWeek("2027-01-01")).toBe("2026-12-28"); // across the new year
  });

  it("reads today from the computer's own clock, not from UTC", () => {
    expect(today(new Date(2026, 9, 5, 0, 30))).toBe("2026-10-05");
    expect(today(new Date(2026, 9, 5, 23, 59))).toBe("2026-10-05");
    expect(today(new Date(2026, 0, 1, 12, 0))).toBe("2026-01-01");
  });

  it("shows days and weeks in plain words", () => {
    expect(formatDayShort("2026-10-05")).toBe("Mon 5 Oct");
    expect(formatWeek("2026-10-05")).toBe("5 Oct - 11 Oct 2026");
    expect(formatWeek("2026-12-28")).toBe("28 Dec - 3 Jan 2027");
  });
});

describe("splitLessons", () => {
  const now = new Date("2026-10-05T12:00:00.000Z");

  it("puts lessons that have not finished in 'upcoming', the rest in 'past' with the newest first", () => {
    const a = lesson({ id: "a", endsAt: "2026-10-01T10:00:00.000Z" });
    const b = lesson({ id: "b", endsAt: "2026-10-03T10:00:00.000Z" });
    const c = lesson({ id: "c", endsAt: "2026-10-07T10:00:00.000Z" });
    const { upcoming, past } = splitLessons([a, b, c], now);
    expect(upcoming.map((l) => l.id)).toEqual(["c"]);
    expect(past.map((l) => l.id)).toEqual(["b", "a"]);
  });

  it("a lesson that is on right now is still upcoming", () => {
    const l = lesson({ endsAt: "2026-10-05T12:30:00.000Z" });
    expect(splitLessons([l], now).upcoming).toHaveLength(1);
  });

  it("a lesson that was held moves to 'past' even when its time has not ended", () => {
    const l = lesson({ status: "held", endsAt: "2026-10-05T12:30:00.000Z" });
    expect(splitLessons([l], now)).toEqual({ upcoming: [], past: [l] });
  });

  it("keeps cancelled lessons in the list, so they can be restored", () => {
    const l = lesson({ status: "cancelled", endsAt: "2026-10-09T10:00:00.000Z" });
    expect(splitLessons([l], now).upcoming).toEqual([l]);
  });
});

describe("recentLessons", () => {
  const now = new Date("2026-10-10T12:00:00.000Z");

  it("keeps the lessons to come and the ones that ended in the last 3 days, and drops older ones", () => {
    const old = lesson({ id: "old", endsAt: "2026-10-07T11:59:00.000Z" }); // just over 3 days ago
    const edge = lesson({ id: "edge", endsAt: "2026-10-07T12:00:00.000Z" }); // exactly 3 days ago
    const yesterday = lesson({ id: "yesterday", endsAt: "2026-10-09T10:00:00.000Z" });
    const next = lesson({ id: "next", endsAt: "2026-11-09T10:00:00.000Z" });
    expect(recentLessons([old, edge, yesterday, next], now).map((l) => l.id)).toEqual([
      "edge",
      "yesterday",
      "next",
    ]);
  });

  it("also drops an old lesson that nobody marked, and an old cancelled one", () => {
    const unmarked = lesson({ id: "u", endsAt: "2026-09-01T10:00:00.000Z", status: "scheduled" });
    const cancelled = lesson({ id: "c", endsAt: "2026-09-01T10:00:00.000Z", status: "cancelled" });
    expect(recentLessons([unmarked, cancelled], now)).toEqual([]);
  });
});

describe("what is sent to make lessons", () => {
  const values = (over: Partial<LessonFormValues> = {}): LessonFormValues => ({
    title: "Unit 1",
    date: "2026-10-05",
    startTime: "18:00",
    durationMinutes: "60",
    onlineUrl: " https://meet.example.com/x ",
    repeat: "weekly",
    repeatUntil: "2026-12-28",
    ...over,
  });

  it("sends the length as a number, the repeat and its end date, and no place", () => {
    expect(lessonPayload(values())).toMatchObject({
      durationMinutes: 60,
      repeat: "weekly",
      repeatUntil: "2026-12-28",
      place: "",
    });
  });

  it("sends no end date when it repeats with no end, or when it does not repeat at all", () => {
    expect(lessonPayload(values({ repeatUntil: "" })).repeatUntil).toBeNull();
    expect(lessonPayload(values({ repeat: "none" })).repeatUntil).toBeNull();
    expect(lessonPayload(values({ repeat: "none" })).repeat).toBe("none");
  });

  it("sends an empty link as no link", () => {
    expect(lessonPayload(values({ onlineUrl: "  " })).onlineUrl).toBeNull();
  });
});

describe("lessonLabel", () => {
  const now = new Date("2026-10-05T12:00:00.000Z");

  it("says 'needs attendance' for a planned lesson that is already over", () => {
    expect(lessonLabel(lesson({ endsAt: "2026-10-05T11:59:00.000Z" }), now)).toBe("needs_attendance");
  });

  it("keeps 'scheduled' for a lesson that is on now or later", () => {
    expect(lessonLabel(lesson({ endsAt: "2026-10-05T12:00:00.000Z" }), now)).toBe("scheduled");
    expect(lessonLabel(lesson({ endsAt: "2026-10-06T12:00:00.000Z" }), now)).toBe("scheduled");
  });

  it("does not change held or cancelled lessons, however old they are", () => {
    expect(lessonLabel(lesson({ status: "held", endsAt: "2020-01-01T00:00:00.000Z" }), now)).toBe("held");
    expect(lessonLabel(lesson({ status: "cancelled", endsAt: "2020-01-01T00:00:00.000Z" }), now)).toBe(
      "cancelled",
    );
  });
});
