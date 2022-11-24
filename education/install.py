import frappe

def after_install():
	setup_fixtures()

def setup_fixtures():
	records = [{"doctype": "Party Type", "party_type": "Student", "account_type": "Receivable"}]

	for record in records:
		if not frappe.db.exists("Party Type", record.get("party_type")):
			doc = frappe.get_doc(record)
			doc.insert()