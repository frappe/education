/** Fixed values used by both API and web. Keep the labels in plain English. */

export const ROLES = ["teacher", "student"] as const;
export type Role = (typeof ROLES)[number];

export const ATTENDANCE_STATUSES = ["attended", "absent"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];
/** Only lessons the student attended are billed. */
export const BILLABLE_ATTENDANCE: readonly AttendanceStatus[] = ["attended"];

export const COURSE_STATUSES = ["draft", "active", "archived"] as const;
export const ENROLLMENT_STATUSES = ["pending", "active", "completed", "dropped"] as const;
export const INVITE_STATUSES = ["sent", "accepted", "expired", "revoked"] as const;
export const LESSON_STATUSES = ["scheduled", "held", "cancelled"] as const;
export const ASSIGNMENT_TYPES = ["multiple_choice", "essay", "speaking"] as const;
export const ASSIGNMENT_STATUSES = ["draft", "published", "closed"] as const;
export const SUBMISSION_STATUSES = [
  "not_started",
  "drafted",
  "submitted",
  "graded",
  "returned",
  "revision_requested",
] as const;
export const INVOICE_STATUSES = ["draft", "sent", "paid", "void"] as const;
export const COMMENT_VISIBILITY = ["student_visible", "private"] as const;
export const SCAN_STATUSES = ["pending", "clean", "infected", "skipped"] as const;

export const DEFAULT_TIMEZONE = "Asia/Ho_Chi_Minh";
export const DEFAULT_CURRENCY = "VND";

/** Limits from the plan (Section 3 and 4). */
export const LIMITS = {
  maxFileBytes: 25 * 1024 * 1024,
  maxLinkLength: 2048,
  magicLinkMinutes: 15,
  inviteDays: 7,
  sessionIdleDays: 7,
  sessionMaxDays: 30,
  anonymousFeedbackMinResponses: 3,
} as const;
