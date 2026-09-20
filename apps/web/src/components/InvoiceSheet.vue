<script setup lang="ts">
import { computed } from "vue";
import { formatDay, formatVnd, formatWhen } from "@/features/format";
import { periodShort } from "@/features/invoices/period";
import { draftQrText, qrModules, qrPath, qrTextOf, willHaveQr } from "@/features/invoices/qr";
import { hasPaymentInfo, type SheetData } from "@/features/invoices/sheet";
import { fill } from "@/features/text";
import { messages } from "@/messages";
import AppBadge from "@/ui/AppBadge.vue";
import AppTable from "@/ui/AppTable.vue";

// The fee receipt as a paper page. It is the part that is printed.
const props = defineProps<{
  data: SheetData;
  /** A draft that is saved: show its payment QR code, so the teacher can check it before sending. */
  qrPreview?: boolean;
}>();
const t = messages.invoices;
const pay = computed(() => props.data.payee);
// A receipt that waits for payment shows the QR code. The bank details are written out only when no code can be made.
const qr = computed(() => {
  const text =
    props.qrPreview && props.data.status === "draft" ? draftQrText(props.data) : qrTextOf(props.data);
  if (!text) return null;
  const modules = qrModules(text);
  return { size: modules.length, path: qrPath(modules) };
});
const showPay = computed(() => !qr.value && props.data.status === "sent" && hasPaymentInfo(pay.value));
const qrComing = computed(() => !qr.value && willHaveQr(props.data));
const days = (dates: string[]) => dates.map((d) => formatDay(d).slice(0, 5)).join(", ");
</script>

<template>
  <article class="print-area @container rounded-box border border-base-300 bg-base-100 p-6 md:p-10">
    <header class="flex flex-wrap items-start justify-between gap-4 border-b border-base-300 pb-6">
      <div>
        <h2 class="text-2xl font-semibold tracking-tight">
          {{ fill(t.receiptTitle, { month: periodShort(data.period) }) }}
        </h2>
        <p class="text-base-content/60">{{ t.receipt }}</p>
      </div>
      <div class="text-right">
        <p class="text-sm text-base-content/60">{{ t.receiptNo }}</p>
        <p class="text-lg font-semibold">{{ data.number ?? t.draftNumber }}</p>
        <AppBadge v-if="data.status === 'paid'" tone="success" class="mt-1">{{ t.stampPaid }}</AppBadge>
        <AppBadge v-else-if="data.status === 'void'" tone="error" class="mt-1">{{ t.stampVoid }}</AppBadge>
      </div>
    </header>

    <dl v-if="data.sentAt || data.dueDate" class="grid gap-x-8 gap-y-4 py-6 sm:grid-cols-2">
      <div v-if="data.sentAt">
        <dt class="text-sm text-base-content/60">{{ t.sentOn }}</dt>
        <dd class="font-medium">{{ formatWhen(data.sentAt) }}</dd>
      </div>
      <div v-if="data.dueDate">
        <dt class="text-sm text-base-content/60">{{ t.due }}</dt>
        <dd class="font-medium">{{ formatDay(data.dueDate) }}</dd>
      </div>
    </dl>
    <div v-else class="h-6"></div>

    <!-- A narrow receipt (small screen or narrow column) shows each line as a block, so nothing has to be scrolled sideways. -->
    <ul class="divide-y divide-base-300 border-y border-base-300 @2xl:hidden">
      <li v-for="(l, i) in data.lines" :key="i" class="flex flex-col gap-1 py-3">
        <div class="flex items-start justify-between gap-3">
          <p class="font-medium">{{ l.description }}</p>
          <p class="whitespace-nowrap font-medium">{{ formatVnd(l.amount) }}</p>
        </div>
        <p v-if="l.dates.length" class="text-sm text-base-content/70">
          {{ fill(t.lessonDays, { days: days(l.dates) }) }}
        </p>
        <p v-if="!l.discount" class="text-sm text-base-content/60">
          <template v-if="l.perLesson"
            >{{ l.quantity === 1 ? t.lessonOne : fill(t.lessonMany, { n: l.quantity }) }} ×
            {{ formatVnd(l.unitPrice) }} {{ t.perLesson }}</template
          >
          <template v-else>{{ l.quantity }} × {{ formatVnd(l.unitPrice) }}</template>
        </p>
      </li>
      <li class="flex items-center justify-between gap-3 py-3 font-semibold">
        <span>{{ t.total }}</span>
        <span class="text-lg">{{ formatVnd(data.total) }}</span>
      </li>
    </ul>

    <div class="hidden @2xl:block">
      <AppTable>
        <thead>
          <tr>
            <th class="min-w-44">{{ t.description }}</th>
            <th class="text-right">{{ t.howMany }}</th>
            <th class="text-right">{{ t.price }}</th>
            <th class="text-right">{{ t.amount }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(l, i) in data.lines" :key="i">
            <td>
              <p class="font-medium">{{ l.description }}</p>
              <p v-if="l.dates.length" class="text-sm text-base-content/70">
                {{ fill(t.lessonDays, { days: days(l.dates) }) }}
              </p>
            </td>
            <td class="whitespace-nowrap text-right">
              <template v-if="l.discount"></template>
              <template v-else-if="l.perLesson">{{
                l.quantity === 1 ? t.lessonOne : fill(t.lessonMany, { n: l.quantity })
              }}</template>
              <template v-else>{{ l.quantity }}</template>
            </td>
            <td class="whitespace-nowrap text-right">
              <template v-if="!l.discount">{{ formatVnd(l.unitPrice) }}</template>
              <span v-if="l.perLesson" class="block text-xs text-base-content/60">{{ t.perLesson }}</span>
            </td>
            <td class="whitespace-nowrap text-right">{{ formatVnd(l.amount) }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="text-base font-semibold">
            <td colspan="3" class="text-right">{{ t.total }}</td>
            <td class="whitespace-nowrap text-right text-lg">{{ formatVnd(data.total) }}</td>
          </tr>
        </tfoot>
      </AppTable>
    </div>

    <p v-if="data.status === 'paid' && data.paidAt" class="mt-4 text-sm text-success">
      {{ fill(t.paidOn, { date: formatWhen(data.paidAt) }) }}
    </p>

    <section v-if="data.note" class="mt-6">
      <h3 class="text-sm text-base-content/60">{{ t.noteTitle }}</h3>
      <p class="whitespace-pre-wrap break-words">{{ data.note }}</p>
    </section>

    <section
      v-if="qr"
      class="mt-6 flex flex-col items-center gap-1 rounded-field bg-base-200 p-4 print:bg-transparent"
    >
      <p class="text-sm text-base-content/60">{{ t.amountToPay }}</p>
      <p class="mb-3 text-2xl font-semibold">{{ formatVnd(data.total) }}</p>
      <h3 class="mb-2 text-sm font-semibold uppercase tracking-wide text-success">{{ t.payCode }}</h3>
      <svg
        :viewBox="`-3 -3 ${qr.size + 6} ${qr.size + 6}`"
        class="size-56 max-w-full rounded-field"
        role="img"
        :aria-label="t.qrAlt"
        shape-rendering="crispEdges"
      >
        <rect x="-3" y="-3" :width="qr.size + 6" :height="qr.size + 6" class="fill-white" />
        <path :d="qr.path" class="fill-black" />
      </svg>
      <p v-if="pay.bankName" class="mt-3 text-lg font-semibold">{{ pay.bankName }}</p>
      <p v-if="pay.bankAccount" class="text-2xl font-bold tracking-widest">{{ pay.bankAccount }}</p>
      <p v-if="pay.bankHolder" class="uppercase text-base-content/70">{{ pay.bankHolder }}</p>
      <p v-if="pay.paymentNote" class="mt-2 whitespace-pre-wrap break-words text-center text-sm">
        {{ pay.paymentNote }}
      </p>
      <p v-if="data.status === 'draft'" class="mt-2 text-center text-xs text-base-content/60">
        {{ t.qrPreviewNote }}
      </p>
    </section>
    <p v-else-if="qrComing" class="mt-6 rounded-field bg-base-200 p-4 text-sm text-base-content/70">
      {{ t.qrAfterSend }}
    </p>

    <section v-if="showPay" class="mt-6 rounded-field bg-base-200 p-4 print:bg-transparent print:p-0">
      <h3 class="mb-2 font-semibold">{{ t.howToPay }}</h3>
      <dl class="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
        <div v-if="pay.payeeName">
          <dt class="text-base-content/60">{{ t.payTo }}</dt>
          <dd class="font-medium">{{ pay.payeeName }}</dd>
        </div>
        <div v-if="pay.payeePhone">
          <dt class="text-base-content/60">{{ t.phone }}</dt>
          <dd class="font-medium">{{ pay.payeePhone }}</dd>
        </div>
        <div v-if="pay.bankName">
          <dt class="text-base-content/60">{{ t.bank }}</dt>
          <dd class="font-medium">{{ pay.bankName }}</dd>
        </div>
        <div v-if="pay.bankAccount">
          <dt class="text-base-content/60">{{ t.account }}</dt>
          <dd class="font-medium">{{ pay.bankAccount }}</dd>
        </div>
        <div v-if="pay.bankHolder">
          <dt class="text-base-content/60">{{ t.holder }}</dt>
          <dd class="font-medium">{{ pay.bankHolder }}</dd>
        </div>
      </dl>
      <p v-if="pay.paymentNote" class="mt-2 whitespace-pre-wrap break-words text-sm">{{ pay.paymentNote }}</p>
    </section>

    <footer class="mt-8 border-t border-base-300 pt-4 text-xs text-base-content/60">{{ t.notTax }}</footer>
  </article>
</template>
