import frappe


def execute():
	if not frappe.db.exists("Party Type", "Student"):
		doc = frappe.get_doc(
			{"doctype": "Party Type", "party_type": "Student", "account_type": "Receivable"}
		)
		doc.insert()
