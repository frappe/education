import { defineStore } from "pinia";
import { ref } from "vue";

export interface ToastItem {
  id: number;
  kind: "success" | "error" | "info";
  text: string;
}

/** Short messages such as "Saved." that go away by themselves. */
export const useToast = defineStore("toast", () => {
  const items = ref<ToastItem[]>([]);
  let next = 1;

  function push(kind: ToastItem["kind"], text: string, ms = 4000) {
    const id = next++;
    items.value.push({ id, kind, text });
    setTimeout(() => (items.value = items.value.filter((t) => t.id !== id)), ms);
  }

  return {
    items,
    success: (t: string) => push("success", t),
    error: (t: string) => push("error", t, 6000),
    info: (t: string) => push("info", t),
  };
});
