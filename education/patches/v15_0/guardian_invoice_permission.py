import frappe

from education.install import create_permissions


def execute():
	if not frappe.db.exists("Role", "Guardian"):
		return

	permissions = [
		{
			"doctype": "Sales Invoice",
			"role": "Guardian",
			"permlevel": 0,
			"ptype": ["read", "print"],
		},
	]
	create_permissions(permissions)
