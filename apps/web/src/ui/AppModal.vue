<script setup lang="ts">
import { onMounted, ref, watch } from "vue";

defineProps<{ title: string; closeLabel: string }>();
const open = defineModel<boolean>({ default: false });
const dialog = ref<HTMLDialogElement>();

function sync(value: boolean) {
  if (value && !dialog.value?.open) dialog.value?.showModal();
  if (!value && dialog.value?.open) dialog.value.close();
}
watch(open, sync, { flush: "post" });
onMounted(() => sync(open.value));
</script>

<template>
  <dialog ref="dialog" class="modal" @close="open = false">
    <div class="modal-box">
      <h2 class="text-lg font-semibold">{{ title }}</h2>
      <div class="flex flex-col gap-4 py-4"><slot /></div>
      <div class="modal-action"><slot name="actions" /></div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button>{{ closeLabel }}</button>
    </form>
  </dialog>
</template>
