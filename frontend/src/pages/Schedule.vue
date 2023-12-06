<script setup>
import { Qalendar } from 'qalendar';
import {ref} from 'vue'

let events= ref([
    {
      title: "Advanced algebra",
      with: "Chandler Bing",
      time:{start:"2023-12-05 16:00", end:"2023-12-05 17:00"},
      color: "yellow",
      id: "753944708f0f",
      description: "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Asperiores assumenda corporis doloremque et expedita molestias necessitatibus quam quas temporibus veritatis. Deserunt excepturi illum nobis perferendis praesentium repudiandae saepe sapiente voluptatem!"
    },
    {
      title: "Ralph on holiday",
      with: "Rachel Greene",
      time: { 
        start: "2023-12-06 12:00", 
        end: "2023-12-06 17:00" 
      },
      color: "blue",
      isEditable: true,
      id: "5602b6f589fc"
    }
])

let editEvent = (event) => {
  console.log(event)
}

let config = {
  style: {
    fontFamily: 'Nunito',
  },

  dayBoundaries: {
    start: 8,
    end: 22,
  },
}

let get_earliest_times_from_events = (events) =>{
  let earliest_times = []
  events.forEach(event => {
    earliest_times.push(event.time.start.split(" ")[1].split(":")[0])
  });
  earliest_times.sort()
  config.dayBoundaries.start = earliest_times[0] - 1
  config.dayBoundaries.end = parseInt(earliest_times[earliest_times.length - 1]) + 6
}
get_earliest_times_from_events(events.value)

</script>

<template>
	<div class="flex items-center justify-center is-light-mode h-screen">
    <div class="calendar_wrapper">
      <Qalendar 
        :events="events"
        :config="config"
        @editEvent="editEvent"
        />

    </div>
	</div>
</template>


<style>
@import "qalendar/dist/style.css";
	
  .calendar_wrapper {
    width: 100%;
    height: 100%;
    max-width: 85%;
    max-height: 700px;
  }
</style>