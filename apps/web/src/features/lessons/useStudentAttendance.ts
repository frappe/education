import type { StudentAttendanceInfo } from "@lms/shared";
import { onMounted, ref } from "vue";
import { api } from "@/api/client";

/** How often one student came to lessons. Logic only. */
export function useStudentAttendance(studentId: string) {
  const info = ref<StudentAttendanceInfo | null>(null);
  const loading = ref(true);
  const error = ref<string | null>(null);

  onMounted(async () => {
    try {
      info.value = (
        await api<{ attendance: StudentAttendanceInfo }>(`/students/${studentId}/attendance`)
      ).attendance;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Something went wrong. Please try again.";
    } finally {
      loading.value = false;
    }
  });
  return { info, loading, error };
}
