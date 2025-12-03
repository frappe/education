export const APP_NAME = "Sanskar School ERP";

export const ROUTES = {
  LOGIN: "/login",
  DASHBOARD: "/dashboard",
  STUDENTS: "/students",
  STUDENT_PROFILE: "/students/:id",
  TEACHERS: "/teachers",
  TEACHER_PROFILE: "/teachers/:id",
  ATTENDANCE: "/attendance",
  EXAMS: "/exams",
  FEES: "/fees",
  SETTINGS: "/settings",
} as const;

export const STATUS = {
  PAID: "paid",
  PENDING: "pending",
  OVERDUE: "overdue",
  PRESENT: "present",
  ABSENT: "absent",
} as const;
