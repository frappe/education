import { createLessonsBody, type LessonInfo, type LessonScope } from "@lms/shared";
import { computed, onMounted, ref } from "vue";
import { api } from "@/api/client";
import { addDays, today } from "@/features/format";
import { useForm } from "@/features/forms/useForm";
import { useToast } from "@/features/toast/useToast";

const num = (v: string): number | undefined => (v.trim() === "" ? undefined : Number(v));

/** Lessons that are still to come, then the ones that are over. Cancelled ones go to the end of their part. */
export function splitLessons(lessons: LessonInfo[], now: Date = new Date()) {
  const cutoff = now.toISOString();
  const upcoming = lessons.filter((l) => l.endsAt >= cutoff && l.status !== "held");
  const past = lessons.filter((l) => !(l.endsAt >= cutoff && l.status !== "held")).reverse();
  return { upcoming, past };
}

/** The lessons of one course, and making, cancelling and restoring them. Logic only. */
export function useCourseLessons(courseId: string, text: { added: (n: number) => string }) {
  const toast = useToast();
  const lessons = ref<LessonInfo[]>([]);
  const loading = ref(true);
  const error = ref<string | null>(null);

  async function load() {
    try {
      lessons.value = (await api<{ lessons: LessonInfo[] }>(`/courses/${courseId}/lessons`)).lessons;
      error.value = null;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Something went wrong. Please try again.";
    } finally {
      loading.value = false;
    }
  }

  const form = useForm(
    {
      title: "",
      date: today(),
      startTime: "18:00",
      durationMinutes: "90",
      place: "",
      onlineUrl: "",
      repeatWeeks: "1",
    },
    {
      schema: createLessonsBody,
      toPayload: (v) => ({
        title: v.title,
        date: v.date,
        startTime: v.startTime,
        durationMinutes: num(v.durationMinutes),
        place: v.place,
        onlineUrl: v.onlineUrl.trim() === "" ? null : v.onlineUrl,
        repeatWeeks: num(v.repeatWeeks),
      }),
      submit: async (v) => {
        const res = await api<{ lessons: LessonInfo[] }>(`/courses/${courseId}/lessons`, {
          method: "POST",
          body: {
            title: v.title,
            date: v.date,
            startTime: v.startTime,
            durationMinutes: num(v.durationMinutes),
            place: v.place,
            onlineUrl: v.onlineUrl.trim() === "" ? null : v.onlineUrl,
            repeatWeeks: num(v.repeatWeeks),
          },
        });
        // The next lesson of a weekly series is suggested for the week after the last one made.
        form.values.date = addDays(res.lessons.at(-1)?.date ?? v.date, 7);
        await load();
        toast.success(text.added(res.lessons.length));
      },
    },
  );

  async function act(run: () => Promise<string>) {
    try {
      const done = await run();
      await load();
      toast.success(done);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  /** `message` says what happened, given how many lessons were cancelled. */
  const cancel = (id: string, scope: LessonScope, message: (n: number) => string) =>
    act(async () => {
      const res = await api<{ lessons: LessonInfo[] }>(`/lessons/${id}/cancel`, {
        method: "POST",
        body: { scope },
      });
      return message(res.lessons.length);
    });
  const restore = (id: string, done: string) =>
    act(async () => {
      await api(`/lessons/${id}/restore`, { method: "POST", body: {} });
      return done;
    });

  const parts = computed(() => splitLessons(lessons.value));
  onMounted(load);
  return { lessons, loading, error, load, form, cancel, restore, parts };
}
