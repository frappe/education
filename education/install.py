import frappe


def after_install():
	setup_fixtures()
	create_student_role()
	create_parent_assessment_group()


def setup_fixtures():
	records = [
		{"doctype": "Party Type", "party_type": "Student", "account_type": "Receivable"}
	]

	for record in records:
		if not frappe.db.exists("Party Type", record.get("party_type")):
			doc = frappe.get_doc(record)
			doc.insert()


def create_parent_assessment_group():
	if not frappe.db.exists("Assessment Group", "All Assessment Groups"):
		frappe.get_doc(
			{
				"doctype": "Assessment Group",
				"assessment_group_name": "All Assessment Groups",
				"is_group": 1,
			}
		).insert(ignore_mandatory=True)


def create_student_role():
	if not frappe.db.exists("Role", "Student"):
		frappe.get_doc({"doctype": "Role", "role_name": "Student", "desk_access": 0}).save()
