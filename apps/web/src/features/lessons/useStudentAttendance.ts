import type { StudentAttendanceInfo } from "@lms/shared";
import { computed, onMounted, ref, watch } from "vue";
import { api } from "@/api/client";

/** How often one student came to lessons, one page of the marks at a time. Logic only. */
export function useStudentAttendance(studentId: string) {
  const info = ref<StudentAttendanceInfo | null>(null);
  const page = ref(1);
  const loading = ref(true);
  const error = ref<string | null>(null);
  let latest = 0;

  async function load() {
    const mine = ++latest; // an older, slower answer must not replace a newer one
    try {
      const res = (
        await api<{ attendance: StudentAttendanceInfo }>(
          `/students/${studentId}/attendance?page=${page.value}`,
        )
      ).attendance;
      if (mine === latest) {
        info.value = res;
        error.value = null;
      }
    } catch (err) {
      if (mine === latest)
        error.value = err instanceof Error ? err.message : "Something went wrong. Please try again.";
    } finally {
      if (mine === latest) loading.value = false;
    }
  }

  const pages = computed(() =>
    info.value ? Math.max(1, Math.ceil(info.value.total / info.value.pageSize)) : 1,
  );
  watch(page, load);
  onMounted(load);
  return { info, page, pages, loading, error };
}
