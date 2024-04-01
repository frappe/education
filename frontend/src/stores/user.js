import { defineStore } from 'pinia'
import { createResource } from 'frappe-ui'
import router from "@/router"

export const usersStore = defineStore('education-users', () => {
	const user = createResource({
		url: 'education.education.api.get_user_info',
		cache: "User",
		initialData: [],
		onError(error) {
			console.log(error)
			console.log(error.exc_type)
			if (error && error.exc_type === 'AuthenticationError') {
				router.push('/login')
			}
		},
	})

	return {
		user,
	}
})
