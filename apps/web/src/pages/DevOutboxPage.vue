<script setup lang="ts">
import { onMounted, ref } from "vue";
import { api } from "@/api/client";
import { messages } from "@/messages";
import AppAlert from "@/ui/AppAlert.vue";
import AppButton from "@/ui/AppButton.vue";
import AppCard from "@/ui/AppCard.vue";

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
  <main class="mx-auto w-full max-w-3xl px-4 py-8">
    <h1 class="mb-1 text-2xl font-semibold tracking-tight">{{ t.title }}</h1>
    <AppAlert v-if="unavailable" kind="info">{{ t.notAvailable }}</AppAlert>
    <div v-else class="flex flex-col gap-4">
      <p class="text-base-content/60">{{ t.intro }}</p>
      <div>
        <AppButton variant="secondary" compact @click="load">{{ t.refresh }}</AppButton>
      </div>
      <p v-if="emails.length === 0" class="text-base-content/60">{{ t.empty }}</p>
      <AppCard v-for="m in emails" :key="m.id">
        <p class="text-sm text-base-content/60">{{ m.created_at }} · {{ m.to_email }}</p>
        <h2 class="font-semibold">{{ m.subject }}</h2>
        <pre class="whitespace-pre-wrap break-words rounded-field bg-base-200 p-3 text-sm">{{
          m.body_text
        }}</pre>
      </AppCard>
    </div>
  </main>
</template>
