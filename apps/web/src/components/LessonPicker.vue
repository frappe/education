<script setup lang="ts">
import type { UnbilledLesson } from "@lms/shared";
import { formatDay, formatVnd } from "@/features/format";
import { usePaging } from "@/features/paging";
import { messages } from "@/messages";
import AppButton from "@/ui/AppButton.vue";
import AppPager from "@/ui/AppPager.vue";

// The lessons a student attended, each with a tick. The teacher picks the ones to put on the receipt.
const props = defineProps<{ lessons: UnbilledLesson[]; total: number }>();
// Ten lessons a page. The ticks of every page count.
const paging = usePaging(() => props.lessons);
const chosen = defineModel<string[]>({ required: true });
defineEmits<{ all: []; none: [] }>();
const t = messages.invoices;
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <p class="text-sm text-base-content/70">
        {{ t.pickedOf.replace("{a}", String(chosen.length)).replace("{b}", String(lessons.length)) }}
      </p>
      <div class="flex gap-2">
        <AppButton variant="ghost" compact @click="$emit('all')">{{ t.pickAll }}</AppButton>
        <AppButton variant="ghost" compact @click="$emit('none')">{{ t.pickNone }}</AppButton>
      </div>
    </div>
    <ul
      class="flex max-h-96 flex-col divide-y divide-base-300 overflow-y-auto rounded-field border border-base-300"
    >
      <li v-for="l in paging.shown.value" :key="l.lessonId">
        <label class="flex min-h-14 cursor-pointer items-center gap-3 px-4 py-2 hover:bg-base-200/60">
          <input v-model="chosen" type="checkbox" :value="l.lessonId" class="checkbox checkbox-primary" />
          <span class="min-w-0 flex-1">
            <span class="block font-medium">{{ formatDay(l.date) }} · {{ l.startTime }}</span>
            <span class="block truncate text-sm text-base-content/60"
              >{{ l.courseName }}<template v-if="l.title"> · {{ l.title }}</template></span
            >
          </span>
          <span class="whitespace-nowrap text-sm">{{ formatVnd(l.price) }}</span>
        </label>
      </li>
    </ul>
    <AppPager v-model:page="paging.page.value" :pages="paging.pages.value" plain />
    <p class="text-right text-lg font-semibold">{{ t.total }}: {{ formatVnd(total) }}</p>
  </div>
</template>
