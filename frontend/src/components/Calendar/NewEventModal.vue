<template>
  <Dialog
    v-model="show"
    :options="{
      title: 'Create New Event',
      actions: [
        {
          label: 'Submit',
          variant: 'solid',
        },
      ],
    }"
    class="z-50"
  >
    <template #body-content>
      <div class="p-4">
        <div class="grid grid-cols-1 gap-4">
          <FormControl
            type="Input"
            v-model="newEvent.title"
            label="Title"
            placeholder="Meet with John Doe"
            @blur="validateFields()"
          />
          <FormControl
            type="Date"
            v-model="newEvent.date"
            label="Date"
            required="true"
            @blur="validateFields()"
          />

          <FormControl
            type="Input"
            v-model="newEvent.person"
            label="Person"
            placeholder="John Doe"
          />

          <FormControl
            type="time"
            v-model="newEvent.from_time"
            label="Start Time"
            @blur="validateFields()"
          />

          <FormControl
            type="time"
            v-model="newEvent.to_time"
            label="End Time"
            @blur="validateFields()"
          />

          <FormControl
            type="Input"
            v-model="newEvent.venue"
            label="Venue"
            placeholder="Frappe, Neelkanth Business Park"
          />
          <ErrorMessage :message="errorMessage" v-if="errorMessage" />
        </div>
      </div>
    </template>
    <template #actions="{ close }">
      <div class="flex flex-row-reverse gap-2">
        <Button
          class="w-full"
          variant="solid"
          @click="submitEvent(close)"
          label="Submit"
        />
      </div>
    </template>
  </Dialog>
</template>
<script setup>
import { Dialog, FormControl } from 'frappe-ui'
import ErrorMessage from 'frappe-ui/src/components/ErrorMessage.vue'
import { inject, reactive, ref } from 'vue'
import { calculateDiff } from './calendarUtils'
const show = defineModel()
// Needs in Dialog
// 1. Date
// 2. Person
// 3. From Time
// 4. To Time
// 5. Venue

const props = defineProps({
  event: {
    type: Object,
  },
})

const newEvent = reactive({
  title: props.event?.title || '',
  date: props.event?.date || '',
  person: props.event?.person || '',
  from_time: props.event?.from_time || '',
  to_time: props.event?.to_time || '',
  venue: props.event?.venue || '',
  id: '',
})

const errorMessage = ref('')
function validateFields() {
  if (!newEvent.title) {
    errorMessage.value = 'Title is required'
  } else if (!newEvent.date) {
    errorMessage.value = 'Date is required'
  } else if (!newEvent.from_time) {
    errorMessage.value = 'Start Time is required'
  } else if (!newEvent.to_time) {
    errorMessage.value = 'End Time is required'
  } else {
    errorMessage.value = ''
  }
  if (
    newEvent.hasOwnProperty('from_time') &&
    newEvent.hasOwnProperty('to_time')
  ) {
    validateStartEndTime()
  }
}

function validateStartEndTime() {
  let timeDiff = calculateDiff(newEvent.from_time, newEvent.to_time)
  if (timeDiff <= 0) {
    errorMessage.value = 'Start time must be less than End Time'
  }
}

const createNewEvent = inject('createNewEvent')

function submitEvent(close) {
  validateFields()
  if (errorMessage.value) {
    return
  }
  let id = Math.random(0, 1)
  newEvent.id = id
  createNewEvent(newEvent)
  close()
  // newEvent = {
  //   date: '',
  //   person: '',
  //   from_time: '',
  //   to_time: '',
  //   venue: '',
  // }
  close()
}
</script>

<style></style>
