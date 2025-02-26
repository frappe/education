<template>
    <div class="p-6">
      <h2 class="text-2xl font-bold mb-4">Announcements & Newsletters</h2>
      <div v-if="announcements.length" class="space-y-4">
        <div
          v-for="announcement in announcements"
          :key="announcement.name"
          class="p-4 bg-white shadow-md rounded-lg"
        >
          <h3 class="text-xl font-semibold">{{ announcement.subject }}</h3>
          <p class="text-gray-600 mt-2">{{ announcement.content }}</p>
          <button
            class="mt-3 text-blue-600 hover:underline"
            @click="openAnnouncement(announcement)"
          >
            Read More
          </button>
        </div>
      </div>
      <div v-else class="text-gray-500">No announcements available.</div>
  
      <Dialog v-model="showDialog" :options="{ size: 'xl', title: selectedAnnouncement.subject }">
        <template #body-content>
          <p class="text-gray-700" v-html="selectedAnnouncement.content"></p>
        </template>
      </Dialog>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue'
  import { Dialog, createResource } from 'frappe-ui'
  
  const announcements = ref([])
  const showDialog = ref(false)
  const selectedAnnouncement = ref({})
  
  const fetchAnnouncements = createResource({
    url: 'education.education.api.get_announcements',
    onSuccess: (data) => {
      announcements.value = data.map(announcement => ({
        ...announcement,
        summary: truncateDescription(announcement.content),
      }))
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
  
  const truncateDescription = (description) => {
    const maxLength = 100
    return description.length > maxLength
      ? description.substring(0, maxLength) + '...'
      : description
  }
  </script>