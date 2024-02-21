<template>
  <div>
    <div class="flex h-screen w-screen">
      <div class="h-full border-r bg-gray-50">
        <Sidebar />
      </div>
      <div class="flex-1 flex flex-col h-full overflow-auto">
        <Navbar />
          <router-view  
            class="flex-1 overflow-auto"
          />
      </div>
    </div>
  </div>
  <Toasts />
</template>

<script setup>
import Sidebar from '@/components/Sidebar.vue'
import Navbar from '@/components/Navbar.vue';
import { RouterView } from 'vue-router';
import { Toasts } from 'frappe-ui';
</script>
