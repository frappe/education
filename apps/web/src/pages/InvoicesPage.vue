<script setup lang="ts">
import { computed, ref } from "vue";
import { invoiceStatusText, invoiceStatusTone } from "@/components/invoiceLabels";
import { formatVnd } from "@/features/format";
import { useInvoiceList } from "@/features/invoices/useInvoices";
import { periodLabel } from "@/features/invoices/period";
import { fill } from "@/features/text";
import { messages } from "@/messages";
import AppAlert from "@/ui/AppAlert.vue";
import AppBadge from "@/ui/AppBadge.vue";
import AppButton from "@/ui/AppButton.vue";
import AppCard from "@/ui/AppCard.vue";
import AppEmpty from "@/ui/AppEmpty.vue";
import AppIcon from "@/ui/AppIcon.vue";
import AppInput from "@/ui/AppInput.vue";
import AppLoading from "@/ui/AppLoading.vue";
import AppModal from "@/ui/AppModal.vue";
import AppPage from "@/ui/AppPage.vue";
import AppSelect from "@/ui/AppSelect.vue";
import AppStat from "@/ui/AppStat.vue";
import AppTable from "@/ui/AppTable.vue";
import AppTextarea from "@/ui/AppTextarea.vue";

const t = messages.invoices;
const list = useInvoiceList({
  created: t.created,
  createdOne: t.createdOne,
  nothing: t.nothing,
  paymentSaved: t.paymentSaved,
});
const paying = ref(false);
const bankOptions = computed(() => [
  ...list.banks.map((b) => ({ value: b.bin, label: b.name })),
  { value: "other", label: t.bankOther },
]);
function openPayment() {
  list.openPayment();
  paying.value = true;
}
async function savePayment() {
  if (await list.savePayment()) paying.value = false;
}
</script>

<template>
  <AppPage :title="t.title" :subtitle="t.subtitle">
    <template #actions>
      <AppButton variant="secondary" @click="openPayment"
        ><AppIcon name="edit" :size="16" />{{ t.payment }}</AppButton
      >
      <RouterLink to="/invoices/new" class="btn btn-primary min-h-11 gap-2 font-medium"
        ><AppIcon name="plus" :size="16" />{{ t.newReceipt }}</RouterLink
      >
    </template>

    <AppAlert v-if="list.error.value" kind="error">{{ list.error.value }}</AppAlert>
    <AppAlert v-if="list.paymentEmpty.value" kind="info">{{ t.paymentMissing }}</AppAlert>

    <div class="flex flex-wrap items-center gap-2">
      <button type="button" class="btn btn-square btn-ghost" :aria-label="t.previous" @click="list.move(-1)">
        <AppIcon name="left" />
      </button>
      <h2 class="min-w-40 text-center text-lg font-semibold" aria-live="polite">
        {{ periodLabel(list.period.value) }}
      </h2>
      <button type="button" class="btn btn-square btn-ghost" :aria-label="t.next" @click="list.move(1)">
        <AppIcon name="right" />
      </button>
      <AppButton v-if="!list.isNow.value" variant="ghost" compact @click="list.goToNow">{{
        t.thisMonth
      }}</AppButton>
    </div>

    <AppLoading v-if="list.loading.value && !list.data.value" :label="messages.common.loading" />
    <template v-else-if="list.data.value">
      <div class="grid gap-4 sm:grid-cols-3">
        <AppStat :value="formatVnd(list.sums.value.billed)" :label="t.billed" icon="invoice" />
        <AppStat :value="formatVnd(list.sums.value.paid)" :label="t.paid" icon="done" tone="secondary" />
        <AppStat :value="formatVnd(list.sums.value.waiting)" :label="t.waiting" icon="clock" tone="accent" />
      </div>

      <AppAlert v-if="list.data.value.missing > 0" kind="info">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <span>{{
            list.data.value.missing === 1 ? t.missingOne : fill(t.missing, { n: list.data.value.missing })
          }}</span>
          <AppButton compact :loading="list.busy.value" @click="list.generate">{{ t.create }}</AppButton>
        </div>
      </AppAlert>

      <div
        v-if="list.data.value.invoices.length === 0 && list.data.value.cancelled.length === 0"
        class="rounded-box border border-base-300 bg-base-100"
      >
        <AppEmpty icon="invoice" :title="t.none" :text="t.noneText" />
      </div>
      <AppCard v-else flush>
        <AppTable>
          <thead>
            <tr>
              <th>{{ t.student }}</th>
              <th>{{ t.number }}</th>
              <th class="text-right">{{ t.total }}</th>
              <th>{{ t.status }}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr v-for="i in list.data.value.invoices" :key="i.id" class="hover:bg-base-200/60">
              <td class="font-medium">{{ i.studentName }}</td>
              <td class="whitespace-nowrap">{{ i.number ?? t.draftNumber }}</td>
              <td class="whitespace-nowrap text-right">{{ formatVnd(i.total) }}</td>
              <td>
                <AppBadge :tone="invoiceStatusTone[i.status]">{{ invoiceStatusText[i.status] }}</AppBadge>
              </td>
              <td class="text-right">
                <RouterLink :to="`/invoices/${i.id}`" class="btn btn-ghost btn-sm">{{ t.open }}</RouterLink>
              </td>
            </tr>
          </tbody>
        </AppTable>
      </AppCard>

      <AppCard v-if="list.data.value.cancelled.length > 0" :title="t.cancelledTitle" flush>
        <ul class="divide-y divide-base-300">
          <li
            v-for="i in list.data.value.cancelled"
            :key="i.id"
            class="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm"
          >
            <span>{{ i.studentName }} · {{ i.number }} · {{ formatVnd(i.total) }}</span>
            <RouterLink :to="`/invoices/${i.id}`" class="link link-primary">{{ t.open }}</RouterLink>
          </li>
        </ul>
      </AppCard>
    </template>

    <AppModal v-model="paying" :title="t.paymentTitle" :close-label="messages.common.close">
      <p class="text-sm text-base-content/70">{{ t.paymentText }}</p>
      <AppAlert v-if="list.paymentError.value" kind="error">{{ list.paymentError.value }}</AppAlert>
      <AppInput v-model="list.form.payeeName" :label="t.payeeName" autocomplete="name" />
      <AppInput v-model="list.form.payeePhone" :label="t.payeePhone" type="tel" autocomplete="tel" />
      <AppSelect
        :model-value="list.bankChoice.value"
        :label="t.bankName"
        :options="bankOptions"
        :placeholder="t.bankNone"
        @update:model-value="list.chooseBank"
      />
      <template v-if="list.bankChoice.value === 'other'">
        <AppInput v-model="list.form.bankName" :label="t.bankOtherName" />
        <AppInput v-model="list.form.bankBin" :label="t.bankBin" :hint="t.bankBinHint" inputmode="numeric" />
      </template>
      <AppInput
        v-model="list.form.bankAccount"
        :label="t.bankAccount"
        :hint="t.accountHint"
        inputmode="numeric"
      />
      <AppAlert :kind="list.qrReady.value ? 'success' : 'info'">{{
        list.qrReady.value ? t.qrReady : t.qrMissing
      }}</AppAlert>
      <AppInput v-model="list.form.bankHolder" :label="t.bankHolder" />
      <AppTextarea
        v-model="list.form.paymentNote"
        :label="t.paymentNote"
        :hint="t.paymentNoteHint"
        :rows="3"
      />
      <template #actions>
        <AppButton variant="ghost" @click="paying = false">{{ messages.common.cancel }}</AppButton>
        <AppButton :loading="list.savingPayment.value" @click="savePayment">{{ t.save }}</AppButton>
      </template>
    </AppModal>
  </AppPage>
</template>
