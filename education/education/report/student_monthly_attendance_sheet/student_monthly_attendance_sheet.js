// Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
// License: GNU General Public License v3. See license.txt


frappe.query_reports["Student Monthly Attendance Sheet"] = {
	"filters": [{
		"fieldname": "month",
		"label": __("Month"),
		"fieldtype": "Select",
		"options": "Jan\nFeb\nMar\nApr\nMay\nJun\nJul\nAug\nSep\nOct\nNov\nDec",
		"default": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov",
			"Dec"
		][frappe.datetime.str_to_obj(frappe.datetime.get_today()).getMonth()],
	},
	{
		"fieldname": "year",
		"label": __("Year"),
		"fieldtype": "Link",
		"options":"Academic Year",
		"reqd": 1
	},
	{
		"fieldname": "student_group",
		"label": __("Student Group"),
		"fieldtype": "Link",
		"options": "Student Group",
		"reqd": 1
	}
	],
}
