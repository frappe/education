import { createRouter, createWebHistory } from "vue-router";
import { decideRoute, type RouteRules } from "@/features/auth/guards";
import { useSession } from "@/features/auth/session";

declare module "vue-router" {
  interface RouteMeta extends RouteRules {}
}

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "home", component: () => import("@/pages/HomePage.vue") },
    { path: "/sign-up", component: () => import("@/pages/SignUpPage.vue"), meta: { guestOnly: true } },
    { path: "/sign-in", component: () => import("@/pages/SignInPage.vue"), meta: { guestOnly: true } },
    // Opened from an email. Public, and each one needs a button press to use the link.
    { path: "/verify-email", component: () => import("@/pages/VerifyEmailPage.vue") },
    { path: "/magic-link", component: () => import("@/pages/MagicLinkPage.vue") },
    { path: "/accept-invite", component: () => import("@/pages/AcceptInvitePage.vue") },
    { path: "/devices", component: () => import("@/pages/DevicesPage.vue"), meta: { requiresAuth: true } },
    { path: "/courses", component: () => import("@/pages/CoursesPage.vue"), meta: { requiresTeacher: true } },
    {
      path: "/courses/new",
      component: () => import("@/pages/CourseFormPage.vue"),
      meta: { requiresTeacher: true },
    },
    {
      path: "/courses/:id",
      component: () => import("@/pages/CourseFormPage.vue"),
      meta: { requiresTeacher: true },
    },
    {
      path: "/students",
      component: () => import("@/pages/StudentsPage.vue"),
      meta: { requiresTeacher: true },
    },
    {
      path: "/students/import",
      component: () => import("@/pages/StudentImportPage.vue"),
      meta: { requiresTeacher: true },
    },
    {
      path: "/students/:id",
      component: () => import("@/pages/StudentDetailPage.vue"),
      meta: { requiresTeacher: true },
    },
    {
      path: "/schedule",
      component: () => import("@/pages/SchedulePage.vue"),
      meta: { requiresTeacher: true },
    },
    {
      path: "/lessons/:id/attendance",
      component: () => import("@/pages/AttendancePage.vue"),
      meta: { requiresTeacher: true },
    },
    {
      path: "/courses/:courseId/homework/new",
      component: () => import("@/pages/AssignmentFormPage.vue"),
      meta: { requiresTeacher: true },
    },
    {
      path: "/assignments/:id",
      component: () => import("@/pages/AssignmentPage.vue"),
      meta: { requiresTeacher: true },
    },
    {
      path: "/assignments/:id/edit",
      component: () => import("@/pages/AssignmentFormPage.vue"),
      meta: { requiresTeacher: true },
    },
    {
      path: "/assignments/:id/students/:studentId",
      component: () => import("@/pages/GradingPage.vue"),
      meta: { requiresTeacher: true },
    },
    {
      path: "/notifications",
      component: () => import("@/pages/NotificationsPage.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/invoices",
      component: () => import("@/pages/InvoicesPage.vue"),
      meta: { requiresTeacher: true },
    },
    {
      path: "/invoices/new",
      component: () => import("@/pages/InvoiceNewPage.vue"),
      meta: { requiresTeacher: true },
    },
    {
      path: "/invoices/:id",
      component: () => import("@/pages/InvoicePage.vue"),
      meta: { requiresTeacher: true },
    },
    {
      path: "/my/invoices",
      component: () => import("@/pages/MyInvoicesPage.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/my/invoices/:id",
      component: () => import("@/pages/MyInvoicePage.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/my/courses",
      component: () => import("@/pages/MyCoursesPage.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/my/courses/:id",
      component: () => import("@/pages/MyCoursePage.vue"),
      meta: { requiresAuth: true },
    },
    { path: "/my/work/:id", component: () => import("@/pages/MyWorkPage.vue"), meta: { requiresAuth: true } },
    { path: "/dev/google", component: () => import("@/pages/DevGooglePage.vue") },
    { path: "/dev/outbox", component: () => import("@/pages/DevOutboxPage.vue") },
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
});

router.beforeEach(async (to) => {
  const session = useSession();
  await session.load();
  const decision = decideRoute(to.meta, session.me, to.fullPath);
  return decision === "ok" ? true : decision;
});
