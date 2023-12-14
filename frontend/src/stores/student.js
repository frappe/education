import { defineStore } from 'pinia'
import { ref, computed, reactive } from 'vue'
import { usersStore } from '@/stores/user';
import { createResource } from 'frappe-ui';

export const studentStore = defineStore('education-student', () => {

	const { user } = usersStore()
	
	const student = createResource({
		url: 'education.education.api.get_student_info',
		params: { email: user.data.email },
		cache: "Student",
	})

	return { student }
})
