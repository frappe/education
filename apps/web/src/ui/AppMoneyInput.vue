<script setup lang="ts">
import { useId } from "vue";
import { caretAfter, cleanMoney, groupDigits } from "@/features/money";

const props = defineProps<{
  disabled?: boolean;
  label: string;
  error?: string;
  hint?: string;
  placeholder?: string;
  /** A minus sign at the start is kept. */
  negative?: boolean;
}>();
/** The digits as typed, without separators ("1500000"). The field shows them with a dot between the thousands. */
const model = defineModel<string>({ default: "" });
const id = useId();

function typed(event: Event) {
  const el = event.target as HTMLInputElement;
  const digitsBefore = el.value.slice(0, el.selectionStart ?? el.value.length).replace(/\D/g, "").length;
  model.value = cleanMoney(el.value, props.negative);
  const shown = groupDigits(model.value);
  el.value = shown;
  const pos = caretAfter(shown, digitsBefore);
  el.setSelectionRange(pos, pos);
}
</script>

<template>
  <div class="fieldset gap-1 py-0">
    <label :for="id" class="fieldset-legend">{{ label }}</label>
    <input
      :id="id"
      :value="groupDigits(model)"
      type="text"
      inputmode="numeric"
      autocomplete="off"
      :placeholder="placeholder"
      :disabled="disabled"
      :aria-invalid="error ? true : undefined"
      :aria-describedby="error ? `${id}-error` : hint ? `${id}-hint` : undefined"
      class="input min-h-11 w-full tabular-nums"
      :class="{ 'input-error': error }"
      @input="typed"
    />
    <p v-if="hint && !error" :id="`${id}-hint`" class="label whitespace-normal">{{ hint }}</p>
    <p v-if="error" :id="`${id}-error`" role="alert" class="label whitespace-normal text-error">
      {{ error }}
    </p>
  </div>
</template>
