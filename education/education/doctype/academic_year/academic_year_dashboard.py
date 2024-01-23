from frappe import _


def get_data():
	return {
		"fieldname": "academic_year",
		"transactions": [
			{"label": _("Fee"), "items": ["Fees", "Fee Schedule", "Fee Structure"]},
		],
	}
