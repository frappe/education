# Copyright (c) 2020, Frappe Technologies Pvt. Ltd. and Contributors
# License: GNU General Public License v3. See license.txt

from frappe import _


def get_data():
	return {
		"fieldname": "course",
		"transactions": [
			{
				"label": _("Course"),
				"items": ["Course Enrollment", "Subject Schedule"],
			},
			{"label": _("Student"), "items": ["Student Batch Name"]},
			{
				"label": _("Assessment"),
				"items": ["Assessment Plan", "Assessment Result"],
			},
		],
	}
