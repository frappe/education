<template>
  <Dropdown v-if="programOptions.length > 1" :options="programOptions">
    <template #default="{ open }">
      <Button :label="activeProgram || 'Select Program'">
        <template #suffix>
          <FeatherIcon
            :name="open ? 'chevron-up' : 'chevron-down'"
            class="h-4 text-gray-600"
          />
        </template>
      </Button>
    </template>
  </Dropdown>
  <span v-else-if="activeProgram" class="text-sm font-medium text-gray-700">
    {{ activeProgram }}
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { Dropdown, FeatherIcon, Button } from 'frappe-ui'
import { studentStore } from '@/stores/student'

const store = studentStore()
const { programs, activeProgram } = storeToRefs(store)

const programOptions = computed(() =>
  programs.value.map((row) => ({
    label: row.program,
    onClick: () => store.setActiveProgram(row.program),
  }))
)
</script>
