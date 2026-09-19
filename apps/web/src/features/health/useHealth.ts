import { ref } from "vue";
import { api } from "@/api/client";

/**
 * Feature logic only: state and rules, no visual components.
 * A new design can reuse this file as it is.
 */
export type HealthState = "checking" | "ok" | "problem";

interface HealthResponse {
  status: "ok" | "degraded";
}

export function useHealth() {
  const state = ref<HealthState>("checking");

  async function check() {
    state.value = "checking";
    try {
      const res = await api<HealthResponse>("/health");
      state.value = res.status === "ok" ? "ok" : "problem";
    } catch {
      state.value = "problem";
    }
  }

  return { state, check };
}
