import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const leaveStore = defineStore('education-leave', () => {
	const isAttendancePage = ref(false)
	
	const setIsAttendancePage = (value) => {
		isAttendancePage.value = value
	}

	return {
		isAttendancePage,
		setIsAttendancePage
	}
})
