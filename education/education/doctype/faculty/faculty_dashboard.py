# Copyright (c) 2020, Frappe Technologies Pvt. Ltd. and Contributors
# License: GNU General Public License v3. See license.txt

from frappe import _


def get_data():
	return {
		"heatmap": True,
		"heatmap_message": _("This is based on the subject schedules of this Faculty"),
		"fieldname": "faculty",
		"transactions": [
			{
				"label": _("Schedule and Assessment"),
				"items": ["Subject Schedule", "Assessment Plan"],
			},
		],
	}
