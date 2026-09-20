import { z } from "zod";
import { isBin } from "./vietqr";
import { ATTENDANCE_STATUSES, INVOICE_STATUSES, LIMITS, type AttendanceStatus } from "./domain";

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

const hhmm = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Please use the time format HH:mm, for example 18:30.");
const linkItem = z.object({ title: linkTitle, url: httpsLink });
export type LinkInfo = z.infer<typeof linkItem>;

/** Points are whole numbers or halves. */
const points = z
  .number("Please enter the points.")
  .min(0.5, "Use at least 0.5 point.")
  .max(100, "Use at most 100 points for one question.")
  .refine((v) => Number.isInteger(v * 2), "Use whole numbers or halves, for example 2 or 1.5.");

export const QUESTION_KINDS = ["choice", "short", "written", "speaking"] as const;
export type QuestionKind = (typeof QUESTION_KINDS)[number];

/**
 * One question of a homework. A homework is a list of these, and the kinds can be mixed:
 *  - choice:   the student picks one answer. With a correct answer set, the system scores it.
 *  - short:    the student types a short answer. With accepted answers set, the system scores it
 *              (spaces and capital letters do not matter).
 *  - written:  the student writes a longer answer. The teacher scores it.
 *  - speaking: the student adds a link to a video. The teacher scores it.
 */
const questionInput = z.object({
  /** Kept when a question is edited. A new question gets one from the server. */
  id: z.string().min(1).max(40).optional(),
  kind: z.enum(QUESTION_KINDS),
  text: z.string().trim().max(1000, "This question is too long."),
  points,
  options: z
    .array(z.string().trim().max(200, "This answer is too long."))
    .max(6, "Use at most 6 answers.")
    .default([]),
  /** The number of the correct answer (0 is the first). Empty: the teacher scores it by hand. */
  correct: z.number().int().min(0).max(5).nullable().default(null),
  accepted: z
    .array(z.string().trim().max(200, "This answer is too long."))
    .max(10, "Use at most 10 answers.")
    .default([]),
});

export interface QuestionInfo {
  id: string;
  kind: QuestionKind;
  text: string;
  points: number;
  options: string[];
  correct: number | null;
  accepted: string[];
}

/** Does the system score this question by itself? */
/** One more answer the system accepts for a short answer question. Allowed also after students handed in. */
export const acceptAnswerBody = z.object({
  answer: z.string().trim().min(1, "Please write the answer.").max(200, "This answer is too long."),
});

export const isAutoQuestion = (q: Pick<QuestionInfo, "kind" | "correct" | "accepted">): boolean =>
  (q.kind === "choice" && q.correct !== null) || (q.kind === "short" && q.accepted.length > 0);

export const assignmentFields = z
  .object({
    title: z.string().trim().min(1, "Please enter a title.").max(150, "This title is too long."),
    instructions: z.string().trim().max(5000, "This text is too long.").default(""),
    questions: z.array(questionInput).min(1, "Add at least 1 question.").max(50, "Use at most 50 questions."),
    links: z.array(linkItem).max(10, "Use at most 10 links.").default([]),
    /** Due day and time, in the teacher's time zone. Both, or neither. */
    dueDate: isoDate.nullable().default(null),
    dueTime: hhmm.nullable().default(null),
    allowLate: z.boolean().default(false),
    targetMode: z.enum(["all", "selected"]).default("all"),
    studentIds: z.array(z.string().min(1).max(64)).max(200, "Choose at most 200 students.").default([]),
  })
  .superRefine((v, ctx) => {
    const add = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
    if ((v.dueDate === null) !== (v.dueTime === null)) {
      add(v.dueDate === null ? "dueDate" : "dueTime", "Please choose both the day and the time, or neither.");
    }
    if (v.targetMode === "selected" && v.studentIds.length === 0)
      add("studentIds", "Choose at least 1 student.");
    let total = 0;
    const ids = new Set<string>();
    v.questions.forEach((q, i) => {
      const n = `Question ${i + 1}: `;
      total += q.points;
      if (q.id) {
        if (ids.has(q.id)) add("questions", `${n}this question is in the list twice.`);
        ids.add(q.id);
      }
      if (q.text.trim() === "") add("questions", `${n}please write the question.`);
      if (q.kind === "choice") {
        if (q.options.length < 2) add("questions", `${n}add at least 2 answers.`);
        if (q.options.some((o) => o.trim() === ""))
          add("questions", `${n}please write every answer, or remove the empty ones.`);
        if (q.correct !== null && q.correct >= q.options.length)
          add("questions", `${n}the correct answer is not on the list.`);
      } else if (q.options.length > 0 || q.correct !== null) {
        add("questions", `${n}only multiple choice questions have answers to choose from.`);
      }
      if (q.kind === "short") {
        if (q.accepted.some((a) => a.trim() === ""))
          add("questions", `${n}please write every accepted answer, or remove the empty ones.`);
      } else if (q.accepted.length > 0) {
        add("questions", `${n}only short answer questions have accepted answers.`);
      }
    });
    if (total > 1000) add("questions", "The points of all questions together can be at most 1000.");
  });

export const createAssignmentBody = assignmentFields;
export const updateAssignmentBody = assignmentFields.safeExtend({ version: z.number().int().min(1) });
export type CreateAssignmentBody = z.infer<typeof createAssignmentBody>;
export type UpdateAssignmentBody = z.infer<typeof updateAssignmentBody>;

export interface AssignmentInfo {
  id: string;
  courseId: string;
  courseName: string;
  title: string;
  instructions: string;
  questions: QuestionInfo[];
  links: LinkInfo[];
  dueDate: string | null;
  dueTime: string | null;
  dueAt: string | null;
  allowLate: boolean;
  /** The points of all questions together. */
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

/** What a student wrote for one question. Which part matters depends on the kind of question. */
export const answerItem = z.object({
  questionId: z.string().min(1).max(40),
  /** choice: the chosen answer (0 is the first). */
  choice: z.number().int().min(0).max(5).nullable().default(null),
  /** short and written: the text. speaking: an optional note. */
  text: z.string().max(10000, "This text is too long.").default(""),
  /** speaking: the link to the video. */
  link: httpsLink.nullable().default(null),
});
export const answerBody = z.object({ answers: z.array(answerItem).max(50).default([]) });
export type AnswerItem = z.infer<typeof answerItem>;
export type AnswerBody = z.infer<typeof answerBody>;

export type SubmissionStatus =
  "not_started" | "drafted" | "submitted" | "graded" | "returned" | "revision_requested";

export interface MyWorkItem {
  id: string;
  courseId: string;
  courseName: string;
  title: string;
  questionCount: number;
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
  /** Only when the work is scored (returned). */
  score: number | null;
}

/** A question as a student sees it. The correct answer is not in it. */
export interface MyQuestion {
  id: string;
  kind: QuestionKind;
  text: string;
  points: number;
  options: string[];
}

/** How one question went. Shown after the student handed in. */
export interface QuestionResult {
  questionId: string;
  /** true or false when the system scored it, null when the teacher scores it. */
  correct: boolean | null;
  /** The points. For a question the teacher scores, only when the work was returned. */
  awarded: number | null;
  /** The correct answer, for a question the system scored. */
  correctAnswer: string | null;
  /** The teacher's comment or correction on this question. Empty until the work is returned. */
  note: string;
}

export interface MyWorkDetail extends MyWorkItem {
  instructions: string;
  questions: MyQuestion[];
  links: LinkInfo[];
  /** What the student saved or handed in so far, one entry for each question. */
  answers: AnswerItem[];
  /** How it went, shown once the work is handed in. */
  results: {
    perQuestion: QuestionResult[];
    /** Points from the questions the system scored, and the most those could give. */
    autoAwarded: number;
    autoMax: number;
    /** How many questions the teacher still has to score. */
    waitingForTeacher: number;
  } | null;
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

const scoreValue = z
  .number("Please enter a score.")
  .min(0, "The score cannot be below 0.")
  .max(100, "This score is too high.")
  .refine((v) => Number.isInteger(v * 2), "Use whole numbers or halves, for example 7 or 7.5.");
const feedbackText = z.string().trim().max(5000, "This text is too long.");
const noteText = z.string().trim().max(2000, "This comment is too long.");

export const gradeBody = z.object({
  /** The points for each question (by question id). The ones the system scored can be left out. */
  points: z.record(z.string().max(40), scoreValue),
  feedback: feedbackText.default(""),
  /** A comment or correction for each question (by question id). It replaces the saved ones; empty ones are dropped. */
  notes: z.record(z.string().max(40), noteText).default({}),
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
  answers: AnswerItem[];
  /** The points of each question so far: from the system for the questions it scored, from the teacher for the rest. */
  points: Record<string, number>;
  /** Which questions the system scored (and how it went). */
  perQuestion: { questionId: string; auto: boolean; correct: boolean | null }[];
  score: number | null;
  feedback: string;
  /** The teacher's comment or correction on each question (by question id). */
  notes: Record<string, string>;
  version: number;
  history: {
    at: string;
    by: string;
    oldScore: number | null;
    newScore: number | null;
    feedback: string;
    /** The feedback for the whole work was changed in this step. */
    feedbackChanged: boolean;
    /** A comment on a question was changed in this step. */
    notesChanged: boolean;
  }[];
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

// --------------------------------------------------------- fee receipts (invoices, M4)

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

/** A month, like "2026-09". */
export const period = z.string().regex(/^(20\d{2})-(0[1-9]|1[0-2])$/, "Please choose a month.");

const paymentText = (max: number) => z.string().trim().max(max, "This text is too long.").default("");
/** How students pay the teacher. All of it is optional: some teachers take cash. */
export const paymentDetailsBody = z.object({
  payeeName: paymentText(100),
  payeePhone: paymentText(30),
  bankName: paymentText(100),
  /** The 6 digit number of the bank (see VN_BANKS). With the account number it makes the payment QR. Empty: no QR. */
  bankBin: z
    .string()
    .trim()
    .refine((v) => v === "" || isBin(v), "The bank number has 6 digits.")
    .default(""),
  bankAccount: paymentText(50),
  bankHolder: paymentText(100),
  paymentNote: paymentText(500),
});
export type PaymentDetailsBody = z.infer<typeof paymentDetailsBody>;
export type PaymentDetails = Required<PaymentDetailsBody>;

const lineFields = {
  /** The id of a line that already exists. Leave it out for a new line. */
  id: z.string().max(40).optional(),
  description: z.string().trim().min(1, "Please describe this line.").max(200, "This text is too long."),
  quantity: z
    .number("Please enter a number.")
    .int("Please enter a whole number.")
    .min(1, "Use at least 1.")
    .max(1000, "This is too many."),
  /** A minus number takes money off. */
  unitPrice: z
    .number("Please enter a number.")
    .int("Please enter a whole number.")
    .min(-1_000_000_000, "This price is too low.")
    .max(1_000_000_000, "This price is too high."),
  /** The course a line is for. Only for a line that is not made from lessons; the server checks that it is the teacher's. */
  courseId: z.string().min(1).max(40).nullable().optional(),
  /** A discount line. The server works out its amount from the other lines, so the price sent here is not used. */
  discount: z
    .object({
      type: z.enum(["percent", "fixed"]),
      value: z
        .number("Please enter a number.")
        .int("Please enter a whole number.")
        .min(1, "Use at least 1.")
        .max(1_000_000_000, "This is too much."),
    })
    .refine((d) => d.type !== "percent" || d.value <= 100, {
      message: "A percentage cannot be more than 100.",
      path: ["value"],
    })
    .nullable()
    .optional(),
};
export const invoiceLineInput = z.object(lineFields);
export type InvoiceDiscount = { type: "percent" | "fixed"; value: number };
export const LIMITS_INVOICE = { maxLines: 30, maxLessons: 200 } as const;

const lessonIds = z
  .array(z.string().min(1).max(64))
  .max(LIMITS_INVOICE.maxLessons, "There are too many lessons.");

/**
 * A receipt for the lessons the teacher picked. The month it is filed under comes from the latest lesson.
 * With no lessons, the teacher must say the month (an empty receipt to fill in by hand).
 */
export const createInvoiceBody = z
  .object({
    studentId: z.string().min(1).max(40),
    lessonIds: lessonIds.default([]),
    period: period.optional(),
  })
  .refine((v) => v.lessonIds.length > 0 || v.period !== undefined, {
    message: "Please choose at least one lesson.",
    path: ["lessonIds"],
  });
/** Which lessons a draft is made from. It replaces the lines that came from lessons and keeps the lines added by hand. */
export const setInvoiceLessonsBody = z.object({ lessonIds, version: z.number().int().min(1) });
export const generateInvoicesBody = z.object({ period });
export const updateInvoiceBody = z.object({
  lines: z.array(invoiceLineInput).max(LIMITS_INVOICE.maxLines, "There are too many lines."),
  note: z.string().trim().max(2000, "This text is too long.").default(""),
  dueDate: isoDate.nullable().default(null),
  version: z.number().int().min(1),
});
export const invoiceVersionBody = z.object({ version: z.number().int().min(1) });
export const voidInvoiceBody = z.object({
  reason: z
    .string()
    .trim()
    .min(1, "Please write why you cancel this receipt.")
    .max(500, "This text is too long."),
  version: z.number().int().min(1),
});

export type CreateInvoiceBody = z.input<typeof createInvoiceBody>;
export type UpdateInvoiceBody = z.infer<typeof updateInvoiceBody>;

export interface InvoiceLine {
  id: string;
  /** The course a line was made from. null for a line the teacher added. */
  courseId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  /** quantity x unitPrice. Worked out by the server. */
  amount: number;
  /** The days of the lessons behind this line, in the teacher's time zone. Empty for a line the teacher added. */
  dates: string[];
  /** Set for a discount line: the amount is worked out from the other lines. */
  discount: InvoiceDiscount | null;
}

export interface InvoiceInfo {
  id: string;
  studentId: string;
  studentName: string;
  teacherName: string;
  period: string;
  /** null until the receipt is sent. */
  number: string | null;
  status: InvoiceStatus;
  lines: InvoiceLine[];
  total: number;
  note: string;
  dueDate: string | null;
  sentAt: string | null;
  paidAt: string | null;
  voidedAt: string | null;
  voidReason: string;
  version: number;
  /** Fixed once sent. For a draft it is what the teacher has now. */
  payee: PaymentDetails;
  /** The receipt was sent, then the attendance it was built from changed. */
  attendanceChanged: boolean;
}

export interface InvoiceListItem {
  id: string;
  studentId: string;
  studentName: string;
  period: string;
  number: string | null;
  status: InvoiceStatus;
  total: number;
  sentAt: string | null;
  paidAt: string | null;
  version: number;
}

export interface InvoiceListResult {
  period: string;
  invoices: InvoiceListItem[];
  /** Receipts of this month that were cancelled. */
  cancelled: InvoiceListItem[];
  /** Students who attended lessons this month and have no receipt yet. */
  missing: number;
}

/** What a student sees: only receipts that were sent. */
export type MyInvoiceItem = Omit<InvoiceListItem, "version"> & { teacherName: string };
export type MyInvoiceDetail = Omit<InvoiceInfo, "attendanceChanged">;

/** A student who has attended lessons that are not on any receipt yet. */
export interface UnbilledStudent {
  studentId: string;
  name: string;
  lessons: number;
  /** What those lessons cost. */
  amount: number;
}

/** A lesson a student attended. `inThisReceipt` is true when the draft being changed already has it. */
export interface UnbilledLesson {
  lessonId: string;
  courseId: string;
  courseName: string;
  title: string;
  /** In the teacher's time zone. */
  date: string;
  startTime: string;
  price: number;
  inThisReceipt: boolean;
}

/** What needs the teacher's attention about receipts, for the start page. */
export interface InvoiceSummary {
  /** Students with attended lessons that are on no receipt yet. */
  toCharge: number;
  /** Drafts that were not sent yet. */
  drafts: number;
  /** Receipts that were sent and are not paid yet, and what they add up to. */
  unpaid: number;
  unpaidAmount: number;
}

// ------------------------------------------------------------- notifications (M5)

export interface NotificationItem {
  id: string;
  kind: string;
  title: string;
  body: string;
  /** A path inside the app. */
  link: string;
  at: string;
  read: boolean;
}

export interface NotificationList {
  items: NotificationItem[];
  unread: number;
}

export const markReadBody = z.object({
  /** Leave out to mark everything as read. */
  ids: z.array(z.string().min(1).max(64)).max(100).optional(),
});
