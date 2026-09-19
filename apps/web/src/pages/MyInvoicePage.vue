<script setup lang="ts">
import { useRoute } from "vue-router";
import InvoiceSheet from "@/components/InvoiceSheet.vue";
import { invoiceStatusText, invoiceStatusTone } from "@/components/invoiceLabels";
import { periodLabel } from "@/features/invoices/period";
import { useMyInvoice } from "@/features/invoices/useInvoices";
import { messages } from "@/messages";
import AppAlert from "@/ui/AppAlert.vue";
import AppBadge from "@/ui/AppBadge.vue";
import AppButton from "@/ui/AppButton.vue";
import AppIcon from "@/ui/AppIcon.vue";
import AppLoading from "@/ui/AppLoading.vue";
import AppPage from "@/ui/AppPage.vue";

const t = messages.invoices;
const { invoice, loading, notFound } = useMyInvoice(String(useRoute().params.id));
const print = () => window.print();
</script>

<template>
  <AppPage
    :title="t.receipt"
    :subtitle="invoice ? periodLabel(invoice.period) : undefined"
    back-to="/my/invoices"
    :back-label="t.myBack"
  >
    <template v-if="invoice" #actions>
      <AppBadge :tone="invoiceStatusTone[invoice.status]">{{ invoiceStatusText[invoice.status] }}</AppBadge>
      <AppButton variant="secondary" @click="print"
        ><AppIcon name="print" :size="16" />{{ t.print }}</AppButton
      >
    </template>
    <AppLoading v-if="loading" :label="messages.common.loading" />
    <AppAlert v-else-if="notFound" kind="error">{{ t.notFound }}</AppAlert>
    <InvoiceSheet v-else-if="invoice" :data="invoice" />
  </AppPage>
</template>
