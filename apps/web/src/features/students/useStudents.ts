import {
  addStudentBody,
  importStudentsBody,
  updateStudentBody,
  type ImportResult,
  type StudentInfo,
} from "@lms/shared";
import type { CourseInfo, EnrollResult } from "@lms/shared";
import { computed, onMounted, ref, watch } from "vue";
import { api } from "@/api/client";
import { useForm } from "@/features/forms/useForm";
import { useQueryRef } from "@/features/navigation/back";
import { parseStudentCsv, type CsvStudent } from "./parseCsv";

/** The statuses a teacher can pick to filter the list. Empty means every status. */
export const STATUS_FILTERS = ["joined", "invited", "not_invited", "archived"] as const;

interface StudentPage {
  students: StudentInfo[];
  total: number;
  page: number;
  pageSize: number;
}

export function useStudentList() {
  const data = ref<StudentPage>({ students: [], total: 0, page: 1, pageSize: 50 });
  // The search and the status stay in the address, so coming back to the list shows it as it was.
  const search = useQueryRef("search", "");
  // The page stays in the address too (?page=3).
  const pageText = useQueryRef("page", "1", (v) => /^[1-9]\d{0,5}$/.test(v));
  const page = computed({
    get: () => Number(pageText.value),
    set: (v: number) => (pageText.value = String(v)),
  });
  // "" is every status, the archived ones too.
  const status = useQueryRef("status", "", (v) => (STATUS_FILTERS as readonly string[]).includes(v));
  const loading = ref(true);
  const error = ref<string | null>(null);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let latest = 0;

  async function load() {
    const mine = ++latest; // an older, slower answer must not replace a newer one
    const q = new URLSearchParams({ page: String(page.value) });
    if (search.value.trim()) q.set("search", search.value.trim());
    q.set("status", status.value === "" ? "all" : status.value);
    try {
      const res = await api<StudentPage>(`/students?${q}`);
      if (mine === latest) {
        data.value = res;
        error.value = null;
      }
    } catch (err) {
      if (mine === latest)
        error.value = err instanceof Error ? err.message : "Something went wrong. Please try again.";
    } finally {
      if (mine === latest) loading.value = false;
    }
  }

  // Search waits a moment after typing stops, and always starts again from page 1.
  watch(search, () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      page.value = 1;
      void load();
    }, 300);
  });
  // A new status starts again from page 1.
  watch(status, () => {
    page.value = 1;
    void load();
  });
  watch(page, () => void load());

  const courses = ref<CourseInfo[]>([]);
  /** Shown after adding a student to a course at the same time, when the course could not take them. */
  const notice = ref<string | null>(null);

  const form = useForm(
    { name: "", email: "", phone: "", invite: false, courseId: "" },
    {
      schema: addStudentBody,
      toPayload: (v) => ({
        name: v.name,
        email: v.email,
        phone: v.phone.trim() || undefined,
        invite: v.invite,
      }),
      submit: async (v) => {
        notice.value = null;
        const created = await api<{ student: StudentInfo }>("/students", {
          method: "POST",
          body: { name: v.name, email: v.email, phone: v.phone.trim() || undefined, invite: v.invite },
        });
        if (v.courseId) {
          try {
            const res = await api<EnrollResult>(`/courses/${v.courseId}/students`, {
              method: "POST",
              body: { studentIds: [created.student.id], customPrice: null },
            });
            if (res.results[0]?.result !== "enrolled")
              notice.value =
                res.results[0]?.result === "full"
                  ? "This course is full."
                  : "The student could not join the course.";
          } catch (err) {
            notice.value = err instanceof Error ? err.message : "The student could not join the course.";
          }
        }
        form.values.name = "";
        form.values.email = "";
        form.values.phone = "";
        await load();
      },
    },
  );

  onMounted(async () => {
    await load();
    try {
      courses.value = (await api<{ courses: CourseInfo[] }>("/courses")).courses;
    } catch {
      courses.value = [];
    }
  });
  return { data, search, page, status, loading, error, form, load, courses, notice };
}

export function useStudentDetail(id: string) {
  const student = ref<StudentInfo | null>(null);
  const loading = ref(true);
  const notFound = ref(false);
  const saved = ref(false);

  const form = useForm(
    { name: "", phone: "", teacherNote: "" },
    {
      schema: () => updateStudentBody,
      toPayload: (v) => ({ ...v, version: student.value?.version ?? 1 }),
      submit: async (v) => {
        saved.value = false;
        const res = await api<{ student: StudentInfo }>(`/students/${id}`, {
          method: "PUT",
          body: { ...v, version: student.value?.version },
        });
        fill(res.student);
        saved.value = true;
      },
    },
  );

  function fill(s: StudentInfo) {
    student.value = s;
    form.values.name = s.name;
    form.values.phone = s.phone;
    form.values.teacherNote = s.teacherNote;
  }

  async function load() {
    try {
      fill((await api<{ student: StudentInfo }>(`/students/${id}`)).student);
    } catch {
      notFound.value = true;
    } finally {
      loading.value = false;
    }
  }

  async function setArchived(archived: boolean) {
    const res = await api<{ student: StudentInfo }>(`/students/${id}/${archived ? "archive" : "restore"}`, {
      method: "POST",
      body: {},
    });
    fill(res.student);
  }

  async function invite() {
    if (!student.value) return;
    await api("/invites", { method: "POST", body: { name: student.value.name, email: student.value.email } });
    await load();
  }

  onMounted(load);
  return { student, form, loading, notFound, saved, setArchived, invite };
}

export type ImportStep = "input" | "preview" | "done";

/** Import in three steps: give the list, check it, then create. Nothing is created before the person agrees. */
export function useCsvImport() {
  const text = ref("");
  const step = ref<ImportStep>("input");
  const rows = ref<CsvStudent[]>([]);
  const result = ref<ImportResult | null>(null);
  const problem = ref<"empty" | "no_email_column" | "too_many" | null>(null);
  const error = ref<string | null>(null);
  const busy = ref(false);

  async function readFile(file: File) {
    text.value = await file.text();
  }

  async function run(dryRun: boolean) {
    busy.value = true;
    error.value = null;
    try {
      const body = importStudentsBody.parse({ rows: rows.value, dryRun });
      result.value = await api<ImportResult>("/students/import", { method: "POST", body });
      step.value = dryRun ? "preview" : "done";
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Something went wrong. Please try again.";
    } finally {
      busy.value = false;
    }
  }

  async function check() {
    const parsed = parseStudentCsv(text.value);
    problem.value = parsed.problem ?? (parsed.rows.length > 200 ? "too_many" : null);
    if (problem.value) return;
    rows.value = parsed.rows;
    await run(true);
  }

  const confirm = () => run(false);
  function reset() {
    text.value = "";
    rows.value = [];
    result.value = null;
    problem.value = null;
    error.value = null;
    step.value = "input";
  }

  return { text, step, rows, result, problem, error, busy, readFile, check, confirm, reset };
}
