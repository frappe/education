<template>
  <div>
    <div class="flex h-screen w-screen">
      <div class="h-full border-r bg-gray-50">
        <Sidebar />
      </div>
      <div class="flex-1 flex flex-col h-full overflow-auto">
        <Navbar />
        <router-view  />
      </div>
    </div>
    <!-- <Qalendar 
      :events="events"
      /> -->
  </div>
</template>

<script setup>
import Sidebar from '@/components/Sidebar.vue'
import Navbar from './components/Navbar.vue';
import { RouterView } from 'vue-router';
import { Qalendar } from 'qalendar';

let events= [
    {
      title: "Advanced algebra",
      with: "Chandler Bing",
      time:{start:"2023-12-05 16:00", end:"2023-12-05 17:00"},
      color: "yellow",
      isEditable: true,
      id: "753944708f0f",
      description: "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Asperiores assumenda corporis doloremque et expedita molestias necessitatibus quam quas temporibus veritatis. Deserunt excepturi illum nobis perferendis praesentium repudiandae saepe sapiente voluptatem!"
    },
    {
      title: "Ralph on holiday",
      with: "Rachel Greene",
      time: { 
        start: "2023-12-06 15:00", 
        end: "2023-12-06 17:00" 
      },
      color: "blue",
      isEditable: true,
      id: "5602b6f589fc"
    }
]

let editEvent = (event) => {
  console.log(event)
}
</script>


<style>
@import "qalendar/dist/style.css";
	
</style>