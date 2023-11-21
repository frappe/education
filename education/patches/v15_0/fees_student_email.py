import frappe


def execute():
	student_emails = frappe.db.get_all("Fees", fields=["name", "student_email"])
	for email in student_emails:
		frappe.db.set_value("Fees", email.name, "contact_email", email.student_email)
