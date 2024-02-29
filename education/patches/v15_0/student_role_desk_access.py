import frappe


def execute():
	if frappe.db.exists("Role", "Student"):
		frappe.db.set_value("Role", "Student", "desk_access", 0)
		frappe.db.commit()
