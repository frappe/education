# Copyright (c) 2020, Frappe Technologies Pvt. Ltd. and Contributors
# License: GNU General Public License v3. See license.txt

from frappe import _


def get_data():
	return {
		"heatmap": True,
		"heatmap_message": _(
			"This is based on assessment plans supervised by this Instructor"
		),
		"fieldname": "instructor",
		"non_standard_fieldnames": {"Assessment Plan": "supervisor"},
		"transactions": [
			{
				"label": _("Course and Assessment"),
				"items": ["Assessment Plan"],
			},
			{"label": _("Students"), "items": ["Instructor Log"]},
		],
	}
