<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { fill } from "@/features/text";
import { useStudentList } from "@/features/students/useStudents";
import { useToast } from "@/features/toast/useToast";
import { messages } from "@/messages";
import AppAlert from "@/ui/AppAlert.vue";
import AppAvatar from "@/ui/AppAvatar.vue";
import AppBadge from "@/ui/AppBadge.vue";
import AppButton from "@/ui/AppButton.vue";
import AppCard from "@/ui/AppCard.vue";
import AppCheckbox from "@/ui/AppCheckbox.vue";
import AppEmpty from "@/ui/AppEmpty.vue";
import AppIcon from "@/ui/AppIcon.vue";
import AppInput from "@/ui/AppInput.vue";
import AppLoading from "@/ui/AppLoading.vue";
import AppModal from "@/ui/AppModal.vue";
import AppPage from "@/ui/AppPage.vue";
import AppSelect from "@/ui/AppSelect.vue";

const t = messages.students;
const router = useRouter();
const toast = useToast();
const { data, search, page, status, loading, error, form, courses, notice } = useStudentList();
// True when a search or a status hides students, so an empty list is not the same as having none.
const filtered = computed(() => search.value.trim() !== "" || status.value !== "");
const statusOptions = [
  { value: "joined", label: t.joined },
  { value: "invited", label: t.invited },
  { value: "not_invited", label: t.notInvited },
  { value: "archived", label: t.archived },
];
const courseOptions = computed(() => courses.value.map((c) => ({ value: c.id, label: c.name })));

const adding = ref(false);
async function add() {
  await form.submit();
  const failed = form.formError.value || Object.keys(form.errors.value).length > 0;
  if (!failed) {
    adding.value = false;
    toast.success(t.added);
  }
}

const pages = computed(() => Math.max(1, Math.ceil(data.value.total / data.value.pageSize)));
const accessText = { joined: t.joined, invited: t.invited, not_invited: t.notInvited } as const;
const accessTone = { joined: "success", invited: "info", not_invited: "neutral" } as const;
</script>

<template>
  <AppPage :title="t.title" :subtitle="t.subtitle">
    <template #actions>
      <AppButton variant="secondary" @click="router.push('/students/import')"
        ><AppIcon name="upload" :size="18" />{{ t.import }}</AppButton
      >
      <AppButton @click="adding = true"><AppIcon name="user-plus" :size="18" />{{ t.addButton }}</AppButton>
    </template>

    <AppAlert v-if="notice" kind="info">{{ fill(t.addedButNotEnrolled, { reason: notice }) }}</AppAlert>
    <AppAlert v-if="error" kind="error">{{ error }}</AppAlert>

    <div class="flex flex-wrap items-end justify-between gap-3">
      <div class="w-full sm:max-w-xs">
        <AppInput v-model="search" :label="t.search" type="text" :placeholder="t.searchHint" />
      </div>
      <div class="w-full sm:w-56">
        <AppSelect
          v-model="status"
          :label="t.filterStatus"
          :options="statusOptions"
          :placeholder="t.allStatuses"
        />
      </div>
    </div>

    <AppLoading v-if="loading" :label="messages.common.loading" :rows="5" />
    <div v-else-if="data.total === 0" class="rounded-box border border-base-300 bg-base-100">
      <AppEmpty
        icon="users"
        :title="filtered ? t.noMatch : t.emptyTitle"
        :text="filtered ? undefined : t.empty"
      >
        <AppButton v-if="!filtered" @click="adding = true"
          ><AppIcon name="user-plus" :size="18" />{{ t.addButton }}</AppButton
        >
      </AppEmpty>
    </div>
    <AppCard v-else flush>
      <p class="border-b border-base-300 px-5 py-3 text-sm text-base-content/60">
        {{ fill(t.total, { n: data.total }) }}
      </p>
      <ul class="divide-y divide-base-300">
        <li v-for="s in data.students" :key="s.id">
          <RouterLink
            :to="`/students/${s.id}`"
            class="flex items-center gap-4 px-5 py-3 hover:bg-base-200/60"
          >
            <AppAvatar :name="s.name" />
            <span class="min-w-0 flex-1">
              <span class="block truncate font-medium">{{ s.name }}</span>
              <span class="block truncate text-sm text-base-content/60">{{ s.email }}</span>
            </span>
            <AppBadge :tone="s.archived ? 'neutral' : accessTone[s.access]">{{
              s.archived ? t.archived : accessText[s.access]
            }}</AppBadge>
            <AppIcon name="right" :size="18" class="text-base-content/40" />
          </RouterLink>
        </li>
      </ul>
      <div
        v-if="pages > 1"
        class="flex items-center justify-between gap-3 border-t border-base-300 px-5 py-3"
      >
        <AppButton variant="ghost" compact :disabled="page <= 1" @click="page--">{{ t.previous }}</AppButton>
        <span class="text-sm text-base-content/60">{{ fill(t.pageOf, { page, pages }) }}</span>
        <AppButton variant="ghost" compact :disabled="page >= pages" @click="page++">{{ t.next }}</AppButton>
      </div>
    </AppCard>

    <AppModal v-model="adding" :title="t.addTitle" :close-label="messages.common.close">
      <form id="add-student" class="flex flex-col gap-4" novalidate @submit.prevent="add">
        <AppAlert v-if="form.formError.value" kind="error">{{ form.formError.value }}</AppAlert>
        <AppInput v-model="form.values.name" :label="t.name" :error="form.errors.value.name" />
        <AppInput
          v-model="form.values.email"
          :label="t.email"
          type="email"
          :error="form.errors.value.email"
        />
        <AppInput v-model="form.values.phone" :label="t.phone" type="tel" :error="form.errors.value.phone" />
        <AppSelect
          v-if="courseOptions.length"
          v-model="form.values.courseId"
          :label="t.addToCourse"
          :options="courseOptions"
          :placeholder="t.noCourse"
        />
        <AppCheckbox v-model="form.values.invite" :label="t.inviteNow" />
      </form>
      <template #actions>
        <AppButton variant="ghost" @click="adding = false">{{ messages.common.cancel }}</AppButton>
        <AppButton type="submit" :loading="form.submitting.value" @click="add">{{ t.submit }}</AppButton>
      </template>
    </AppModal>
  </AppPage>
</template>
