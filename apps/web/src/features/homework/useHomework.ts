import {
  createAssignmentBody,
  materialBody,
  updateAssignmentBody,
  type AssignmentInfo,
  type EnrollmentInfo,
  type GradeBody,
  type MaterialInfo,
  type QuestionKind,
  type SubmissionDetail,
  type SubmissionRow,
} from "@lms/shared";
import { computed, onMounted, reactive, ref, watch } from "vue";
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

/** One question as it is typed. Numbers are kept as text until they are sent. */
interface QuestionValues {
  id?: string;
  kind: QuestionKind;
  text: string;
  points: string;
  options: string[];
  correct: number | null;
  accepted: string[];
}
interface Values extends Record<string, unknown> {
  title: string;
  instructions: string;
  dueDate: string;
  dueTime: string;
  allowLate: boolean;
  targetMode: "all" | "selected";
  studentIds: string[];
  questions: QuestionValues[];
  links: { title: string; url: string }[];
}

/** A new empty question of this kind. Questions the teacher scores by hand start at 5 points, the others at 1. */
export const newQuestion = (kind: QuestionKind): QuestionValues => ({
  kind,
  text: "",
  points: kind === "written" || kind === "speaking" ? "5" : "1",
  options: kind === "choice" ? ["", ""] : [],
  correct: null,
  accepted: kind === "short" ? [""] : [],
});

const blank = (v: string) => v.trim() === "";

/** What is sent for one typed question. Empty answers are left out, and the correct answer follows its answer. */
export function questionPayload(q: QuestionValues) {
  const keep = q.options.map((o, i) => ({ o, i })).filter((x) => !blank(x.o));
  return {
    ...(q.id ? { id: q.id } : {}),
    kind: q.kind,
    text: q.text,
    points: blank(q.points) ? undefined : Number(q.points.replace(",", ".")),
    options: q.kind === "choice" ? keep.map((x) => x.o) : [],
    correct:
      q.kind === "choice" && q.correct !== null
        ? keep.findIndex((x) => x.i === q.correct) >= 0
          ? keep.findIndex((x) => x.i === q.correct)
          : null
        : null,
    accepted: q.kind === "short" ? q.accepted.filter((x) => !blank(x)) : [],
  };
}

/** The points of all questions together, for the number shown next to the questions. */
export const totalOf = (questions: QuestionValues[]): number =>
  questions.reduce((sum, q) => {
    const n = Number(q.points.replace(",", "."));
    return sum + (Number.isFinite(n) && n > 0 ? n : 0);
  }, 0);

/** Make or change one homework. Logic only. */
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
    title: v.title,
    instructions: v.instructions,
    questions: v.questions.map(questionPayload),
    links: v.links.filter((l) => l.title.trim() !== "" || l.url.trim() !== ""),
    // A day with no time means the usual time. No day means no due date at all.
    dueDate: v.dueDate || null,
    dueTime: v.dueDate ? v.dueTime || "18:00" : null,
    allowLate: v.allowLate,
    targetMode: v.targetMode,
    studentIds: v.targetMode === "selected" ? v.studentIds : [],
    ...(assignment.value ? { version: assignment.value.version } : {}),
  });

  const form = useForm<Values>(
    {
      title: "",
      instructions: "",
      dueDate: "",
      dueTime: "",
      allowLate: false,
      targetMode: "all",
      studentIds: [],
      questions: [newQuestion("written")],
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
          title: a.title,
          instructions: a.instructions,
          dueDate: a.dueDate ?? "",
          dueTime: a.dueTime ?? "",
          allowLate: a.allowLate,
          targetMode: a.targetMode,
          studentIds: [...a.studentIds],
          questions: a.questions.map((q) => ({
            id: q.id,
            kind: q.kind,
            text: q.text,
            points: String(q.points),
            options: [...q.options],
            correct: q.correct,
            accepted: q.kind === "short" && q.accepted.length === 0 ? [""] : [...q.accepted],
          })),
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

  const q = (i: number) => form.values.questions[i]!;
  const addQuestion = (kind: QuestionKind) => form.values.questions.push(newQuestion(kind));
  const removeQuestion = (i: number) => form.values.questions.splice(i, 1);
  /** Changing the kind clears what only belongs to the old kind. */
  function setKind(i: number, kind: QuestionKind) {
    const old = q(i);
    const fresh = newQuestion(kind);
    Object.assign(old, { kind, options: fresh.options, correct: null, accepted: fresh.accepted });
  }
  const addOption = (i: number) => q(i).options.length < 6 && q(i).options.push("");
  function removeOption(i: number, o: number) {
    const question = q(i);
    if (question.options.length <= 2) return;
    question.options.splice(o, 1);
    if (question.correct === o) question.correct = null;
    else if (question.correct !== null && question.correct > o) question.correct -= 1;
  }
  const setCorrect = (i: number, o: number | null) => (q(i).correct = o);
  const addAccepted = (i: number) => q(i).accepted.length < 10 && q(i).accepted.push("");
  const removeAccepted = (i: number, a: number) => q(i).accepted.splice(a, 1);
  const addLink = () => form.values.links.length < 10 && form.values.links.push({ title: "", url: "" });
  const removeLink = (i: number) => form.values.links.splice(i, 1);
  const toggleStudent = (sid: string) => {
    const list = form.values.studentIds;
    const at = list.indexOf(sid);
    if (at >= 0) list.splice(at, 1);
    else list.push(sid);
  };
  const total = computed(() => totalOf(form.values.questions));
  /** Students started: only the words of the questions can change. */
  const wordsOnly = computed(() => (assignment.value?.counts.handedIn ?? 0) > 0);

  return {
    form,
    assignment,
    loading,
    notFound,
    students,
    total,
    wordsOnly,
    addQuestion,
    removeQuestion,
    setKind,
    addOption,
    removeOption,
    setCorrect,
    addAccepted,
    removeAccepted,
    addLink,
    removeLink,
    toggleStudent,
  };
}

// ------------------------------------------------------- one piece of work

/** One piece of work, the answers of the students, and what the teacher does with them. Logic only. */
export function useAssignmentPage(
  id: string,
  text: {
    published: string;
    closed: string;
    time: string;
    timeRemoved: string;
    acceptDone: string;
    acceptDoneOne: string;
    acceptNone: string;
  },
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
  /** One more answer the system accepts for a short answer question. The handed in answers are scored again. */
  async function acceptAnswer(questionId: string, answer: string): Promise<boolean> {
    try {
      const res = await api<{ regraded: number }>(`/assignments/${id}/questions/${questionId}/accept`, {
        method: "POST",
        body: { answer },
      });
      await load();
      toast.success(
        res.regraded === 0
          ? text.acceptNone
          : res.regraded === 1
            ? text.acceptDoneOne
            : text.acceptDone.replace("{n}", String(res.regraded)),
      );
      return true;
    } catch (err) {
      toast.error(messageOf(err));
      return false;
    }
  }
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
  return { assignment, rows, loading, notFound, publish, close, giveTime, takeTime, acceptAnswer, remove };
}

// ---------------------------------------------------------------- grading

/** Scoring one answer, question by question. Logic only. */
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
  /** The points typed for each question (by question id). */
  const points = reactive<Record<string, string>>({});
  /** The comment or correction typed for each question (by question id). */
  const notes = reactive<Record<string, string>>({});
  const feedback = ref("");
  const base = `/assignments/${assignmentId}/submissions/${studentId}`;

  function take(d: SubmissionDetail) {
    detail.value = d;
    for (const key of Object.keys(points)) delete points[key];
    for (const q of d.assignment.questions)
      points[q.id] = d.points[q.id] === undefined ? "" : String(d.points[q.id]);
    for (const key of Object.keys(notes)) delete notes[key];
    for (const q of d.assignment.questions) notes[q.id] = d.notes[q.id] ?? "";
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

  const num = (v: string) => Number(v.replace(",", "."));
  const total = computed(() =>
    (detail.value?.assignment.questions ?? []).reduce(
      (sum, q) => sum + (points[q.id]?.trim() ? num(points[q.id]!) || 0 : 0),
      0,
    ),
  );
  /** The system scored this question, so its points are fixed. */
  const isAuto = (qid: string) => detail.value?.perQuestion.find((p) => p.questionId === qid)?.auto === true;
  /** Every question the teacher scores has points, so a score can be saved. */
  const complete = computed(() =>
    (detail.value?.assignment.questions ?? []).every(
      (q) => isAuto(q.id) || (points[q.id] ?? "").trim() !== "",
    ),
  );
  const save = () => {
    const given: Record<string, number> = {};
    for (const q of detail.value?.assignment.questions ?? [])
      if (!isAuto(q.id) && (points[q.id] ?? "").trim() !== "") given[q.id] = num(points[q.id]!);
    return run(
      "/grade",
      "PUT",
      {
        points: given,
        notes: { ...notes },
        feedback: feedback.value,
        version: detail.value!.version,
      } satisfies GradeBody,
      text.saved,
    );
  };
  const giveBack = () => run("/return", "POST", { version: detail.value!.version }, text.returned);
  const askAgain = (reason: string) =>
    run("/request-revision", "POST", { feedback: reason, version: detail.value!.version }, text.again);
  /** What is on screen is different from what is saved. */
  const dirty = computed(() => {
    const d = detail.value;
    if (!d) return false;
    if (feedback.value !== d.feedback) return true;
    return d.assignment.questions.some(
      (q) =>
        (points[q.id] ?? "") !== (d.points[q.id] === undefined ? "" : String(d.points[q.id])) ||
        (notes[q.id] ?? "").trim() !== (d.notes[q.id] ?? ""),
    );
  });
  return {
    detail,
    loading,
    notFound,
    busy,
    error,
    points,
    isAuto,
    notes,
    feedback,
    total,
    complete,
    save,
    giveBack,
    askAgain,
    dirty,
  };
}
