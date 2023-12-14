import { defineStore } from 'pinia'
import { createResource } from 'frappe-ui'
import { reactive } from 'vue'

export const usersStore = defineStore('education-users', () => {
	const user = createResource({
		url: 'education.education.api.get_user_info',
		cache: "Users",
		initialData: [],
		onError(error) {
			console.log(error)
			if (error && error.exc_type === 'AuthenticationError') {
				router.push('/login')
			}
		}
	})

	return {
		user,
	}
})
