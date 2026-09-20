import { createCourseBody, updateCourseBody, type CourseInfo, type StudentInfo } from "@lms/shared";
import { computed, onMounted, ref } from "vue";
import { api } from "@/api/client";
import { useForm } from "@/features/forms/useForm";
import { useQueryRef } from "@/features/navigation/back";

export type CourseFilter = "" | CourseInfo["status"];
const RANK: Record<CourseInfo["status"], number> = { active: 0, draft: 1, archived: 2 };

/** The courses to show for a filter ("" is every status). Open ones first, archived ones last; each keeps its order. */
export function filterCourses(courses: CourseInfo[], filter: CourseFilter): CourseInfo[] {
  return courses
    .filter((c) => filter === "" || c.status === filter)
    .map((c, i) => ({ c, i }))
    .sort((x, y) => RANK[x.c.status] - RANK[y.c.status] || x.i - y.i)
    .map((x) => x.c);
}

export function useCourseList() {
  const courses = ref<CourseInfo[]>([]);
  const loading = ref(true);
  // The status filter stays in the address (?status=draft), so coming back to the list shows it as it was.
  const status = useQueryRef("status", "", (v) => v === "active" || v === "draft" || v === "archived");
  const shown = computed(() => filterCourses(courses.value, status.value as CourseFilter));
  const error = ref<string | null>(null);

  async function load() {
    try {
      courses.value = (await api<{ courses: CourseInfo[] }>("/courses?archived=1")).courses;
      error.value = null;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Something went wrong. Please try again.";
    } finally {
      loading.value = false;
    }
  }

  onMounted(load);
  return { courses, shown, loading, status, error, load };
}

/** What is typed in the course form. Text boxes give text, so numbers are kept as text until sent. */
interface CourseFormValues extends Record<string, unknown> {
  name: string;
  description: string;
  pricePerLesson: string;
  startDate: string;
  endDate: string;
  /** Open: students can join and lessons can be planned. Not open: a draft. */
  active: boolean;
}

const num = (v: string): number | undefined => (v.trim() === "" ? undefined : Number(v));

/** The number of places is not asked for in the form. A course that has one keeps it. */
const payloadOf = (v: CourseFormValues, maxStudents: number | null) => ({
  name: v.name,
  description: v.description,
  pricePerLesson: num(v.pricePerLesson),
  startDate: v.startDate || null,
  endDate: v.endDate || null,
  maxStudents,
  status: v.active ? "active" : "draft",
});

/** Create a course, or edit one when `id` is given. */
export function useCourseForm(
  id: string | undefined,
  /** `studentsFailed` is true when the course was made but the chosen students could not be added. */
  onSaved: (course: CourseInfo, studentsFailed: boolean) => void,
) {
  const course = ref<CourseInfo | null>(null);
  // For a new course: the teacher's students to choose from, and the ones chosen.
  const students = ref<{ id: string; name: string; email: string }[]>([]);
  const studentIds = ref<string[]>([]);
  const loading = ref(Boolean(id));
  const notFound = ref(false);

  // Editing sends the version the person was looking at, so a save made from an old page is refused.
  const payload = (v: CourseFormValues) =>
    course.value
      ? { ...payloadOf(v, course.value.maxStudents), version: course.value.version }
      : payloadOf(v, null);

  const form = useForm<CourseFormValues>(
    {
      name: "",
      description: "",
      pricePerLesson: "",
      startDate: "",
      endDate: "",
      // A new course is open from the start, unless the teacher unticks this.
      active: id === undefined,
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
          onSaved(res.course, false);
        } else {
          const res = await api<{ course: CourseInfo }>("/courses", { method: "POST", body: payload(v) });
          let failed = false;
          if (studentIds.value.length > 0) {
            try {
              await api(`/courses/${res.course.id}/students`, {
                method: "POST",
                body: { studentIds: studentIds.value, customPrice: null },
              });
            } catch {
              failed = true; // the course exists; the teacher can add the students on its page
            }
          }
          onSaved(res.course, failed);
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
    form.values.active = c.status === "active";
  }

  /** All the teacher's students (the list is read a page at a time), for the choice in a new course. */
  async function loadStudents() {
    try {
      for (let page = 1; page <= 10; page++) {
        const res = await api<{ students: StudentInfo[]; total: number }>(`/students?page=${page}`);
        students.value.push(...res.students.map((x) => ({ id: x.id, name: x.name, email: x.email })));
        if (students.value.length >= res.total || res.students.length === 0) break;
      }
    } catch {
      /* the course can still be made without students */
    }
  }

  async function load() {
    if (!id) {
      void loadStudents();
      return;
    }
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
  return { form, course, loading, notFound, archived, setArchived, reload, students, studentIds };
}
