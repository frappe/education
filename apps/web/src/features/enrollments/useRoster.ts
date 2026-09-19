import type { EnrollResult, EnrollmentInfo, StudentInfo } from "@lms/shared";
import { computed, onMounted, ref, watch } from "vue";
import { api } from "@/api/client";

/** The students of one course, and the actions on them. Logic only, no visual parts. */
export function useRoster(courseId: string, onChanged: () => void) {
  const students = ref<EnrollmentInfo[]>([]);
  const loading = ref(true);
  const error = ref<string | null>(null);

  async function load() {
    try {
      students.value = (await api<{ students: EnrollmentInfo[] }>(`/courses/${courseId}/students`)).students;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Something went wrong. Please try again.";
    } finally {
      loading.value = false;
    }
  }

  async function act(run: () => Promise<unknown>) {
    error.value = null;
    try {
      await run();
      await load();
      onChanged();
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Something went wrong. Please try again.";
    }
  }

  const setStatus = (
    studentId: string,
    status: "active" | "completed" | "dropped",
    customPrice: number | null,
  ) =>
    act(() =>
      api(`/courses/${courseId}/students/${studentId}`, { method: "PUT", body: { status, customPrice } }),
    );

  const activeCount = computed(
    () => students.value.filter((s) => s.status === "active" && !s.studentArchived).length,
  );
  onMounted(load);
  return { students, loading, error, load, setStatus, activeCount, act };
}

/** Choose students of the teacher who are not in the course yet, and add them together. */
export function useAddStudents(courseId: string, roster: () => EnrollmentInfo[], onDone: () => void) {
  const search = ref("");
  const candidates = ref<StudentInfo[]>([]);
  const selected = ref<Set<string>>(new Set());
  const price = ref("");
  const busy = ref(false);
  const error = ref<string | null>(null);
  const lastResult = ref<EnrollResult | null>(null);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let latest = 0;

  const inCourse = (id: string) => roster().some((r) => r.studentId === id && r.status === "active");
  const shown = computed(() => candidates.value.filter((s) => !inCourse(s.id)));

  async function load() {
    const mine = ++latest;
    const q = new URLSearchParams();
    if (search.value.trim()) q.set("search", search.value.trim());
    try {
      const res = await api<{ students: StudentInfo[] }>(`/students?${q}`);
      if (mine === latest) candidates.value = res.students;
    } catch (err) {
      if (mine === latest)
        error.value = err instanceof Error ? err.message : "Something went wrong. Please try again.";
    }
  }

  watch(search, () => {
    clearTimeout(timer);
    timer = setTimeout(() => void load(), 300);
  });
  onMounted(load);

  function toggle(id: string) {
    const next = new Set(selected.value);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    selected.value = next;
  }
  const selectAllShown = () => (selected.value = new Set(shown.value.map((s) => s.id)));

  async function add() {
    if (busy.value || selected.value.size === 0) return;
    const priceText = price.value.trim();
    if (priceText !== "" && !/^\d+$/.test(priceText)) {
      error.value = "Please enter the price as a whole number, for example 150000.";
      return;
    }
    busy.value = true;
    error.value = null;
    try {
      lastResult.value = await api<EnrollResult>(`/courses/${courseId}/students`, {
        method: "POST",
        body: { studentIds: [...selected.value], customPrice: priceText === "" ? null : Number(priceText) },
      });
      selected.value = new Set();
      await load();
      onDone();
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Something went wrong. Please try again.";
    } finally {
      busy.value = false;
    }
  }

  return { search, shown, selected, price, busy, error, lastResult, toggle, selectAllShown, add };
}
