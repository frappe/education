from frappe import _


def get_data():
	return {
		"fieldname": "student",
		"transactions": [
			{"label": _("Enrollment"), "items": ["Course Enrollment"]},
			{"label": _("Assessment"), "items": ["Assessment Result"]},
		],
	}
