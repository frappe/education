import { inviteStudentBody, type InviteInfo } from "@lms/shared";
import { onMounted, ref } from "vue";
import { api } from "@/api/client";
import { useForm } from "@/features/forms/useForm";

/** Teacher's list of invited students, and the actions on it. Logic only, no visual parts. */
export function useInvites(onInvited: () => void) {
  const invites = ref<InviteInfo[]>([]);
  const loading = ref(true);
  const actionError = ref<string | null>(null);

  async function load() {
    invites.value = (await api<{ invites: InviteInfo[] }>("/invites")).invites;
    loading.value = false;
  }

  const form = useForm(
    { name: "", email: "" },
    {
      schema: inviteStudentBody,
      submit: async (v) => {
        await api("/invites", { method: "POST", body: v });
        form.values.name = "";
        form.values.email = "";
        await load();
        onInvited();
      },
    },
  );

  async function act(run: () => Promise<unknown>) {
    actionError.value = null;
    try {
      await run();
      await load();
    } catch (err) {
      actionError.value = err instanceof Error ? err.message : "Something went wrong. Please try again.";
    }
  }

  const resend = (id: string) => act(() => api(`/invites/${id}/resend`, { method: "POST", body: {} }));
  const cancel = (id: string) => act(() => api(`/invites/${id}`, { method: "DELETE" }));

  onMounted(load);
  return { invites, loading, actionError, form, resend, cancel };
}
