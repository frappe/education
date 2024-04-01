import frappe


def execute():
	if not frappe.db.exists("Item Group", "Fee Component"):
		frappe.get_doc(
			{
				"doctype": "Item Group",
				"item_group_name": "Fee Component",
				"parent_item_group": "All Item Groups",
				"is_group": 0,
			}
		).insert()
