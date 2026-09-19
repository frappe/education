<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import InvoiceSheet from "@/components/InvoiceSheet.vue";
import { invoiceStatusText, invoiceStatusTone } from "@/components/invoiceLabels";
import { formatVnd } from "@/features/format";
import { amountOf, parseMoney } from "@/features/invoices/lines";
import { periodLabel } from "@/features/invoices/period";
import type { SheetData } from "@/features/invoices/sheet";
import { useInvoice } from "@/features/invoices/useInvoices";
import { messages } from "@/messages";
import AppAlert from "@/ui/AppAlert.vue";
import AppBadge from "@/ui/AppBadge.vue";
import AppButton from "@/ui/AppButton.vue";
import AppCard from "@/ui/AppCard.vue";
import AppIcon from "@/ui/AppIcon.vue";
import AppInput from "@/ui/AppInput.vue";
import AppLoading from "@/ui/AppLoading.vue";
import AppModal from "@/ui/AppModal.vue";
import AppPage from "@/ui/AppPage.vue";
import AppTextarea from "@/ui/AppTextarea.vue";

const t = messages.invoices;
const route = useRoute();
const router = useRouter();
const inv = useInvoice(
  String(route.params.id),
  {
    saved: t.saved,
    sent: t.sent,
    paid: t.paidDone,
    unpaid: t.unpaidDone,
    voided: t.voided,
    refreshed: t.refreshed,
    deleted: t.deleted,
  },
  () => router.replace("/invoices"),
);
const d = computed(() => inv.invoice.value);
const isDraft = computed(() => d.value?.status === "draft");

/** What the printed receipt shows: for a draft, what is typed now. */
const sheet = computed<SheetData | null>(() => {
  const v = d.value;
  if (!v) return null;
  if (v.status !== "draft") return v;
  const saved = new Map(v.lines.map((l) => [l.id, l]));
  return {
    ...v,
    lines: inv.rows.value.map((r) => {
      const old = r.id ? saved.get(r.id) : undefined;
      const quantity = parseMoney(r.quantity);
      return {
        description: r.description,
        quantity: Number.isFinite(quantity) ? quantity : 0,
        unitPrice: Number.isFinite(parseMoney(r.unitPrice)) ? parseMoney(r.unitPrice) : 0,
        amount: amountOf(r),
        dates: old && old.quantity === quantity ? old.dates : [],
      };
    }),
    total: inv.total.value,
    note: inv.note.value,
    dueDate: inv.dueDate.value || null,
  };
});

const print = () => window.print();

type Ask = null | "send" | "refresh" | "cancel" | "delete";
const asking = ref<Ask>(null);
const open = computed({
  get: () => asking.value !== null,
  set: (v: boolean) => {
    if (!v) asking.value = null;
  },
});
const reason = ref("");
async function confirm() {
  const what = asking.value;
  asking.value = null;
  if (what === "send") await inv.send();
  else if (what === "refresh") await inv.refresh();
  else if (what === "delete") await inv.remove();
  else if (what === "cancel") {
    await inv.cancel(reason.value.trim());
    reason.value = "";
  }
}
const askTitle = computed(
  () =>
    ({ send: t.sendTitle, refresh: t.refreshTitle, cancel: t.cancelTitle, delete: t.deleteTitle })[
      asking.value ?? "send"
    ],
);
const askText = computed(
  () =>
    ({ send: t.sendText, refresh: t.refreshText, cancel: t.cancelText, delete: t.deleteText })[
      asking.value ?? "send"
    ],
);
const askYes = computed(
  () =>
    ({ send: t.sendYes, refresh: t.refresh, cancel: t.cancelYes, delete: t.deleteYes })[
      asking.value ?? "send"
    ],
);
const canSend = computed(
  () =>
    isDraft.value &&
    !inv.dirty.value &&
    inv.linesValid.value &&
    inv.rows.value.length > 0 &&
    inv.total.value > 0,
);
</script>

<template>
  <AppPage
    :title="d?.studentName ?? t.title"
    :subtitle="d ? periodLabel(d.period) : undefined"
    back-to="/invoices"
    :back-label="t.back"
  >
    <template v-if="d" #actions>
      <AppBadge :tone="invoiceStatusTone[d.status]">{{ invoiceStatusText[d.status] }}</AppBadge>
      <AppButton v-if="!isDraft" variant="secondary" @click="print"
        ><AppIcon name="print" :size="16" />{{ t.print }}</AppButton
      >
    </template>

    <AppLoading v-if="inv.loading.value" :label="messages.common.loading" />
    <AppAlert v-else-if="inv.notFound.value" kind="error">{{ t.notFound }}</AppAlert>
    <template v-else-if="d && sheet">
      <AppAlert v-if="inv.error.value" kind="error">{{ inv.error.value }}</AppAlert>
      <AppAlert v-if="d.attendanceChanged" kind="warning">
        <div>
          <p class="font-medium">{{ t.changedTitle }}</p>
          <p>{{ t.changedText }}</p>
        </div>
      </AppAlert>
      <AppAlert v-if="d.status === 'void' && d.voidReason" kind="info">{{
        messages.invoices.voidReason.replace("{reason}", d.voidReason)
      }}</AppAlert>

      <div class="grid gap-6 lg:grid-cols-3">
        <div class="flex min-w-0 flex-col gap-6 lg:col-span-2">
          <template v-if="isDraft">
            <AppCard :title="t.lines" :description="t.draftInfo">
              <p v-if="inv.rows.value.length === 0" class="text-sm text-base-content/60">{{ t.noLines }}</p>
              <ul class="flex flex-col gap-4">
                <li
                  v-for="r in inv.rows.value"
                  :key="r.key"
                  class="grid gap-3 rounded-field border border-base-300 p-3 sm:grid-cols-12"
                >
                  <div class="sm:col-span-12">
                    <AppInput v-model="r.description" :label="t.lineText" />
                  </div>
                  <div class="sm:col-span-3">
                    <AppInput v-model="r.quantity" :label="t.lineQuantity" inputmode="numeric" />
                  </div>
                  <div class="sm:col-span-5">
                    <AppInput v-model="r.unitPrice" :label="t.linePrice" inputmode="numeric" />
                  </div>
                  <div class="flex items-end justify-between gap-2 sm:col-span-4">
                    <div>
                      <p class="text-sm font-medium">{{ t.lineAmount }}</p>
                      <p class="min-h-11 content-center font-semibold">{{ formatVnd(amountOf(r)) }}</p>
                    </div>
                    <button
                      type="button"
                      class="btn btn-square btn-ghost"
                      :aria-label="t.removeLine"
                      @click="inv.removeRow(r.key)"
                    >
                      <AppIcon name="trash" :size="18" />
                    </button>
                  </div>
                </li>
              </ul>
              <div class="flex flex-wrap items-center justify-between gap-3">
                <AppButton variant="secondary" compact @click="inv.addRow"
                  ><AppIcon name="plus" :size="16" />{{ t.addLine }}</AppButton
                >
                <p class="text-lg font-semibold">{{ t.total }}: {{ formatVnd(inv.total.value) }}</p>
              </div>
              <p class="text-xs text-base-content/60">{{ t.priceHint }}</p>
              <p v-if="!inv.linesValid.value" class="text-sm text-warning">{{ t.fixLines }}</p>
              <AppTextarea v-model="inv.note.value" :label="t.noteLabel" :rows="3" />
              <AppInput v-model="inv.dueDate.value" :label="t.dueLabel" type="date" />
            </AppCard>
            <div>
              <h2 class="mb-3 font-semibold">{{ t.preview }}</h2>
              <InvoiceSheet :data="sheet" />
            </div>
          </template>
          <InvoiceSheet v-else :data="sheet" />
        </div>

        <div class="flex min-w-0 flex-col gap-6">
          <AppCard class="lg:sticky lg:top-6" :description="isDraft ? undefined : t.sentInfo">
            <template v-if="isDraft">
              <p v-if="inv.dirty.value" class="text-sm text-warning">{{ t.unsaved }}</p>
              <p v-else-if="!canSend" class="text-sm text-base-content/60">{{ t.draftInfo }}</p>
              <AppButton
                :loading="inv.busy.value"
                :disabled="!inv.dirty.value || !inv.linesValid.value || inv.total.value < 0"
                @click="inv.save"
                >{{ t.saveChanges }}</AppButton
              >
              <AppButton variant="secondary" :disabled="!canSend || inv.busy.value" @click="asking = 'send'"
                ><AppIcon name="send" :size="16" />{{ t.send }}</AppButton
              >
              <p v-if="inv.dirty.value" class="text-xs text-base-content/60">{{ t.saveFirst }}</p>
              <AppButton variant="ghost" compact :disabled="inv.busy.value" @click="asking = 'refresh'">{{
                t.fromAttendance
              }}</AppButton>
              <AppButton variant="ghost" compact :disabled="inv.busy.value" @click="asking = 'delete'"
                ><AppIcon name="trash" :size="16" />{{ t.delete }}</AppButton
              >
            </template>
            <template v-else-if="d.status === 'sent'">
              <AppButton :loading="inv.busy.value" @click="inv.markPaid"
                ><AppIcon name="done" :size="16" />{{ t.markPaid }}</AppButton
              >
              <AppButton variant="ghost" compact :disabled="inv.busy.value" @click="asking = 'cancel'">{{
                t.cancel
              }}</AppButton>
            </template>
            <template v-else-if="d.status === 'paid'">
              <AppButton variant="secondary" :loading="inv.busy.value" @click="inv.markUnpaid">{{
                t.markUnpaid
              }}</AppButton>
              <AppButton variant="ghost" compact :disabled="inv.busy.value" @click="asking = 'cancel'">{{
                t.cancel
              }}</AppButton>
            </template>
          </AppCard>
        </div>
      </div>
    </template>

    <AppModal v-model="open" :title="askTitle" :close-label="messages.common.close">
      <p>{{ askText }}</p>
      <AppTextarea v-if="asking === 'cancel'" v-model="reason" :label="t.reason" :rows="3" />
      <template #actions>
        <AppButton variant="ghost" @click="asking = null">{{ messages.common.cancel }}</AppButton>
        <AppButton
          :variant="asking === 'cancel' || asking === 'delete' ? 'danger' : 'primary'"
          :disabled="asking === 'cancel' && reason.trim() === ''"
          @click="confirm"
          >{{ askYes }}</AppButton
        >
      </template>
    </AppModal>
  </AppPage>
</template>
