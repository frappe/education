import { z } from "zod";
import { LIMITS } from "./domain";

/**
 * Request shapes shared by the API (which checks them) and the web app (which uses the
 * types and can check early). One definition means both sides always agree.
 */

const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "This email is too long.")
  .pipe(z.email("Please enter a valid email address."));

const name = z.string().trim().min(1, "Please enter a name.").max(100, "This name is too long.");

/** Sent by the bot check widget. Empty is allowed here; the server decides if it is required. */
const captcha = z.string().max(4096).optional();

export const signUpBody = z.object({ name, email, captcha });
export const tokenBody = z.object({ token: z.string().min(20).max(200) });
export const consumeLinkBody = tokenBody.extend({ trustDevice: z.boolean().optional() });
export const emailOnlyBody = z.object({ email, captcha });
export const inviteStudentBody = z.object({ name, email });

export type SignUpBody = z.infer<typeof signUpBody>;
export type InviteStudentBody = z.infer<typeof inviteStudentBody>;

export interface MeResponse {
  user: { id: string; name: string; email: string; emailVerified: boolean };
  memberships: { tenantId: string; tenantName: string; role: "teacher" | "student" }[];
}

export interface SessionInfo {
  id: string;
  createdAt: string;
  lastSeenAt: string;
  userAgent: string | null;
  current: boolean;
}

export type InviteState = "sent" | "expired" | "revoked";
export interface InviteInfo {
  studentId: string;
  name: string;
  email: string;
  state: InviteState;
  sentAt: string | null;
}

// ------------------------------------------------------------- courses and students (M2)

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Please use the date format YYYY-MM-DD.")
  .refine(
    (v) =>
      !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) && new Date(`${v}T00:00:00Z`).toISOString().startsWith(v),
    "This date does not exist.",
  );

/** Money is a whole number of VND. There are no decimals. */
const money = z
  .number("Please enter a number.")
  .int("Please enter a whole number.")
  .min(0, "The price cannot be below 0.")
  .max(100_000_000, "This price is too high.");

const phone = z
  .string()
  .trim()
  .max(30, "This phone number is too long.")
  .regex(/^[0-9+()\-.\s]*$/, "Use only numbers, spaces and + ( ) - .")
  .optional();

export const courseFields = z.object({
  name,
  description: z.string().trim().max(2000, "This text is too long.").default(""),
  pricePerLesson: money,
  startDate: isoDate.nullable().default(null),
  endDate: isoDate.nullable().default(null),
  maxStudents: z
    .number()
    .int()
    .min(1, "Use at least 1.")
    .max(1000, "This is too many.")
    .nullable()
    .default(null),
});

const datesInOrder = (v: { startDate: string | null; endDate: string | null }) =>
  !v.startDate || !v.endDate || v.endDate >= v.startDate;
const datesMessage = { message: "The end date cannot be before the start date.", path: ["endDate"] };

export const createCourseBody = courseFields.refine(datesInOrder, datesMessage);
export const updateCourseBody = courseFields
  .extend({
    /** The version the person was looking at. If someone changed the course since, the save is refused. */
    version: z.number().int().min(1),
    status: z.enum(["draft", "active"]).optional(),
  })
  .refine(datesInOrder, datesMessage);

export type CreateCourseBody = z.infer<typeof createCourseBody>;
export type UpdateCourseBody = z.infer<typeof updateCourseBody>;

export interface CourseInfo {
  id: string;
  name: string;
  description: string;
  pricePerLesson: number;
  startDate: string | null;
  endDate: string | null;
  maxStudents: number | null;
  /** Students who joined and are still taking the course. */
  enrolledCount: number;
  status: "draft" | "active" | "archived";
  version: number;
  createdAt: string;
}

export const addStudentBody = z.object({
  name,
  email,
  phone,
  /** Also send the invite email right away. */
  invite: z.boolean().default(false),
});
export const updateStudentBody = z.object({
  name,
  phone: phone.default(""),
  /** Private note for the teacher. Students never see it. */
  teacherNote: z.string().trim().max(2000, "This text is too long.").default(""),
  version: z.number().int().min(1),
});

export const MAX_IMPORT_ROWS = 200;
export const importStudentsBody = z.object({
  rows: z
    .array(
      z.object({
        name: z.string().max(200),
        email: z.string().max(254),
        phone: z.string().max(40).optional(),
      }),
    )
    .min(1, "Please add at least one row.")
    .max(MAX_IMPORT_ROWS, `You can import up to ${MAX_IMPORT_ROWS} students at a time.`),
  /** true: only check the rows and show the result. false: create the students. */
  dryRun: z.boolean(),
});

export type AddStudentBody = z.infer<typeof addStudentBody>;
export type UpdateStudentBody = z.infer<typeof updateStudentBody>;
export type ImportStudentsBody = z.infer<typeof importStudentsBody>;

/** joined: has an account. invited: invite sent. not_invited: only a profile. */
export type StudentAccess = "joined" | "invited" | "not_invited";
export interface StudentInfo {
  id: string;
  name: string;
  email: string;
  phone: string;
  access: StudentAccess;
  archived: boolean;
  teacherNote: string;
  version: number;
  createdAt: string;
}

export interface ImportRowResult {
  /** Row number as the person sees it (1 is the first student). */
  row: number;
  result: "new" | "exists" | "duplicate_in_list" | "invalid";
  message?: string;
}
export interface ImportResult {
  rows: ImportRowResult[];
  created: number;
}

// ------------------------------------------------------------------ enrollments (M2)

export const ENROLLMENT_STATUSES_EDITABLE = ["active", "completed", "dropped"] as const;

export const enrollBody = z.object({
  studentIds: z
    .array(z.string().min(1).max(64))
    .min(1, "Please choose at least one student.")
    .max(100, "You can add up to 100 students at a time."),
  /** A price for these students only. Leave empty to use the course price. */
  customPrice: money.nullable().default(null),
});
export const updateEnrollmentBody = z.object({
  status: z.enum(ENROLLMENT_STATUSES_EDITABLE),
  customPrice: money.nullable().default(null),
});

export type EnrollBody = z.infer<typeof enrollBody>;
export type UpdateEnrollmentBody = z.infer<typeof updateEnrollmentBody>;

export type EnrollmentStatus = "pending" | "active" | "completed" | "dropped";

/** One student in a course roster. */
export interface EnrollmentInfo {
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentArchived: boolean;
  status: EnrollmentStatus;
  /** null means the course price applies. */
  customPrice: number | null;
  enrolledAt: string;
  endedAt: string | null;
}

/** One course of a student, for the student's profile. */
export interface StudentCourseInfo {
  courseId: string;
  courseName: string;
  courseStatus: "draft" | "active" | "archived";
  status: EnrollmentStatus;
  customPrice: number | null;
  pricePerLesson: number;
  enrolledAt: string;
}

export interface EnrollOutcome {
  studentId: string;
  result: "enrolled" | "already_enrolled" | "full" | "not_found";
}
export interface EnrollResult {
  results: EnrollOutcome[];
  enrolled: number;
}
