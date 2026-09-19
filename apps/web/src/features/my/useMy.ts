import type {
  AnswerBody,
  AnswerItem,
  MyCourseDetail,
  MyCourseInfo,
  MyWorkDetail,
  MyWorkItem,
} from "@lms/shared";
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { api } from "@/api/client";
import { groupWork } from "@/features/homework/dates";
import { messageOf, statusOf } from "@/features/errors";
import { useToast } from "@/features/toast/useToast";
import { createAutosave } from "./autosave";

/** What a student has to do, and their courses. Logic only. */
export function useMyHome() {
  const work = ref<MyWorkItem[]>([]);
  const courses = ref<MyCourseInfo[]>([]);
  const loading = ref(true);
  const error = ref<string | null>(null);
  onMounted(async () => {
    try {
      const [w, c] = await Promise.all([
        api<{ work: MyWorkItem[] }>("/my/work"),
        api<{ courses: MyCourseInfo[] }>("/my/courses"),
      ]);
      work.value = w.work;
      courses.value = c.courses;
    } catch (err) {
      error.value = messageOf(err);
    } finally {
      loading.value = false;
    }
  });
  const groups = computed(() => groupWork(work.value));
  return { work, courses, groups, loading, error };
}

export function useMyCourse(id: string) {
  const data = ref<MyCourseDetail | null>(null);
  const loading = ref(true);
  const notFound = ref(false);
  onMounted(async () => {
    try {
      data.value = await api<MyCourseDetail>(`/my/courses/${id}`);
    } catch (err) {
      if (statusOf(err) === 404) notFound.value = true;
    } finally {
      loading.value = false;
    }
  });
  const groups = computed(() => groupWork(data.value?.work ?? []));
  return { data, groups, loading, notFound };
}

/** One piece of work for a student: reading it, writing the answers (saved by themselves), handing in. Logic only. */
export function useMyWork(id: string, text: { handedIn: string }) {
  const toast = useToast();
  const work = ref<MyWorkDetail | null>(null);
  const loading = ref(true);
  const notFound = ref(false);
  const error = ref<string | null>(null);
  const submitting = ref(false);
  const saveState = ref<"idle" | "waiting" | "saving" | "saved" | "error">("idle");
  /** True right after the student handed in on this screen, so the confirmation can stand out. */
  const justHandedIn = ref(false);
  /** One entry for each question, in the order of the questions. */
  const answers = reactive<AnswerItem[]>([]);

  const body = (): AnswerBody => ({
    answers: answers.map((a) => ({
      questionId: a.questionId,
      choice: a.choice,
      text: a.text,
      link: a.link && a.link.trim() !== "" ? a.link.trim() : null,
    })),
  });

  function take(w: MyWorkDetail) {
    work.value = w;
    answers.splice(
      0,
      answers.length,
      ...w.questions.map((q) => ({
        ...(w.answers.find((a) => a.questionId === q.id) ?? {
          questionId: q.id,
          choice: null,
          text: "",
          link: null,
        }),
      })),
    );
  }

  const autosave = createAutosave({
    save: async () => {
      // Only the answers are sent. What comes back must not overwrite what the student is typing now.
      work.value = (
        await api<{ work: MyWorkDetail }>(`/my/work/${id}/draft`, { method: "PUT", body: body() })
      ).work;
    },
    onState: (s) => (saveState.value = s),
  });

  onMounted(async () => {
    try {
      take((await api<{ work: MyWorkDetail }>(`/my/work/${id}`)).work);
    } catch (err) {
      if (statusOf(err) === 404) notFound.value = true;
      else error.value = messageOf(err);
    } finally {
      loading.value = false;
    }
  });
  onBeforeUnmount(() => autosave.stop());

  /** Call after the student changes anything. */
  const changed = () => work.value?.canEdit && autosave.touch();
  const unsaved = computed(
    () => saveState.value === "waiting" || saveState.value === "saving" || saveState.value === "error",
  );

  async function handIn() {
    if (submitting.value || !work.value?.canEdit) return false;
    submitting.value = true;
    error.value = null;
    try {
      autosave.stop();
      take(
        (await api<{ work: MyWorkDetail }>(`/my/work/${id}/submit`, { method: "POST", body: body() })).work,
      );
      saveState.value = "idle";
      justHandedIn.value = true;
      toast.success(text.handedIn);
      return true;
    } catch (err) {
      error.value = messageOf(err);
      return false;
    } finally {
      submitting.value = false;
    }
  }

  return {
    work,
    answers,
    loading,
    notFound,
    error,
    submitting,
    saveState,
    unsaved,
    justHandedIn,
    changed,
    handIn,
  };
}
