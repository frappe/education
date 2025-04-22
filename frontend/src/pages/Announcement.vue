<template>
  <div class="">
    <div v-if="tableData.rows.length > 0" class="px-5 py-4">
      <ListView
        :columns="tableData.columns"
        :rows="tableData.rows"
        :options="{
          selectable: false,
          showTooltip: false,
          onRowClick: (row) => openAnnouncement(row),
        }"
        row-key="name"
      >
        <ListHeader>
          <ListHeaderItem
            v-for="column in tableData.columns"
            :key="column.key"
            :item="column"
          />
        </ListHeader>
        <ListRow
          v-for="row in tableData.rows"
          :key="row.name"
          :row="row"
          v-slot="{ column, item }"
        >
          <ListRowItem :item="item" :align="column.align">
            <template v-if="column.key === 'subject'">
              <span class="font-normal">{{ item }}</span>
            </template>
            <template v-else-if="column.key === 'creation'">
              <span class="text-gray-600">📅 {{ formatDate(item) }}</span>
            </template>
          </ListRowItem>
        </ListRow>
      </ListView>
    </div>

    <div v-else>
      <MissingData message="No announcements available" />
    </div>

    <Dialog
      v-model="showDialog"
      :options="{
        title: selectedAnnouncement.subject,
        size: '2xl',
      }"
    >
      <template #body-content>
        <div class="ql-editor read-mode" v-html="selectedAnnouncement.message"></div>
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import {
  ListView,
  ListHeader,
  ListHeaderItem,
  ListRow,
  ListRowItem,
  Dialog,
  createResource,
} from 'frappe-ui'
import MissingData from '@/components/MissingData.vue'

const tableData = reactive({
  rows: [],
  columns: [
    {
      label: 'Subject',
      key: 'subject',
      width: 2,
    },
    {
      label: 'Posting Date',
      key: 'creation',
      width: 1,
    },
  ],
})

const showDialog = ref(false)
const selectedAnnouncement = ref({})

const fetchAnnouncements = createResource({
  url: 'education.education.api.get_announcements',
  onSuccess: (data) => {
    tableData.rows = data
  },
  onError: (err) => {
    console.error('Error fetching announcements:', err)
  },
  auto: true,
})

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString()
}

const openAnnouncement = (announcement) => {
  selectedAnnouncement.value = announcement
  showDialog.value = true
}
</script>
