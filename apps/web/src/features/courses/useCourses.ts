import { createCourseBody, updateCourseBody, type CourseInfo } from "@lms/shared";
import { computed, onMounted, ref } from "vue";
import { api } from "@/api/client";
import { useForm } from "@/features/forms/useForm";
import { useQueryFlag } from "@/features/navigation/back";

export function useCourseList() {
  const courses = ref<CourseInfo[]>([]);
  const loading = ref(true);
  const showArchived = useQueryFlag("archived");
  const error = ref<string | null>(null);

  async function load() {
    try {
      courses.value = (
        await api<{ courses: CourseInfo[] }>(`/courses${showArchived.value ? "?archived=1" : ""}`)
      ).courses;
      error.value = null;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Something went wrong. Please try again.";
    } finally {
      loading.value = false;
    }
  }

  onMounted(load);
  return { courses, loading, showArchived, error, load };
}

/** What is typed in the course form. Text boxes give text, so numbers are kept as text until sent. */
interface CourseFormValues extends Record<string, unknown> {
  name: string;
  description: string;
  pricePerLesson: string;
  startDate: string;
  endDate: string;
  maxStudents: string;
  active: boolean;
}

const num = (v: string): number | undefined => (v.trim() === "" ? undefined : Number(v));

const payloadOf = (v: CourseFormValues) => ({
  name: v.name,
  description: v.description,
  pricePerLesson: num(v.pricePerLesson),
  startDate: v.startDate || null,
  endDate: v.endDate || null,
  maxStudents: num(v.maxStudents) ?? null,
});

/** Create a course, or edit one when `id` is given. */
export function useCourseForm(id: string | undefined, onSaved: (course: CourseInfo) => void) {
  const course = ref<CourseInfo | null>(null);
  const loading = ref(Boolean(id));
  const notFound = ref(false);

  // Editing sends the version the person was looking at, so a save made from an old page is refused.
  const payload = (v: CourseFormValues) =>
    course.value
      ? { ...payloadOf(v), version: course.value.version, status: v.active ? "active" : "draft" }
      : payloadOf(v);

  const form = useForm<CourseFormValues>(
    {
      name: "",
      description: "",
      pricePerLesson: "",
      startDate: "",
      endDate: "",
      maxStudents: "",
      active: false,
    },
    {
      schema: () => (course.value ? updateCourseBody : createCourseBody),
      toPayload: payload,
      submit: async (v) => {
        if (course.value) {
          const res = await api<{ course: CourseInfo }>(`/courses/${course.value.id}`, {
            method: "PUT",
            body: payload(v),
          });
          fill(res.course);
          onSaved(res.course);
        } else {
          const res = await api<{ course: CourseInfo }>("/courses", { method: "POST", body: payload(v) });
          onSaved(res.course);
        }
      },
    },
  );

  function fill(c: CourseInfo) {
    course.value = c;
    form.values.name = c.name;
    form.values.description = c.description;
    form.values.pricePerLesson = String(c.pricePerLesson);
    form.values.startDate = c.startDate ?? "";
    form.values.endDate = c.endDate ?? "";
    form.values.maxStudents = c.maxStudents === null ? "" : String(c.maxStudents);
    form.values.active = c.status === "active";
  }

  async function load() {
    if (!id) return;
    try {
      fill((await api<{ course: CourseInfo }>(`/courses/${id}`)).course);
    } catch {
      notFound.value = true;
    } finally {
      loading.value = false;
    }
  }

  async function setArchived(archived: boolean) {
    if (!course.value) return;
    const res = await api<{ course: CourseInfo }>(
      `/courses/${course.value.id}/${archived ? "archive" : "restore"}`,
      {
        method: "POST",
        body: {},
      },
    );
    fill(res.course);
  }

  /**
   * Refreshes only the number of students (for example after students were added).
   * The version stays as the person opened it, so a save is still refused if someone else changed the course.
   */
  async function reload() {
    if (!course.value) return;
    const fresh = (await api<{ course: CourseInfo }>(`/courses/${course.value.id}`)).course;
    if (course.value) course.value = { ...course.value, enrolledCount: fresh.enrolledCount };
  }

  const archived = computed(() => course.value?.status === "archived");
  onMounted(load);
  return { form, course, loading, notFound, archived, setArchived, reload };
}
