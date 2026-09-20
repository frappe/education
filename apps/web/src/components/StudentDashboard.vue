<script setup lang="ts">
import { computed } from "vue";
import WorkRow from "@/components/WorkRow.vue";
import { invoiceStatusText, invoiceStatusTone } from "@/components/invoiceLabels";
import { useSession } from "@/features/auth/session";
import { formatDayShort, formatVnd } from "@/features/format";
import { periodLabel } from "@/features/invoices/period";
import { useMyHome } from "@/features/my/useMy";
import { usePaging } from "@/features/paging";
import { fill } from "@/features/text";
import { messages } from "@/messages";
import AppAlert from "@/ui/AppAlert.vue";
import AppBadge from "@/ui/AppBadge.vue";
import AppCard from "@/ui/AppCard.vue";
import AppIcon, { type IconName } from "@/ui/AppIcon.vue";
import AppLoading from "@/ui/AppLoading.vue";
import AppPage from "@/ui/AppPage.vue";
import AppPager from "@/ui/AppPager.vue";
import AppStat from "@/ui/AppStat.vue";

const t = messages.my;
const session = useSession();
const { groups, lessons, unpaid, loading, error } = useMyHome();
const fullName = computed(() => session.me?.user.name ?? "");

// Ten rows a page in each list.
const lessonPaging = usePaging(lessons);
const todoPaging = usePaging(() => groups.value.todo);
const againPaging = usePaging(() => groups.value.again);
const donePaging = usePaging(() => groups.value.done);
const receiptPaging = usePaging(unpaid);

/** The five things on this page. Each square at the top jumps to its list. */
type Tile = { id: string; label: string; count: number; icon: IconName; tone?: "secondary" | "accent" };
const tiles = computed((): Tile[] => [
  { id: "home-lessons", label: t.tileLessons, count: lessons.value.length, icon: "calendar" },
  {
    id: "home-todo",
    label: t.todoTitle,
    count: groups.value.todo.length,
    icon: "attendance",
    tone: "accent",
  },
  { id: "home-again", label: t.tileAgain, count: groups.value.again.length, icon: "restore" },
  { id: "home-done", label: t.tileDone, count: groups.value.done.length, icon: "done", tone: "secondary" },
  {
    id: "home-receipts",
    label: t.receiptsTitle,
    count: unpaid.value.length,
    icon: "invoice",
    tone: "accent",
  },
]);
function jump(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}
</script>

<template>
  <AppPage :title="fill(t.homeTitle, { name: fullName })" :subtitle="t.homeText">
    <AppAlert v-if="error" kind="error">{{ error }}</AppAlert>
    <AppLoading v-if="loading" :label="messages.common.loading" />

    <template v-else>
      <nav class="grid grid-cols-2 gap-3 lg:grid-cols-5" :aria-label="t.overview">
        <button
          v-for="tile in tiles"
          :key="tile.id"
          type="button"
          class="rounded-box text-left transition hover:ring-2 hover:ring-primary/40 focus-visible:ring-2 focus-visible:ring-primary [&>div]:h-full"
          @click="jump(tile.id)"
        >
          <AppStat :value="tile.count" :label="tile.label" :icon="tile.icon" :tone="tile.tone" />
        </button>
      </nav>

      <!-- Two equal columns on a wide screen: homework on the left, receipts and lessons on the right. On a small
           screen everything is one column, in the order of the numbers: to do, redo, receipts, lessons, scored. -->
      <div class="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-start">
        <div class="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-6">
          <section id="home-todo" class="order-1 scroll-mt-6">
            <AppCard :title="t.todoTitle" flush>
              <p v-if="groups.todo.length === 0" class="px-5 py-6 text-sm text-base-content/60">
                {{ t.todoNone }}
              </p>
              <ul v-else class="divide-y divide-base-300">
                <li v-for="w in todoPaging.shown.value" :key="w.id"><WorkRow :item="w" show-course /></li>
              </ul>
              <AppPager v-model:page="todoPaging.page.value" :pages="todoPaging.pages.value" />
            </AppCard>
          </section>

          <section id="home-again" class="order-2 scroll-mt-6">
            <AppCard :title="t.againTitle" flush>
              <p v-if="groups.again.length === 0" class="px-5 py-6 text-sm text-base-content/60">
                {{ t.againNone }}
              </p>
              <ul v-else class="divide-y divide-base-300">
                <li v-for="w in againPaging.shown.value" :key="w.id"><WorkRow :item="w" show-course /></li>
              </ul>
              <AppPager v-model:page="againPaging.page.value" :pages="againPaging.pages.value" />
            </AppCard>
          </section>

          <section id="home-done" class="order-5 scroll-mt-6">
            <AppCard :title="t.doneTitle" flush>
              <p v-if="groups.done.length === 0" class="px-5 py-6 text-sm text-base-content/60">
                {{ t.doneNone }}
              </p>
              <ul v-else class="divide-y divide-base-300">
                <li v-for="w in donePaging.shown.value" :key="w.id"><WorkRow :item="w" show-course /></li>
              </ul>
              <AppPager v-model:page="donePaging.page.value" :pages="donePaging.pages.value" />
            </AppCard>
          </section>
        </div>

        <div class="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-6">
          <section id="home-receipts" class="order-3 scroll-mt-6">
            <AppCard :title="t.receiptsTitle" flush>
              <template #actions>
                <RouterLink to="/my/invoices" class="link link-primary text-sm">{{
                  t.receiptsAll
                }}</RouterLink>
              </template>
              <p v-if="unpaid.length === 0" class="px-5 py-6 text-sm text-base-content/60">
                {{ t.receiptsNone }}
              </p>
              <ul v-else class="divide-y divide-base-300">
                <li v-for="i in receiptPaging.shown.value" :key="i.id">
                  <RouterLink
                    :to="`/my/invoices/${i.id}`"
                    class="flex flex-wrap items-center justify-between gap-2 px-5 py-3 hover:bg-base-200/60"
                  >
                    <span class="min-w-0">
                      <span class="block font-medium">{{ periodLabel(i.period) }}</span>
                      <span class="block truncate text-sm text-base-content/60">{{ i.number }}</span>
                    </span>
                    <span class="flex items-center gap-2">
                      <span class="font-semibold">{{ formatVnd(i.total) }}</span>
                      <AppBadge :tone="invoiceStatusTone[i.status]">{{
                        invoiceStatusText[i.status]
                      }}</AppBadge>
                    </span>
                  </RouterLink>
                </li>
              </ul>
              <AppPager v-model:page="receiptPaging.page.value" :pages="receiptPaging.pages.value" />
            </AppCard>
          </section>

          <section id="home-lessons" class="order-4 scroll-mt-6">
            <AppCard :title="t.lessonsTitle" flush>
              <template #actions>
                <RouterLink to="/my/courses" class="link link-primary text-sm">{{
                  t.coursesTitle
                }}</RouterLink>
              </template>
              <p v-if="lessons.length === 0" class="px-5 py-6 text-sm text-base-content/60">
                {{ t.lessonsNone }}
              </p>
              <ul v-else class="divide-y divide-base-300">
                <li
                  v-for="l in lessonPaging.shown.value"
                  :key="l.id"
                  class="flex items-center hover:bg-base-200/60"
                >
                  <RouterLink
                    :to="`/my/courses/${l.courseId}`"
                    class="flex min-w-0 flex-1 items-center gap-3 px-5 py-3"
                  >
                    <span
                      class="grid w-14 shrink-0 place-items-center rounded-field bg-primary/10 py-1.5 text-primary"
                    >
                      <span class="text-xs font-medium uppercase">{{
                        formatDayShort(l.date).split(" ")[0]
                      }}</span>
                      <span class="text-lg font-semibold leading-tight">{{ l.date.slice(8) }}</span>
                    </span>
                    <span class="min-w-0 flex-1">
                      <span class="block truncate font-medium">{{ l.title || l.courseName }}</span>
                      <span class="block truncate text-sm text-base-content/60">
                        {{ l.startTime }} - {{ l.endTime
                        }}<template v-if="l.title"> · {{ l.courseName }}</template
                        ><template v-if="l.place"> · {{ l.place }}</template>
                      </span>
                    </span>
                  </RouterLink>
                  <a
                    v-if="l.onlineUrl"
                    :href="l.onlineUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="btn btn-square btn-ghost mr-3 shrink-0"
                    :aria-label="fill(t.joinLesson, { title: l.title || l.courseName })"
                    :title="t.join"
                    ><AppIcon name="video" :size="18"
                  /></a>
                </li>
              </ul>
              <AppPager v-model:page="lessonPaging.page.value" :pages="lessonPaging.pages.value" />
            </AppCard>
          </section>
        </div>
      </div>
    </template>
  </AppPage>
</template>
