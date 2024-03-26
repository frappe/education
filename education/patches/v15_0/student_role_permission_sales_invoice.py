import frappe
from frappe.permissions import add_permission, update_permission_property


def execute():

	add_permission("Sales Invoice", "Student", 0)

	doctype = "Sales Invoice"
	role = "Student"
	permlevel = 0
	ptype = ["read", "write", "print"]

	for p in ptype:
		# update permissions
		update_permission_property(doctype, role, permlevel, p, 1)

	frappe.db.commit()
