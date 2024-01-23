from frappe import _


def get_data():
	return {
		"fieldname": "program_enrollment",
		"transactions": [{"label": _("Fees"), "items": ["Fees"]}],
		"reports": [
			{"label": _("Report"), "items": ["Student and Guardian Contact Details"]}
		],
	}
