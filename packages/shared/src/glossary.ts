/**
 * Plain English glossary (level A2-B1). Every screen, email and error uses
 * these words so the product sounds the same everywhere.
 * Rule: short words, clear verbs, no school-system jargon.
 */
export const GLOSSARY = {
  course: "Course",
  student: "Student",
  students: "Students",
  enrollment: "Joined students",
  lesson: "Lesson",
  attendance: "Attendance",
  attended: "Attended",
  absent: "Absent",
  assignment: "Homework",
  submission: "Work turned in",
  turnIn: "Turn in",
  dueDate: "Due date",
  grade: "Score",
  returnWork: "Send back to student",
  requestRedo: "Ask to do again",
  comment: "Note",
  privateNote: "Private note (only you can see this)",
  invoice: "Invoice",
  invoiceStatusDraft: "Not sent yet",
  invoiceStatusSent: "Sent",
  invoiceStatusPaid: "Paid",
  invoiceStatusVoid: "Cancelled",
  material: "Course files",
  feedback: "Feedback",
  invite: "Invite",
  signIn: "Sign in",
  signOut: "Sign out",
} as const;

export type GlossaryKey = keyof typeof GLOSSARY;
