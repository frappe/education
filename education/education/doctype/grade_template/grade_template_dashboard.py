from frappe import _


def get_data():
	return {
		"fieldname": "grade_template",
		"transactions": [
			{"label": _("Course"), "items": ["Course"]},
		],
	}
