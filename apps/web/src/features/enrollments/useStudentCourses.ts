import type { CourseInfo, EnrollResult, StudentCourseInfo } from "@lms/shared";
import { computed, onMounted, ref } from "vue";
import { api } from "@/api/client";

/** The courses of one student, and adding the student to another course. */
export function useStudentCourses(studentId: string) {
  const courses = ref<StudentCourseInfo[]>([]);
  const allCourses = ref<CourseInfo[]>([]);
  const chosen = ref("");
  const loading = ref(true);
  const busy = ref(false);
  const error = ref<string | null>(null);
  const result = ref<EnrollResult | null>(null);

  async function load() {
    try {
      const [mine, all] = await Promise.all([
        api<{ courses: StudentCourseInfo[] }>(`/students/${studentId}/courses`),
        api<{ courses: CourseInfo[] }>("/courses"),
      ]);
      courses.value = mine.courses;
      allCourses.value = all.courses;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Something went wrong. Please try again.";
    } finally {
      loading.value = false;
    }
  }

  /** Courses the student is not taking now. */
  const available = computed(() =>
    allCourses.value.filter((c) => !courses.value.some((m) => m.courseId === c.id && m.status === "active")),
  );

  async function add() {
    if (!chosen.value || busy.value) return;
    busy.value = true;
    error.value = null;
    try {
      result.value = await api<EnrollResult>(`/courses/${chosen.value}/students`, {
        method: "POST",
        body: { studentIds: [studentId], customPrice: null },
      });
      chosen.value = "";
      await load();
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Something went wrong. Please try again.";
    } finally {
      busy.value = false;
    }
  }

  onMounted(load);
  return { courses, available, chosen, loading, busy, error, result, add };
}
