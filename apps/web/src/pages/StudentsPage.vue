<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { fill } from "@/features/text";
import { useStudentList } from "@/features/students/useStudents";
import { messages } from "@/messages";
import AppAlert from "@/ui/AppAlert.vue";
import AppButton from "@/ui/AppButton.vue";
import AppCheckbox from "@/ui/AppCheckbox.vue";
import AppInput from "@/ui/AppInput.vue";
import AppLink from "@/ui/AppLink.vue";
import AppPage from "@/ui/AppPage.vue";

const t = messages.students;
const router = useRouter();
const { data, search, page, showArchived, loading, error, form } = useStudentList();

const pages = computed(() => Math.max(1, Math.ceil(data.value.total / data.value.pageSize)));
const accessText = { joined: t.joined, invited: t.invited, not_invited: t.notInvited } as const;
</script>

<template>
  <AppPage :title="t.title">
    <section class="flex flex-col gap-3">
      <h2 class="text-lg font-medium">{{ t.addTitle }}</h2>
      <form class="flex flex-col gap-3" novalidate @submit.prevent="form.submit">
        <AppAlert v-if="form.formError.value" kind="error">{{ form.formError.value }}</AppAlert>
        <AppInput v-model="form.values.name" :label="t.name" :error="form.errors.value.name" />
        <AppInput
          v-model="form.values.email"
          :label="t.email"
          type="email"
          :error="form.errors.value.email"
        />
        <AppInput v-model="form.values.phone" :label="t.phone" type="tel" :error="form.errors.value.phone" />
        <AppCheckbox v-model="form.values.invite" :label="t.inviteNow" />
        <div class="flex flex-wrap gap-3">
          <AppButton type="submit" :loading="form.submitting.value">{{ t.submit }}</AppButton>
          <AppButton variant="secondary" @click="router.push('/students/import')">{{ t.import }}</AppButton>
        </div>
      </form>
    </section>

    <section class="flex flex-col gap-3">
      <AppInput v-model="search" :label="t.search" />
      <AppCheckbox v-model="showArchived" :label="t.showArchived" />
      <AppAlert v-if="error" kind="error">{{ error }}</AppAlert>
      <p v-if="loading">{{ messages.common.loading }}</p>
      <p v-else-if="data.total === 0" class="text-[var(--color-text-muted)]">
        {{ search ? t.noMatch : t.empty }}
      </p>
      <template v-else>
        <p class="text-sm text-[var(--color-text-muted)]">{{ fill(t.total, { n: data.total }) }}</p>
        <ul class="flex flex-col gap-2">
          <li
            v-for="s in data.students"
            :key="s.id"
            class="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-control)] border border-[var(--color-border)] p-3"
          >
            <div>
              <AppLink :to="`/students/${s.id}`">{{ s.name }}</AppLink>
              <p class="text-sm text-[var(--color-text-muted)]">{{ s.email }}</p>
            </div>
            <span class="text-sm text-[var(--color-text-muted)]">{{
              s.archived ? t.archived : accessText[s.access]
            }}</span>
          </li>
        </ul>
        <div v-if="pages > 1" class="flex flex-wrap items-center gap-3">
          <AppButton variant="secondary" :disabled="page <= 1" @click="page--">{{ t.previous }}</AppButton>
          <span class="text-sm">{{ fill(t.pageOf, { page, pages }) }}</span>
          <AppButton variant="secondary" :disabled="page >= pages" @click="page++">{{ t.next }}</AppButton>
        </div>
      </template>
    </section>
    <AppLink to="/">{{ messages.common.back }}</AppLink>
  </AppPage>
</template>
