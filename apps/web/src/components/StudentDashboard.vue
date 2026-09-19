<script setup lang="ts">
import WorkRow from "@/components/WorkRow.vue";
import { useSession } from "@/features/auth/session";
import { useMyHome } from "@/features/my/useMy";
import { fill } from "@/features/text";
import { messages } from "@/messages";
import AppAlert from "@/ui/AppAlert.vue";
import AppBadge from "@/ui/AppBadge.vue";
import AppCard from "@/ui/AppCard.vue";
import AppEmpty from "@/ui/AppEmpty.vue";
import AppIcon from "@/ui/AppIcon.vue";
import AppLoading from "@/ui/AppLoading.vue";
import AppPage from "@/ui/AppPage.vue";

const t = messages.my;
const session = useSession();
const { groups, courses, loading, error } = useMyHome();
const firstName = () => session.me?.user.name.split(" ")[0] ?? "";
const empty = () =>
  !loading.value &&
  !groups.value.again.length &&
  !groups.value.todo.length &&
  !groups.value.waiting.length &&
  !groups.value.done.length;
</script>

<template>
  <AppPage :title="fill(t.homeTitle, { name: firstName() })" :subtitle="t.homeText">
    <AppAlert v-if="error" kind="error">{{ error }}</AppAlert>
    <AppLoading v-if="loading" :label="messages.common.loading" />
    <AppCard v-else-if="empty()"
      ><AppEmpty icon="attendance" :title="t.nothing" :text="t.nothingText"
    /></AppCard>

    <template v-else>
      <AppCard v-if="groups.again.length" :title="t.again" flush>
        <ul class="divide-y divide-base-300">
          <li v-for="w in groups.again" :key="w.id"><WorkRow :item="w" show-course /></li>
        </ul>
      </AppCard>
      <AppCard v-if="groups.todo.length" :title="t.todo" flush>
        <ul class="divide-y divide-base-300">
          <li v-for="w in groups.todo" :key="w.id"><WorkRow :item="w" show-course /></li>
        </ul>
      </AppCard>
      <AppCard v-if="groups.waiting.length" :title="t.waiting" flush>
        <ul class="divide-y divide-base-300">
          <li v-for="w in groups.waiting" :key="w.id"><WorkRow :item="w" show-course /></li>
        </ul>
      </AppCard>
      <AppCard v-if="groups.done.length" :title="t.done" flush>
        <ul class="divide-y divide-base-300">
          <li v-for="w in groups.done" :key="w.id"><WorkRow :item="w" show-course /></li>
        </ul>
      </AppCard>
    </template>

    <AppCard v-if="!loading" :title="t.courses" flush>
      <template #actions>
        <RouterLink to="/my/courses" class="link link-primary text-sm">{{ t.coursesTitle }}</RouterLink>
      </template>
      <AppEmpty v-if="courses.length === 0" icon="book" :title="t.noCourses" :text="t.noCoursesText" />
      <ul v-else class="divide-y divide-base-300">
        <li v-for="c in courses" :key="c.id">
          <RouterLink
            :to="`/my/courses/${c.id}`"
            class="flex flex-wrap items-center gap-4 px-5 py-4 hover:bg-base-200/60"
          >
            <span class="grid size-11 shrink-0 place-items-center rounded-field bg-primary/10 text-primary"
              ><AppIcon name="book" :size="22"
            /></span>
            <span class="min-w-0 flex-1 basis-48">
              <span class="block truncate font-medium">{{ c.name }}</span>
              <span class="block truncate text-sm text-base-content/60">{{
                fill(t.teacher, { name: c.teacherName })
              }}</span>
            </span>
            <AppBadge v-if="c.openWork > 0" tone="warning">{{
              fill(t.openWork, { n: c.openWork })
            }}</AppBadge>
          </RouterLink>
        </li>
      </ul>
    </AppCard>
  </AppPage>
</template>
