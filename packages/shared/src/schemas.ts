import { z } from "zod";
import { ASSIGNMENT_TYPES, ATTENDANCE_STATUSES, LIMITS, type AttendanceStatus } from "./domain";

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

export const isoDate = z
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

// ------------------------------------------------------------- lessons and attendance (M2)

/** A link people open in a new tab. Only http and https: nothing that runs code. */
const onlineUrl = z
  .string()
  .trim()
  .max(LIMITS.maxLinkLength, "This link is too long.")
  // http or https, then a host (no spaces, and no "name:password@" in front of it), then anything after.
  .regex(/^https?:\/\/[^\s/?#@]+([/?#]\S*)?$/i, "Please enter a link that starts with http:// or https://");

export const lessonFields = z.object({
  title: z.string().trim().max(100, "This title is too long.").default(""),
  /** The day, in the teacher's time zone. */
  date: isoDate,
  /** The start time, in the teacher's time zone. */
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Please use the time format HH:mm, for example 18:30."),
  durationMinutes: z
    .number("Please enter a number.")
    .int("Please enter a whole number.")
    .min(15, "A lesson is at least 15 minutes.")
    .max(480, "A lesson is at most 8 hours."),
  place: z.string().trim().max(200, "This text is too long.").default(""),
  onlineUrl: onlineUrl.nullable().default(null),
});

/** "this": only this lesson. "following": this lesson and the next ones made with it. */
const scope = z.enum(["this", "following"]).default("this");

export const createLessonsBody = lessonFields.extend({
  /** How many weeks in a row, counting the first lesson. 1 means a single lesson. */
  repeatWeeks: z
    .number()
    .int()
    .min(1, "Use at least 1.")
    .max(LIMITS.maxRepeatWeeks, `You can repeat up to ${LIMITS.maxRepeatWeeks} weeks at a time.`)
    .default(1),
});
export const updateLessonBody = lessonFields.extend({ version: z.number().int().min(1), scope });
export const cancelLessonBody = z.object({ scope });

export const attendanceBody = z.object({
  records: z
    .array(
      z.object({
        studentId: z.string().min(1).max(64),
        status: z.enum(ATTENDANCE_STATUSES),
      }),
    )
    .min(1, "Please add at least one student.")
    .max(1000),
});

export type CreateLessonsBody = z.infer<typeof createLessonsBody>;
export type UpdateLessonBody = z.infer<typeof updateLessonBody>;
export type CancelLessonBody = z.infer<typeof cancelLessonBody>;
export type AttendanceBody = z.infer<typeof attendanceBody>;
export type LessonScope = "this" | "following";

export interface LessonInfo {
  id: string;
  courseId: string;
  courseName: string;
  /** Set when the lesson was made with "repeat every week". */
  seriesId: string | null;
  title: string;
  /** Local date and times in the teacher's time zone, ready to show. */
  date: string;
  startTime: string;
  endTime: string;
  /** The same moments in UTC. */
  startsAt: string;
  endsAt: string;
  place: string;
  onlineUrl: string | null;
  status: "scheduled" | "held" | "cancelled";
  version: number;
}

export interface AttendanceEntry {
  studentId: string;
  name: string;
  status: AttendanceStatus;
  /** false: nothing was saved yet, "attended" is only the starting choice. */
  saved: boolean;
  /** false: the student is no longer in the course, kept only because their mark was saved. */
  inCourse: boolean;
  /** The student joined the course after this lesson was over, so the starting choice is "absent". */
  joinedAfter: boolean;
}

export interface AttendanceSheet {
  lesson: LessonInfo;
  students: AttendanceEntry[];
}

export interface StudentAttendanceInfo {
  attended: number;
  absent: number;
  /** Newest first, at most 30. */
  recent: {
    lessonId: string;
    courseName: string;
    title: string;
    date: string;
    startTime: string;
    status: AttendanceStatus;
  }[];
}

// ------------------------------------------------ course links and assignments (M3)

/** A link students open in a new tab. https only, no spaces, nothing that runs code, no "name:password@". */
export const httpsLink = z
  .string()
  .trim()
  .max(LIMITS.maxLinkLength, "This link is too long.")
  .regex(/^https:\/\/[^\s/?#@]+([/?#]\S*)?$/i, "Please enter a link that starts with https://");

const linkTitle = z.string().trim().min(1, "Please enter a title.").max(100, "This title is too long.");

export const materialBody = z.object({
  title: linkTitle,
  url: httpsLink,
  /** false: only the teacher sees it. */
  published: z.boolean().default(true),
});
export type MaterialBody = z.infer<typeof materialBody>;

export interface MaterialInfo {
  id: string;
  title: string;
  url: string;
  published: boolean;
  createdAt: string;
}

const question = z.object({
  text: z.string().trim().min(1, "Please write the question.").max(500, "This question is too long."),
  options: z
    .array(z.string().trim().min(1, "Please write the answer.").max(200, "This answer is too long."))
    .min(2, "Add at least 2 answers.")
    .max(6, "Use at most 6 answers."),
});
export type QuestionInfo = z.infer<typeof question>;

const linkItem = z.object({ title: linkTitle, url: httpsLink });
export type LinkInfo = z.infer<typeof linkItem>;

const hhmm = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Please use the time format HH:mm, for example 18:30.");

export const assignmentFields = z
  .object({
    type: z.enum(ASSIGNMENT_TYPES),
    title: z.string().trim().min(1, "Please enter a title.").max(150, "This title is too long."),
    instructions: z.string().trim().max(5000, "This text is too long.").default(""),
    questions: z.array(question).max(50, "Use at most 50 questions.").default([]),
    links: z.array(linkItem).max(10, "Use at most 10 links.").default([]),
    /** Due day and time, in the teacher's time zone. Both, or neither. */
    dueDate: isoDate.nullable().default(null),
    dueTime: hhmm.nullable().default(null),
    allowLate: z.boolean().default(false),
    maxScore: z
      .number("Please enter a number.")
      .int("Please enter a whole number.")
      .min(1, "Use at least 1.")
      .max(100, "Use at most 100.")
      .default(10),
    targetMode: z.enum(["all", "selected"]).default("all"),
    studentIds: z.array(z.string().min(1).max(64)).max(200, "Choose at most 200 students.").default([]),
  })
  .superRefine((v, ctx) => {
    const add = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
    if (v.type === "multiple_choice" && v.questions.length === 0)
      add("questions", "Add at least 1 question.");
    if (v.type !== "multiple_choice" && v.questions.length > 0)
      add("questions", "Only multiple choice work has questions.");
    if ((v.dueDate === null) !== (v.dueTime === null)) {
      add(v.dueDate === null ? "dueDate" : "dueTime", "Please choose both the day and the time, or neither.");
    }
    if (v.targetMode === "selected" && v.studentIds.length === 0)
      add("studentIds", "Choose at least 1 student.");
  });

export const createAssignmentBody = assignmentFields;
export const updateAssignmentBody = assignmentFields.safeExtend({ version: z.number().int().min(1) });
export type CreateAssignmentBody = z.infer<typeof createAssignmentBody>;
export type UpdateAssignmentBody = z.infer<typeof updateAssignmentBody>;

export interface AssignmentInfo {
  id: string;
  courseId: string;
  courseName: string;
  type: "multiple_choice" | "essay" | "speaking";
  title: string;
  instructions: string;
  questions: QuestionInfo[];
  links: LinkInfo[];
  dueDate: string | null;
  dueTime: string | null;
  dueAt: string | null;
  allowLate: boolean;
  maxScore: number;
  targetMode: "all" | "selected";
  /** Only for target_mode "selected". */
  studentIds: string[];
  status: "draft" | "published" | "closed";
  version: number;
  /** How many students it is for, how many handed in, and how many wait for a score. */
  counts: { targeted: number; handedIn: number; toGrade: number };
}

// ------------------------------------------------------- the student's side (M3)

/** What a student writes for a piece of work. Which parts matter depends on the kind of work. */
export const answerBody = z.object({
  /** Essay text, or a short note with a speaking link. */
  textAnswer: z.string().max(10000, "This text is too long.").default(""),
  /** Speaking: the link to the video. Essay: an optional link. */
  linkUrl: httpsLink.nullable().default(null),
  /** Multiple choice: the chosen answer of each question (0 is the first), -1 when not answered. */
  answers: z.array(z.number().int().min(-1).max(5)).max(50).default([]),
});
export type AnswerBody = z.infer<typeof answerBody>;

export type SubmissionStatus =
  "not_started" | "drafted" | "submitted" | "graded" | "returned" | "revision_requested";

export interface MyWorkItem {
  id: string;
  courseId: string;
  courseName: string;
  title: string;
  type: "multiple_choice" | "essay" | "speaking";
  /** "closed": the teacher stopped taking work. */
  assignmentStatus: "published" | "closed";
  /** The due time that counts for this student (more time from the teacher is included). */
  dueAt: string | null;
  dueDate: string | null;
  dueTime: string | null;
  allowLate: boolean;
  maxScore: number;
  status: SubmissionStatus;
  isLate: boolean;
  submittedAt: string | null;
  /** Only when the teacher returned the work. */
  score: number | null;
}

export interface MyWorkDetail extends MyWorkItem {
  instructions: string;
  questions: QuestionInfo[];
  links: LinkInfo[];
  /** What the student saved or handed in so far. */
  answer: AnswerBody;
  /** The teacher's words: with a score when returned, or the reason when asked to do it again. */
  feedback: string;
  canEdit: boolean;
  /** Why the student cannot hand in now. */
  blocked: null | "closed" | "deadline" | "handed_in";
}

export interface MyCourseInfo {
  id: string;
  name: string;
  description: string;
  teacherName: string;
  nextLesson: { date: string; startTime: string; endTime: string; title: string } | null;
  openWork: number;
}

export interface MyCourseDetail {
  course: MyCourseInfo;
  materials: { id: string; title: string; url: string }[];
  lessons: {
    id: string;
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    place: string;
    onlineUrl: string | null;
    status: "scheduled" | "held" | "cancelled";
  }[];
  work: MyWorkItem[];
}

// ------------------------------------------------------------ grading (M3)

/** A score in steps of 0.5. The most it can be is checked against the work. */
const scoreValue = z
  .number("Please enter a score.")
  .min(0, "The score cannot be below 0.")
  .max(1000, "This score is too high.")
  .refine((v) => Number.isInteger(v * 2), "Use whole numbers or halves, for example 7 or 7.5.");
const feedbackText = z.string().trim().max(5000, "This text is too long.");

export const gradeBody = z.object({
  score: scoreValue,
  feedback: feedbackText.default(""),
  /** The version the teacher was looking at. If the student changed the answer since, the save is refused. */
  version: z.number().int().min(1),
});
export const revisionBody = z.object({
  /** Tells the student what to improve. */
  feedback: feedbackText.min(1, "Please tell the student what to change."),
  version: z.number().int().min(1),
});
export const returnBody = z.object({ version: z.number().int().min(1) });
export const extensionBody = z.object({ date: isoDate, time: hhmm });

export type GradeBody = z.infer<typeof gradeBody>;
export type RevisionBody = z.infer<typeof revisionBody>;
export type ExtensionBody = z.infer<typeof extensionBody>;

export interface SubmissionRow {
  studentId: string;
  studentName: string;
  status: SubmissionStatus;
  isLate: boolean;
  submittedAt: string | null;
  score: number | null;
  version: number | null;
  /** More time the teacher gave this student. */
  extensionUntil: string | null;
}

export interface SubmissionDetail {
  assignment: AssignmentInfo;
  studentId: string;
  studentName: string;
  status: SubmissionStatus;
  isLate: boolean;
  submittedAt: string | null;
  revisionCount: number;
  answer: AnswerBody;
  score: number | null;
  feedback: string;
  version: number;
  history: { at: string; by: string; oldScore: number | null; newScore: number | null; feedback: string }[];
  extensionUntil: string | null;
}

export interface QueueItem {
  assignmentId: string;
  assignmentTitle: string;
  courseId: string;
  courseName: string;
  studentId: string;
  studentName: string;
  submittedAt: string;
  isLate: boolean;
}
