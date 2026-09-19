import type { LessonInfo } from "@lms/shared";
import { computed, onMounted, ref, watch } from "vue";
import { api } from "@/api/client";
import { addDays, startOfWeek, today } from "@/features/format";

/** The lessons of one week, grouped by day (Monday to Sunday). Logic only. */
export function useSchedule() {
  const monday = ref(startOfWeek(today()));
  const lessons = ref<LessonInfo[]>([]);
  const loading = ref(true);
  const error = ref<string | null>(null);
  let latest = 0;

  async function load() {
    const mine = ++latest; // an older, slower answer must not replace a newer one
    loading.value = true;
    try {
      const res = await api<{ lessons: LessonInfo[] }>(
        `/lessons?from=${monday.value}&to=${addDays(monday.value, 6)}`,
      );
      if (mine === latest) {
        lessons.value = res.lessons;
        error.value = null;
      }
    } catch (err) {
      if (mine === latest)
        error.value = err instanceof Error ? err.message : "Something went wrong. Please try again.";
    } finally {
      if (mine === latest) loading.value = false;
    }
  }

  const days = computed(() =>
    Array.from({ length: 7 }, (_, i) => {
      const date = addDays(monday.value, i);
      return { date, isToday: date === today(), lessons: lessons.value.filter((l) => l.date === date) };
    }),
  );

  const next = () => (monday.value = addDays(monday.value, 7));
  const previous = () => (monday.value = addDays(monday.value, -7));
  const thisWeek = () => (monday.value = startOfWeek(today()));

  watch(monday, load);
  onMounted(load);
  return { monday, days, lessons, loading, error, next, previous, thisWeek };
}
