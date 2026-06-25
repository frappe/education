import frappe


def execute():
	if not frappe.db.exists("Role", "Guardian"):
		frappe.get_doc({"doctype": "Role", "role_name": "Guardian", "desk_access": 0}).save()
