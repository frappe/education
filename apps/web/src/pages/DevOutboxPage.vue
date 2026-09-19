<script setup lang="ts">
import { onMounted, ref } from "vue";
import { api } from "@/api/client";
import { messages } from "@/messages";
import AppAlert from "@/ui/AppAlert.vue";
import AppButton from "@/ui/AppButton.vue";
import AppPage from "@/ui/AppPage.vue";

interface Mail {
  id: string;
  kind: string;
  to_email: string;
  subject: string;
  body_text: string;
  created_at: string;
}

const t = messages.devOutbox;
const emails = ref<Mail[]>([]);
const unavailable = ref(false);

async function load() {
  try {
    emails.value = (await api<{ emails: Mail[] }>("/dev/outbox")).emails;
  } catch {
    unavailable.value = true;
  }
}
onMounted(load);
</script>

<template>
  <AppPage :title="t.title">
    <AppAlert v-if="unavailable" kind="info">{{ t.notAvailable }}</AppAlert>
    <template v-else>
      <p>{{ t.intro }}</p>
      <AppButton variant="secondary" @click="load">{{ t.refresh }}</AppButton>
      <p v-if="emails.length === 0">{{ t.empty }}</p>
      <article
        v-for="m in emails"
        :key="m.id"
        class="rounded-[var(--radius-control)] border border-[var(--color-border)] p-3"
      >
        <p class="text-sm text-[var(--color-text-muted)]">{{ m.created_at }} · {{ m.to_email }}</p>
        <h2 class="font-medium">{{ m.subject }}</h2>
        <pre class="mt-2 whitespace-pre-wrap break-words text-sm">{{ m.body_text }}</pre>
      </article>
    </template>
  </AppPage>
</template>
