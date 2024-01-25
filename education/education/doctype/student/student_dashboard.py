from frappe import _


def get_data():
	return {
		"heatmap": True,
		"heatmap_message": _("This is based on the attendance of this Student"),
		"fieldname": "student",
		"non_standard_fieldnames": {"Bank Account": "party"},
		"transactions": [
			{"label": _("Fee"), "items": ["Sales Invoice", "Bank Account"]},
		],
	}
