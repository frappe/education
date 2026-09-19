import type { MeResponse } from "@lms/shared";
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { ApiError, api } from "@/api/client";

/** Who is signed in. The server is the only source of truth; this is a copy for the screens. */
export const useSession = defineStore("session", () => {
  const me = ref<MeResponse | null>(null);
  const loaded = ref(false);

  async function load(force = false) {
    if (loaded.value && !force) return;
    try {
      me.value = await api<MeResponse>("/me");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) me.value = null;
      else throw err;
    }
    loaded.value = true;
  }

  async function signOut() {
    await api("/auth/sign-out", { method: "POST" });
    me.value = null;
  }

  const isTeacher = computed(() => me.value?.memberships.some((m) => m.role === "teacher") ?? false);

  return { me, loaded, load, signOut, isTeacher };
});
