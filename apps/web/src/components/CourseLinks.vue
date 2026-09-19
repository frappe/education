<script setup lang="ts">
import { hostOf } from "@/features/format";
import { useMaterials } from "@/features/homework/useHomework";
import { messages } from "@/messages";
import AppAlert from "@/ui/AppAlert.vue";
import AppBadge from "@/ui/AppBadge.vue";
import AppButton from "@/ui/AppButton.vue";
import AppCard from "@/ui/AppCard.vue";
import AppCheckbox from "@/ui/AppCheckbox.vue";
import AppEmpty from "@/ui/AppEmpty.vue";
import AppIcon from "@/ui/AppIcon.vue";
import AppInput from "@/ui/AppInput.vue";
import AppLoading from "@/ui/AppLoading.vue";

const props = defineProps<{ courseId: string }>();
const t = messages.links;
const m = useMaterials(props.courseId, { added: t.added, saved: t.saved, removed: t.removed });
</script>

<template>
  <div class="flex flex-col gap-6">
    <AppCard :title="m.editing.value ? t.editTitle : t.addTitle" :description="t.intro">
      <form class="grid gap-x-4 gap-y-3 md:grid-cols-2" novalidate @submit.prevent="m.form.submit">
        <AppAlert v-if="m.form.formError.value" kind="error" class="md:col-span-2">{{
          m.form.formError.value
        }}</AppAlert>
        <AppInput v-model="m.form.values.title" :label="t.name" :error="m.form.errors.value.title" />
        <AppInput
          v-model="m.form.values.url"
          :label="t.url"
          type="url"
          placeholder="https://"
          :hint="t.urlHint"
          :error="m.form.errors.value.url"
        />
        <div class="md:col-span-2"><AppCheckbox v-model="m.form.values.published" :label="t.shared" /></div>
        <div class="flex gap-2 md:col-span-2">
          <AppButton type="submit" :loading="m.form.submitting.value"
            ><AppIcon name="plus" :size="18" />{{ m.editing.value ? t.save : t.add }}</AppButton
          >
          <AppButton v-if="m.editing.value" variant="ghost" @click="m.reset">{{
            messages.common.cancel
          }}</AppButton>
        </div>
      </form>
    </AppCard>

    <AppCard :title="t.title" flush>
      <AppAlert v-if="m.error.value" kind="error" class="m-5">{{ m.error.value }}</AppAlert>
      <div v-if="m.loading.value" class="p-5"><AppLoading :label="messages.common.loading" :rows="2" /></div>
      <AppEmpty v-else-if="m.items.value.length === 0" icon="link" :title="t.empty" :text="t.emptyText" />
      <ul v-else class="divide-y divide-base-300">
        <li v-for="l in m.items.value" :key="l.id" class="flex flex-wrap items-center gap-3 px-5 py-3">
          <span
            class="grid size-10 shrink-0 place-items-center rounded-field bg-base-200 text-base-content/70"
          >
            <AppIcon name="link" :size="18" />
          </span>
          <div class="min-w-0 flex-1 basis-48">
            <a
              :href="l.url"
              target="_blank"
              rel="noopener noreferrer"
              class="link link-primary block truncate font-medium"
              >{{ l.title }}</a
            >
            <p class="truncate text-sm text-base-content/60">{{ hostOf(l.url) }}</p>
          </div>
          <AppBadge :tone="l.published ? 'success' : 'neutral'">{{
            l.published ? t.visible : t.hidden
          }}</AppBadge>
          <AppButton variant="ghost" compact @click="m.edit(l)">{{ t.edit }}</AppButton>
          <AppButton variant="ghost" compact @click="m.remove(l.id)">{{ t.remove }}</AppButton>
        </li>
      </ul>
    </AppCard>
  </div>
</template>
