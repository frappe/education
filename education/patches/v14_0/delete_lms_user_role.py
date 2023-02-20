import frappe


def execute():
	if frappe.db.exists("Role", "LMS User"):
		frappe.db.delete("Role", "LMS User")
