<template>
  <div class="p-6 relative">
    <h2 class="text-2xl font-bold mb-4">Announcements & Newsletters</h2>

    <div
      v-if="announcements.length"
      class="grid grid-cols-1 sm:grid-cols-2 gap-6"
      :class="{ 'opacity-30 pointer-events-none': showDialog }"
    >
      <div
        v-for="announcement in announcements"
        :key="announcement.subject"
        class="p-4 bg-white shadow-md rounded-lg cursor-pointer hover:bg-gray-100 transition"
        @click="openAnnouncement(announcement)"
      >
        <h3 class="text-xl font-semibold">{{ announcement.subject }}</h3>
        <p class="text-gray-600 mt-1">📅 {{ announcement.creation }}</p>
      </div>
    </div>

    <div v-else class="text-gray-500">No announcements available.</div>

    <div
      v-if="showDialog"
      class="fixed inset-0 bg-black bg-opacity-50 z-40"
      @click="showDialog = false"
    ></div>

    <div
      v-if="showDialog"
      class="fixed inset-0 flex items-center justify-center z-50"
    >
      <div class="bg-white w-11/12 md:w-3/4 lg:w-2/3 xl:w-1/2 p-6 rounded-lg shadow-lg">
        <h2 class="text-2xl font-bold mb-4">{{ selectedAnnouncement.subject }}</h2>
        <div class="ql-editor read-mode" v-html="selectedAnnouncement.message"></div>
        <button
          class="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
          @click="showDialog = false"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { createResource } from 'frappe-ui'

const announcements = ref([])
const showDialog = ref(false)
const selectedAnnouncement = ref({})

const fetchAnnouncements = createResource({
  url: 'education.education.api.get_announcements',
  onSuccess: (data) => {
    announcements.value = data
  },
  onError: (err) => {
    console.error('Error fetching announcements:', err)
  }
})

onMounted(() => {
  fetchAnnouncements.reload()
})

const openAnnouncement = (announcement) => {
  selectedAnnouncement.value = announcement
  showDialog.value = true
}
</script>
