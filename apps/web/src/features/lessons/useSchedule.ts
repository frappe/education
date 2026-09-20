import type { ScheduleLesson } from "@lms/shared";
import { computed, onMounted, ref, watch } from "vue";
import { api } from "@/api/client";
import { addDays, startOfWeek, today } from "@/features/format";
import { useQueryRef } from "@/features/navigation/back";

/** A real date that is a Monday (the week in the address must be one). */
function isMonday(text: string): boolean {
  try {
    return /^\d{4}-\d{2}-\d{2}$/.test(text) && startOfWeek(text) === text;
  } catch {
    return false;
  }
}

/** The lessons of one week, grouped by day (Monday to Sunday). Logic only. */
export function useSchedule() {
  // The week stays in the address (?week=2026-09-14), so coming back from a lesson shows the same week.
  const monday = useQueryRef("week", startOfWeek(today()), isMonday);
  const lessons = ref<ScheduleLesson[]>([]);
  const loading = ref(true);
  const error = ref<string | null>(null);
  let latest = 0;

  async function load() {
    const mine = ++latest; // an older, slower answer must not replace a newer one
    loading.value = true;
    try {
      const res = await api<{ lessons: ScheduleLesson[] }>(
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

  /** Shows the week of a day (used after lessons are made). The list is read again even when it is the same week. */
  const goToWeekOf = (date: string) => {
    const week = startOfWeek(date);
    if (week === monday.value) void load();
    else monday.value = week;
  };

  watch(monday, load);
  onMounted(load);
  return { monday, days, lessons, loading, error, next, previous, thisWeek, goToWeekOf, load };
}
