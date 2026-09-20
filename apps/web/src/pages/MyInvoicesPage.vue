<script setup lang="ts">
import { invoiceStatusText, invoiceStatusTone } from "@/components/invoiceLabels";
import { formatVnd } from "@/features/format";
import { periodLabel } from "@/features/invoices/period";
import { useMyInvoices } from "@/features/invoices/useInvoices";
import { usePaging } from "@/features/paging";
import { fill } from "@/features/text";
import { messages } from "@/messages";
import AppAlert from "@/ui/AppAlert.vue";
import AppBadge from "@/ui/AppBadge.vue";
import AppCard from "@/ui/AppCard.vue";
import AppEmpty from "@/ui/AppEmpty.vue";
import AppLoading from "@/ui/AppLoading.vue";
import AppPage from "@/ui/AppPage.vue";
import AppPager from "@/ui/AppPager.vue";

const t = messages.invoices;
const { invoices, unpaid, loading, error } = useMyInvoices();
const paging = usePaging(invoices);
</script>

<template>
  <AppPage :title="t.myTitle" :subtitle="t.myText">
    <AppAlert v-if="error" kind="error">{{ error }}</AppAlert>
    <AppLoading v-if="loading" :label="messages.common.loading" />
    <div v-else-if="invoices.length === 0" class="rounded-box border border-base-300 bg-base-100">
      <AppEmpty icon="invoice" :title="t.myNone" :text="t.myNoneText" />
    </div>
    <template v-else>
      <AppAlert v-if="unpaid.length > 0" kind="warning">{{
        unpaid.length === 1 ? t.myUnpaidOne : fill(t.myUnpaid, { n: unpaid.length })
      }}</AppAlert>
      <AppCard flush>
        <ul class="divide-y divide-base-300">
          <li v-for="i in paging.shown.value" :key="i.id">
            <RouterLink
              :to="`/my/invoices/${i.id}`"
              class="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-base-200/60"
            >
              <div>
                <p class="font-medium">{{ periodLabel(i.period) }}</p>
                <p class="text-sm text-base-content/60">
                  {{ i.number }} · {{ fill(t.from2, { name: i.teacherName }) }}
                </p>
              </div>
              <div class="flex items-center gap-3">
                <span class="font-semibold">{{ formatVnd(i.total) }}</span>
                <AppBadge :tone="invoiceStatusTone[i.status]">{{ invoiceStatusText[i.status] }}</AppBadge>
              </div>
            </RouterLink>
          </li>
        </ul>
        <AppPager v-model:page="paging.page.value" :pages="paging.pages.value" />
      </AppCard>
    </template>
  </AppPage>
</template>
