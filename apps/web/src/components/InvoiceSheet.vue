<script setup lang="ts">
import { computed } from "vue";
import { formatDay, formatVnd, formatWhen } from "@/features/format";
import { periodLabel } from "@/features/invoices/period";
import { hasPaymentInfo, type SheetData } from "@/features/invoices/sheet";
import { fill } from "@/features/text";
import { messages } from "@/messages";
import AppBadge from "@/ui/AppBadge.vue";
import AppTable from "@/ui/AppTable.vue";

// The fee receipt as a paper page. It is the part that is printed.
const props = defineProps<{ data: SheetData }>();
const t = messages.invoices;
const pay = computed(() => props.data.payee);
const showPay = computed(() => hasPaymentInfo(pay.value));
const days = (dates: string[]) => dates.map((d) => formatDay(d).slice(0, 5)).join(", ");
</script>

<template>
  <article class="print-area rounded-box border border-base-300 bg-base-100 p-6 md:p-10">
    <header class="flex flex-wrap items-start justify-between gap-4 border-b border-base-300 pb-6">
      <div>
        <h2 class="text-2xl font-semibold tracking-tight">{{ t.receipt }}</h2>
        <p class="text-base-content/60">{{ t.receiptVi }}</p>
      </div>
      <div class="text-right">
        <p class="text-sm text-base-content/60">{{ t.receiptNo }}</p>
        <p class="text-lg font-semibold">{{ data.number ?? t.draftNumber }}</p>
        <AppBadge v-if="data.status === 'paid'" tone="success" class="mt-1">{{ t.stampPaid }}</AppBadge>
        <AppBadge v-else-if="data.status === 'void'" tone="error" class="mt-1">{{ t.stampVoid }}</AppBadge>
      </div>
    </header>

    <dl class="grid gap-x-8 gap-y-4 py-6 sm:grid-cols-2">
      <div>
        <dt class="text-sm text-base-content/60">{{ t.from }}</dt>
        <dd class="font-medium">{{ data.teacherName }}</dd>
      </div>
      <div>
        <dt class="text-sm text-base-content/60">{{ t.to }}</dt>
        <dd class="font-medium">{{ data.studentName }}</dd>
      </div>
      <div>
        <dt class="text-sm text-base-content/60">{{ t.month }}</dt>
        <dd class="font-medium">{{ periodLabel(data.period) }}</dd>
      </div>
      <div v-if="data.sentAt">
        <dt class="text-sm text-base-content/60">{{ t.sentOn }}</dt>
        <dd class="font-medium">{{ formatWhen(data.sentAt) }}</dd>
      </div>
      <div v-if="data.dueDate">
        <dt class="text-sm text-base-content/60">{{ t.due }}</dt>
        <dd class="font-medium">{{ formatDay(data.dueDate) }}</dd>
      </div>
    </dl>

    <AppTable>
      <thead>
        <tr>
          <th>{{ t.description }}</th>
          <th class="text-right">{{ t.quantity }}</th>
          <th class="text-right">{{ t.price }}</th>
          <th class="text-right">{{ t.amount }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(l, i) in data.lines" :key="i">
          <td>
            <p class="font-medium">{{ l.description }}</p>
            <p v-if="l.dates.length" class="text-xs text-base-content/60">
              {{ fill(t.lessonDays, { days: days(l.dates) }) }}
            </p>
          </td>
          <td class="text-right">{{ l.quantity }}</td>
          <td class="whitespace-nowrap text-right">{{ formatVnd(l.unitPrice) }}</td>
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

    <p v-if="data.status === 'paid' && data.paidAt" class="mt-4 text-sm text-success">
      {{ fill(t.paidOn, { date: formatWhen(data.paidAt) }) }}
    </p>

    <section v-if="data.note" class="mt-6">
      <h3 class="text-sm text-base-content/60">{{ t.noteTitle }}</h3>
      <p class="whitespace-pre-wrap break-words">{{ data.note }}</p>
    </section>

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
