import {
  ATTENDANCE_STATUSES,
  type AttendanceEntry,
  type AttendanceSheet,
  type AttendanceStatus,
} from "@lms/shared";
import { computed, onMounted, ref } from "vue";
import { api } from "@/api/client";
import { useToast } from "@/features/toast/useToast";

/** Taking attendance for one lesson. Everyone starts as attended; the teacher changes the exceptions. */
export function useAttendance(lessonId: string) {
  const toast = useToast();
  const sheet = ref<AttendanceSheet | null>(null);
  /** What is chosen on screen. It can differ from what is saved until the teacher saves. */
  const choice = ref<Record<string, AttendanceStatus>>({});
  const loading = ref(true);
  const notFound = ref(false);
  const busy = ref(false);
  const error = ref<string | null>(null);

  function take(s: AttendanceSheet) {
    sheet.value = s;
    choice.value = Object.fromEntries(s.students.map((e) => [e.studentId, e.status]));
  }

  async function load() {
    try {
      take(await api<AttendanceSheet>(`/lessons/${lessonId}/attendance`));
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 404) notFound.value = true;
      else error.value = err instanceof Error ? err.message : "Something went wrong. Please try again.";
    } finally {
      loading.value = false;
    }
  }

  const students = computed<AttendanceEntry[]>(() => sheet.value?.students ?? []);
  const countOf = (status: AttendanceStatus) =>
    students.value.filter((s) => choice.value[s.studentId] === status).length;
  const attended = computed(() => countOf("attended"));
  const absent = computed(() => countOf("absent"));
  /** Something on screen is different from what is saved (or nothing is saved yet). */
  const dirty = computed(() =>
    students.value.some((s) => !s.saved || choice.value[s.studentId] !== s.status),
  );
  const isPast = computed(() =>
    sheet.value ? sheet.value.lesson.startsAt <= new Date().toISOString() : false,
  );
  const canSave = computed(
    () =>
      sheet.value !== null &&
      sheet.value.lesson.status !== "cancelled" &&
      isPast.value &&
      students.value.length > 0,
  );

  function setAll(status: AttendanceStatus) {
    for (const s of students.value) choice.value[s.studentId] = status;
  }

  async function save(done: string) {
    if (busy.value || !canSave.value) return;
    busy.value = true;
    error.value = null;
    try {
      take(
        await api<AttendanceSheet>(`/lessons/${lessonId}/attendance`, {
          method: "PUT",
          body: {
            records: students.value.map((s) => ({
              studentId: s.studentId,
              status: choice.value[s.studentId],
            })),
          },
        }),
      );
      toast.success(done);
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Something went wrong. Please try again.";
    } finally {
      busy.value = false;
    }
  }

  onMounted(load);
  return {
    sheet,
    choice,
    students,
    loading,
    notFound,
    busy,
    error,
    attended,
    absent,
    dirty,
    canSave,
    isPast,
    setAll,
    save,
    statuses: ATTENDANCE_STATUSES,
  };
}
