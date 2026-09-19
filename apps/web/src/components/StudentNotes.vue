<script setup lang="ts">
import { useNotes } from "@/features/students/useNotes";
import { messages } from "@/messages";
import AppAlert from "@/ui/AppAlert.vue";
import AppAvatar from "@/ui/AppAvatar.vue";
import AppBadge from "@/ui/AppBadge.vue";
import AppButton from "@/ui/AppButton.vue";
import AppCard from "@/ui/AppCard.vue";
import AppEmpty from "@/ui/AppEmpty.vue";
import AppLoading from "@/ui/AppLoading.vue";
import AppSegmented from "@/ui/AppSegmented.vue";
import AppTextarea from "@/ui/AppTextarea.vue";

const props = defineProps<{ studentId: string; archived: boolean }>();
const t = messages.notes;
const { notes, loading, error, form, setVisibility } = useNotes(props.studentId, {
  added: t.added,
  changed: t.changed,
});

const options = [
  { value: "student_visible", label: t.studentCanSee, tone: "success" as const },
  { value: "private", label: t.private, tone: "neutral" as const },
];
const when = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
</script>

<template>
  <AppCard :title="t.title" :description="t.intro" flush>
    <form v-if="!archived" class="flex flex-col gap-3 p-5" novalidate @submit.prevent="form.submit">
      <AppAlert v-if="form.formError.value" kind="error">{{ form.formError.value }}</AppAlert>
      <AppTextarea v-model="form.values.body" :label="t.write" :rows="3" :error="form.errors.value.body" />
      <div class="flex flex-wrap items-center justify-between gap-3">
        <AppSegmented v-model="form.values.visibility" :options="options" :label="t.who" />
        <AppButton type="submit" :loading="form.submitting.value">{{ t.add }}</AppButton>
      </div>
    </form>
    <AppAlert v-if="error" kind="error" class="m-5">{{ error }}</AppAlert>
    <div v-if="loading" class="p-5"><AppLoading :label="messages.common.loading" :rows="2" /></div>
    <AppEmpty v-else-if="notes.length === 0" icon="note" :title="t.empty" :text="t.emptyText" />
    <ul v-else class="divide-y divide-base-300 border-t border-base-300">
      <li v-for="n in notes" :key="n.id" class="flex flex-col gap-2 px-5 py-4">
        <div class="flex flex-wrap items-center gap-2 text-sm">
          <AppAvatar :name="n.authorName" size="sm" />
          <span class="font-medium">{{ n.authorName }}</span>
          <span class="text-base-content/60">{{ when(n.createdAt) }}</span>
          <AppBadge :tone="n.visibility === 'private' ? 'neutral' : 'success'">{{
            n.visibility === "private" ? t.private : t.studentCanSee
          }}</AppBadge>
          <AppButton
            v-if="n.visibility === 'student_visible'"
            variant="ghost"
            compact
            @click="setVisibility(n.id, 'private')"
            >{{ t.makePrivate }}</AppButton
          >
        </div>
        <p class="whitespace-pre-wrap break-words">{{ n.body }}</p>
      </li>
    </ul>
  </AppCard>
</template>
