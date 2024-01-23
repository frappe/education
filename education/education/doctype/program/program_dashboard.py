from frappe import _


def get_data():
	return {
		"fieldname": "program",
		"transactions": [
			{"label": _("Fee"), "items": ["Fees", "Fee Structure", "Fee Schedule"]},
		],
	}
