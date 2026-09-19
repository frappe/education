import { addNoteBody, type NoteInfo } from "@lms/shared";
import { onMounted, ref } from "vue";
import { api } from "@/api/client";
import { useForm } from "@/features/forms/useForm";
import { useToast } from "@/features/toast/useToast";

/** The notes a teacher wrote about one student. Logic only. */
export function useNotes(studentId: string, text: { added: string; changed: string }) {
  const toast = useToast();
  const notes = ref<NoteInfo[]>([]);
  const loading = ref(true);
  const error = ref<string | null>(null);

  onMounted(async () => {
    try {
      notes.value = (await api<{ notes: NoteInfo[] }>(`/students/${studentId}/notes`)).notes;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Something went wrong. Please try again.";
    } finally {
      loading.value = false;
    }
  });

  const form = useForm(
    { body: "", visibility: "student_visible" as "student_visible" | "private" },
    {
      schema: addNoteBody,
      submit: async (v) => {
        notes.value = (
          await api<{ notes: NoteInfo[] }>(`/students/${studentId}/notes`, { method: "POST", body: v })
        ).notes;
        form.values.body = "";
        toast.success(text.added);
      },
    },
  );

  async function setVisibility(id: string, visibility: "student_visible" | "private") {
    try {
      notes.value = (
        await api<{ notes: NoteInfo[] }>(`/students/${studentId}/notes/${id}`, {
          method: "PUT",
          body: { visibility },
        })
      ).notes;
      toast.success(text.changed);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  return { notes, loading, error, form, setVisibility };
}
