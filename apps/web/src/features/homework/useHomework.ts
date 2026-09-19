import {
  createAssignmentBody,
  materialBody,
  updateAssignmentBody,
  type AssignmentInfo,
  type EnrollmentInfo,
  type GradeBody,
  type MaterialInfo,
  type SubmissionDetail,
  type SubmissionRow,
} from "@lms/shared";
import { computed, onMounted, ref, watch } from "vue";
import { api } from "@/api/client";
import { messageOf, statusOf } from "@/features/errors";
import { useForm } from "@/features/forms/useForm";
import { useToast } from "@/features/toast/useToast";

/** The homework of one course. Logic only. */
export function useCourseHomework(courseId: string) {
  const items = ref<AssignmentInfo[]>([]);
  const loading = ref(true);
  const error = ref<string | null>(null);
  onMounted(async () => {
    try {
      items.value = (
        await api<{ assignments: AssignmentInfo[] }>(`/courses/${courseId}/assignments`)
      ).assignments;
    } catch (err) {
      error.value = messageOf(err);
    } finally {
      loading.value = false;
    }
  });
  return { items, loading, error };
}

/** The links a teacher shares with a course (no file uploads: only https links). */
export function useMaterials(courseId: string, text: { added: string; saved: string; removed: string }) {
  const toast = useToast();
  const items = ref<MaterialInfo[]>([]);
  const loading = ref(true);
  const error = ref<string | null>(null);
  const editing = ref<string | null>(null);

  onMounted(async () => {
    try {
      items.value = (await api<{ materials: MaterialInfo[] }>(`/courses/${courseId}/materials`)).materials;
    } catch (err) {
      error.value = messageOf(err);
    } finally {
      loading.value = false;
    }
  });

  const form = useForm(
    { title: "", url: "", published: true },
    {
      schema: materialBody,
      submit: async (v) => {
        const wasEditing = editing.value;
        const path = wasEditing
          ? `/courses/${courseId}/materials/${wasEditing}`
          : `/courses/${courseId}/materials`;
        items.value = (
          await api<{ materials: MaterialInfo[] }>(path, { method: wasEditing ? "PUT" : "POST", body: v })
        ).materials;
        toast.success(wasEditing ? text.saved : text.added);
        reset();
      },
    },
  );

  function reset() {
    editing.value = null;
    form.values.title = "";
    form.values.url = "";
    form.values.published = true;
  }
  function edit(m: MaterialInfo) {
    editing.value = m.id;
    form.values.title = m.title;
    form.values.url = m.url;
    form.values.published = m.published;
  }
  async function remove(id: string) {
    try {
      items.value = (
        await api<{ materials: MaterialInfo[] }>(`/courses/${courseId}/materials/${id}`, { method: "DELETE" })
      ).materials;
      toast.success(text.removed);
      if (editing.value === id) reset();
    } catch (err) {
      toast.error(messageOf(err));
    }
  }
  return { items, loading, error, form, editing, edit, remove, reset };
}

// ------------------------------------------------------------------ the form

type Kind = "essay" | "speaking" | "multiple_choice";
interface Values extends Record<string, unknown> {
  type: Kind;
  title: string;
  instructions: string;
  dueDate: string;
  dueTime: string;
  allowLate: boolean;
  maxScore: string;
  targetMode: "all" | "selected";
  studentIds: string[];
  questions: { text: string; options: string[] }[];
  links: { title: string; url: string }[];
}

const emptyQuestion = () => ({ text: "", options: ["", ""] });

/** Make or change one piece of work. Logic only. */
export function useAssignmentForm(
  courseId: string | undefined,
  id: string | undefined,
  onSaved: (a: AssignmentInfo) => void,
) {
  const assignment = ref<AssignmentInfo | null>(null);
  const loading = ref(Boolean(id));
  const notFound = ref(false);
  const students = ref<EnrollmentInfo[]>([]);
  const owner = ref<string | undefined>(courseId);

  const payload = (v: Values) => ({
    type: v.type,
    title: v.title,
    instructions: v.instructions,
    questions:
      v.type === "multiple_choice"
        ? v.questions.map((q) => ({ text: q.text, options: q.options.filter((o) => o.trim() !== "") }))
        : [],
    links: v.links.filter((l) => l.title.trim() !== "" || l.url.trim() !== ""),
    // A day with no time means the usual time. No day means no due date at all.
    dueDate: v.dueDate || null,
    dueTime: v.dueDate ? v.dueTime || "18:00" : null,
    allowLate: v.allowLate,
    maxScore: v.maxScore.trim() === "" ? undefined : Number(v.maxScore),
    targetMode: v.targetMode,
    studentIds: v.targetMode === "selected" ? v.studentIds : [],
    ...(assignment.value ? { version: assignment.value.version } : {}),
  });

  const form = useForm<Values>(
    {
      type: "essay",
      title: "",
      instructions: "",
      dueDate: "",
      dueTime: "",
      allowLate: false,
      maxScore: "10",
      targetMode: "all",
      studentIds: [],
      questions: [emptyQuestion()],
      links: [],
    },
    {
      schema: () => (assignment.value ? updateAssignmentBody : createAssignmentBody),
      toPayload: payload,
      submit: async (v) => {
        const res = assignment.value
          ? await api<{ assignment: AssignmentInfo }>(`/assignments/${assignment.value.id}`, {
              method: "PUT",
              body: payload(v),
            })
          : await api<{ assignment: AssignmentInfo }>(`/courses/${owner.value}/assignments`, {
              method: "POST",
              body: payload(v),
            });
        onSaved(res.assignment);
      },
    },
  );

  // Choosing a day fills in the usual time, so the person only has to choose the day.
  watch(
    () => form.values.dueDate,
    (day) => {
      if (day && !form.values.dueTime) form.values.dueTime = "18:00";
    },
  );

  async function loadStudents() {
    if (!owner.value) return;
    const all = (await api<{ students: EnrollmentInfo[] }>(`/courses/${owner.value}/students`)).students;
    students.value = all.filter((s) => s.status === "active" && !s.studentArchived);
  }

  onMounted(async () => {
    try {
      if (id) {
        const a = (await api<{ assignment: AssignmentInfo }>(`/assignments/${id}`)).assignment;
        assignment.value = a;
        owner.value = a.courseId;
        Object.assign(form.values, {
          type: a.type,
          title: a.title,
          instructions: a.instructions,
          dueDate: a.dueDate ?? "",
          dueTime: a.dueTime ?? "",
          allowLate: a.allowLate,
          maxScore: String(a.maxScore),
          targetMode: a.targetMode,
          studentIds: [...a.studentIds],
          questions: a.questions.length
            ? a.questions.map((q) => ({ text: q.text, options: [...q.options] }))
            : [emptyQuestion()],
          links: a.links.map((l) => ({ ...l })),
        });
      }
      await loadStudents();
    } catch (err) {
      if (statusOf(err) === 404) notFound.value = true;
    } finally {
      loading.value = false;
    }
  });

  const addQuestion = () => form.values.questions.push(emptyQuestion());
  const removeQuestion = (i: number) => form.values.questions.splice(i, 1);
  const addOption = (q: number) =>
    form.values.questions[q]!.options.length < 6 && form.values.questions[q]!.options.push("");
  const removeOption = (q: number, o: number) =>
    form.values.questions[q]!.options.length > 2 && form.values.questions[q]!.options.splice(o, 1);
  const addLink = () => form.values.links.length < 10 && form.values.links.push({ title: "", url: "" });
  const removeLink = (i: number) => form.values.links.splice(i, 1);
  const toggleStudent = (sid: string) => {
    const list = form.values.studentIds;
    const at = list.indexOf(sid);
    if (at >= 0) list.splice(at, 1);
    else list.push(sid);
  };
  /** The kind of work cannot change once it was published. */
  const kindLocked = computed(() => assignment.value !== null && assignment.value.status !== "draft");

  return {
    form,
    assignment,
    loading,
    notFound,
    students,
    kindLocked,
    addQuestion,
    removeQuestion,
    addOption,
    removeOption,
    addLink,
    removeLink,
    toggleStudent,
  };
}

// ------------------------------------------------------- one piece of work

/** One piece of work, the answers of the students, and what the teacher does with them. Logic only. */
export function useAssignmentPage(
  id: string,
  text: { published: string; closed: string; time: string; timeRemoved: string },
) {
  const toast = useToast();
  const assignment = ref<AssignmentInfo | null>(null);
  const rows = ref<SubmissionRow[]>([]);
  const loading = ref(true);
  const notFound = ref(false);

  async function load() {
    try {
      const [a, s] = await Promise.all([
        api<{ assignment: AssignmentInfo }>(`/assignments/${id}`),
        api<{ submissions: SubmissionRow[] }>(`/assignments/${id}/submissions`),
      ]);
      assignment.value = a.assignment;
      rows.value = s.submissions;
    } catch (err) {
      if (statusOf(err) === 404) notFound.value = true;
      else toast.error(messageOf(err));
    } finally {
      loading.value = false;
    }
  }

  async function act(run: () => Promise<unknown>, done: string) {
    try {
      await run();
      await load();
      toast.success(done);
    } catch (err) {
      toast.error(messageOf(err));
    }
  }
  const publish = () =>
    act(() => api(`/assignments/${id}/publish`, { method: "POST", body: {} }), text.published);
  const close = () => act(() => api(`/assignments/${id}/close`, { method: "POST", body: {} }), text.closed);
  const giveTime = (studentId: string, date: string, time: string) =>
    act(
      () => api(`/assignments/${id}/extensions/${studentId}`, { method: "PUT", body: { date, time } }),
      text.time,
    );
  const takeTime = (studentId: string) =>
    act(() => api(`/assignments/${id}/extensions/${studentId}`, { method: "DELETE" }), text.timeRemoved);
  async function remove(): Promise<boolean> {
    try {
      await api(`/assignments/${id}`, { method: "DELETE" });
      return true;
    } catch (err) {
      toast.error(messageOf(err));
      return false;
    }
  }

  onMounted(load);
  return { assignment, rows, loading, notFound, publish, close, giveTime, takeTime, remove };
}

// ---------------------------------------------------------------- grading

/** Scoring one answer. Logic only. */
export function useGrading(
  assignmentId: string,
  studentId: string,
  text: { saved: string; returned: string; again: string },
) {
  const toast = useToast();
  const detail = ref<SubmissionDetail | null>(null);
  const loading = ref(true);
  const notFound = ref(false);
  const busy = ref(false);
  const error = ref<string | null>(null);
  const score = ref("");
  const feedback = ref("");
  const base = `/assignments/${assignmentId}/submissions/${studentId}`;

  function take(d: SubmissionDetail) {
    detail.value = d;
    score.value = d.score === null ? "" : String(d.score);
    feedback.value = d.feedback;
  }

  onMounted(async () => {
    try {
      take((await api<{ submission: SubmissionDetail }>(base)).submission);
    } catch (err) {
      if (statusOf(err) === 404) notFound.value = true;
      else error.value = messageOf(err);
    } finally {
      loading.value = false;
    }
  });

  async function run(path: string, method: "PUT" | "POST", body: unknown, done: string) {
    if (busy.value) return;
    busy.value = true;
    error.value = null;
    try {
      take((await api<{ submission: SubmissionDetail }>(`${base}${path}`, { method, body })).submission);
      toast.success(done);
    } catch (err) {
      error.value = messageOf(err);
    } finally {
      busy.value = false;
    }
  }

  const number = () => (score.value.trim() === "" ? Number.NaN : Number(score.value.replace(",", ".")));
  const save = () =>
    run(
      "/grade",
      "PUT",
      { score: number(), feedback: feedback.value, version: detail.value!.version } satisfies GradeBody,
      text.saved,
    );
  const giveBack = () => run("/return", "POST", { version: detail.value!.version }, text.returned);
  const askAgain = (reason: string) =>
    run("/request-revision", "POST", { feedback: reason, version: detail.value!.version }, text.again);
  /** The score or feedback on screen is different from what is saved. */
  const dirty = computed(
    () =>
      detail.value !== null &&
      (score.value !== (detail.value.score === null ? "" : String(detail.value.score)) ||
        feedback.value !== detail.value.feedback),
  );
  return { detail, loading, notFound, busy, error, score, feedback, save, giveBack, askAgain, dirty };
}
