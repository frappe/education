<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import CourseHomework from "@/components/CourseHomework.vue";
import CourseLessons from "@/components/CourseLessons.vue";
import CourseLinks from "@/components/CourseLinks.vue";
import CourseRoster from "@/components/CourseRoster.vue";
import { useCourseForm } from "@/features/courses/useCourses";
import { useToast } from "@/features/toast/useToast";
import { messages } from "@/messages";
import AppAlert from "@/ui/AppAlert.vue";
import AppBadge from "@/ui/AppBadge.vue";
import AppButton from "@/ui/AppButton.vue";
import AppCard from "@/ui/AppCard.vue";
import AppCheckbox from "@/ui/AppCheckbox.vue";
import AppIcon from "@/ui/AppIcon.vue";
import AppInput from "@/ui/AppInput.vue";
import AppLoading from "@/ui/AppLoading.vue";
import AppPage from "@/ui/AppPage.vue";
import AppTabs from "@/ui/AppTabs.vue";
import AppTextarea from "@/ui/AppTextarea.vue";

const t = messages.courseForm;
const route = useRoute();
const router = useRouter();
const toast = useToast();
const id = computed(() => (route.params.id ? String(route.params.id) : undefined));

const { form, course, loading, notFound, archived, setArchived, reload } = useCourseForm(id.value, (c) => {
  if (!id.value) {
    toast.success(t.created);
    void router.replace(`/courses/${c.id}`);
  } else toast.success(t.saved);
});

// The section that is open lives in the address (?tab=lessons), so a link can open it directly.
const tabs = [
  { key: "overview", label: t.tabOverview },
  { key: "students", label: t.tabStudents },
  { key: "lessons", label: t.tabLessons },
  { key: "homework", label: t.tabHomework },
  { key: "links", label: t.tabLinks },
];
const tab = ref(tabs.some((x) => x.key === route.query.tab) ? String(route.query.tab) : "overview");
watch(tab, (key) => void router.replace({ query: { ...route.query, tab: key } }));

const statusTone = { draft: "warning", active: "success", archived: "neutral" } as const;
const statusText = {
  draft: messages.courses.statusDraft,
  active: messages.courses.statusActive,
  archived: messages.courses.statusArchived,
} as const;
</script>

<template>
  <AppPage
    :title="course?.name ?? (id ? t.editTitle : t.newTitle)"
    :subtitle="id ? undefined : t.newText"
    back-to="/courses"
    :back-label="t.backToCourses"
  >
    <template v-if="course" #actions>
      <AppBadge :tone="statusTone[course.status]">{{ statusText[course.status] }}</AppBadge>
      <AppButton v-if="!archived" variant="secondary" compact @click="setArchived(true)"
        ><AppIcon name="archive" :size="16" />{{ t.archive }}</AppButton
      >
      <AppButton v-else variant="secondary" compact @click="setArchived(false)"
        ><AppIcon name="restore" :size="16" />{{ t.restore }}</AppButton
      >
    </template>

    <AppLoading v-if="loading" :label="messages.common.loading" />
    <AppAlert v-else-if="notFound" kind="error">{{ t.notFound }}</AppAlert>
    <template v-else>
      <AppTabs v-if="course && !archived" v-model="tab" :items="tabs" :label="t.tabsLabel" />

      <template v-if="!course || archived || tab === 'overview'">
        <AppAlert v-if="archived" kind="info">{{ t.archivedNote }}</AppAlert>
        <AppCard>
          <form class="grid gap-4 md:grid-cols-2" novalidate @submit.prevent="form.submit">
            <AppAlert v-if="form.formError.value" kind="error" class="md:col-span-2">{{
              form.formError.value
            }}</AppAlert>
            <div class="md:col-span-2">
              <AppInput v-model="form.values.name" :label="t.name" :error="form.errors.value.name" />
            </div>
            <div class="md:col-span-2">
              <AppTextarea
                v-model="form.values.description"
                :label="t.description"
                :error="form.errors.value.description"
              />
            </div>
            <AppInput
              v-model="form.values.pricePerLesson"
              :label="t.price"
              type="text"
              inputmode="numeric"
              :hint="t.priceHint"
              :error="form.errors.value.pricePerLesson"
            />
            <AppInput
              v-model="form.values.maxStudents"
              :label="t.max"
              type="text"
              inputmode="numeric"
              :error="form.errors.value.maxStudents"
            />
            <AppInput
              v-model="form.values.startDate"
              :label="t.start"
              type="date"
              :error="form.errors.value.startDate"
            />
            <AppInput
              v-model="form.values.endDate"
              :label="t.end"
              type="date"
              :error="form.errors.value.endDate"
            />
            <div v-if="course" class="md:col-span-2">
              <AppCheckbox v-model="form.values.active" :label="t.active" />
            </div>
            <div class="md:col-span-2">
              <AppButton type="submit" :loading="form.submitting.value" :disabled="archived">{{
                t.save
              }}</AppButton>
            </div>
          </form>
        </AppCard>
      </template>

      <CourseRoster
        v-else-if="course && tab === 'students'"
        :key="course.id"
        :course-id="course.id"
        :price-per-lesson="course.pricePerLesson"
        :max-students="course.maxStudents"
        @changed="reload"
      />
      <CourseLessons v-else-if="course && tab === 'lessons'" :key="`l-${course.id}`" :course-id="course.id" />
      <CourseHomework
        v-else-if="course && tab === 'homework'"
        :key="`h-${course.id}`"
        :course-id="course.id"
      />
      <CourseLinks v-else-if="course && tab === 'links'" :key="`k-${course.id}`" :course-id="course.id" />
    </template>
  </AppPage>
</template>
