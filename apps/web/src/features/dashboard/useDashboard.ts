import type { CourseInfo, LessonInfo, QueueItem } from "@lms/shared";
import { onMounted, ref } from "vue";
import { api } from "@/api/client";
import { addDays, startOfWeek, today } from "@/features/format";

/** What the teacher sees first: how many courses and students, and the lessons of this week. Logic only. */
export function useDashboard() {
  const courses = ref<CourseInfo[]>([]);
  const studentTotal = ref(0);
  const week = ref<LessonInfo[]>([]);
  const queue = ref<QueueItem[]>([]);
  const loading = ref(true);
  const error = ref<string | null>(null);

  async function load() {
    const monday = startOfWeek(today());
    try {
      const [c, s, l, q] = await Promise.all([
        api<{ courses: CourseInfo[] }>("/courses"),
        api<{ total: number }>("/students?page=1"),
        api<{ lessons: LessonInfo[] }>(`/lessons?from=${monday}&to=${addDays(monday, 6)}`),
        api<{ queue: QueueItem[] }>("/grading/queue"),
      ]);
      queue.value = q.queue;
      courses.value = c.courses;
      studentTotal.value = s.total;
      week.value = l.lessons;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Something went wrong. Please try again.";
    } finally {
      loading.value = false;
    }
  }

  onMounted(load);
  return { courses, studentTotal, week, queue, loading, error };
}
