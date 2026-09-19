<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useCourseForm } from "@/features/courses/useCourses";
import { messages } from "@/messages";
import AppAlert from "@/ui/AppAlert.vue";
import AppButton from "@/ui/AppButton.vue";
import AppCheckbox from "@/ui/AppCheckbox.vue";
import AppInput from "@/ui/AppInput.vue";
import AppLink from "@/ui/AppLink.vue";
import AppPage from "@/ui/AppPage.vue";
import AppTextarea from "@/ui/AppTextarea.vue";

const t = messages.courseForm;
const route = useRoute();
const router = useRouter();
const id = computed(() => (route.params.id ? String(route.params.id) : undefined));
const saved = ref(false);

const { form, course, loading, notFound, archived, setArchived } = useCourseForm(id.value, (c) => {
  if (!id.value) void router.replace(`/courses/${c.id}`);
  else saved.value = true;
});
</script>

<template>
  <AppPage :title="id ? t.editTitle : t.newTitle">
    <p v-if="loading">{{ messages.common.loading }}</p>
    <AppAlert v-else-if="notFound" kind="error">{{ t.notFound }}</AppAlert>
    <form
      v-else
      class="flex flex-col gap-4"
      novalidate
      @submit.prevent="
        saved = false;
        form.submit();
      "
    >
      <AppAlert v-if="archived" kind="info">{{ t.archivedNote }}</AppAlert>
      <AppAlert v-if="form.formError.value" kind="error">{{ form.formError.value }}</AppAlert>
      <AppAlert v-if="saved" kind="success">{{ t.saved }}</AppAlert>
      <AppInput v-model="form.values.name" :label="t.name" :error="form.errors.value.name" />
      <AppTextarea
        v-model="form.values.description"
        :label="t.description"
        :error="form.errors.value.description"
      />
      <AppInput
        v-model="form.values.pricePerLesson"
        :label="t.price"
        type="text"
        inputmode="numeric"
        :hint="t.priceHint"
        :error="form.errors.value.pricePerLesson"
      />
      <AppInput
        v-model="form.values.startDate"
        :label="t.start"
        type="date"
        :error="form.errors.value.startDate"
      />
      <AppInput v-model="form.values.endDate" :label="t.end" type="date" :error="form.errors.value.endDate" />
      <AppInput
        v-model="form.values.maxStudents"
        :label="t.max"
        type="text"
        inputmode="numeric"
        :error="form.errors.value.maxStudents"
      />
      <AppCheckbox v-if="course" v-model="form.values.active" :label="t.active" />
      <div class="flex flex-wrap gap-3">
        <AppButton type="submit" :loading="form.submitting.value" :disabled="archived">{{
          t.save
        }}</AppButton>
        <template v-if="course">
          <AppButton v-if="!archived" variant="secondary" @click="setArchived(true)">{{
            t.archive
          }}</AppButton>
          <AppButton v-else variant="secondary" @click="setArchived(false)">{{ t.restore }}</AppButton>
        </template>
      </div>
    </form>
    <AppLink to="/courses">{{ messages.common.back }}</AppLink>
  </AppPage>
</template>
