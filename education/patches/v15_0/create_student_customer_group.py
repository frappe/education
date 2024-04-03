import frappe


def execute():
	if not frappe.db.exists("Customer Group", "Student"):
		customer_group = frappe.get_doc(
			{
				"doctype": "Customer Group",
				"customer_group_name": "Student",
				"parent_customer_group": "All Customer Groups",
			}
		).insert()
