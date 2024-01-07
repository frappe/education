import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields


def after_install():
	setup_fixtures()
	create_student_role()
	create_parent_assessment_group()
	create_custom_fields(get_custom_fields())


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


def get_custom_fields():
	"""Education specific custom fields that needs to be added to the Sales Invoice DocType."""
	return {
		"Sales Invoice": [
			{
				"fieldname": "student",
				"label": "Student",
				"fieldtype": "Link",
				"options": "Student",
				"insert_after": "naming_series",
			},
			{
				"fieldname": "student_name",
				"label": "Student Name",
				"fieldtype": "Data",
				"fetch_from": "student.student_name",
				"insert_after": "student",
				"read_only": True,
			},
			{
				"fieldname": "program_enrollment",
				"fieldtype": "Link",
				"label": "Program Enrollment",
				"options": "Program Enrollment",
				"reqd": 1,
				"insert_after": "student_name",
			},
			{
				"fetch_from": "program_enrollment.program",
				"fieldname": "program",
				"fieldtype": "Link",
				"in_list_view": 1,
				"in_standard_filter": 1,
				"label": "Program",
				"options": "Program",
				"read_only": 1,
				"insert_after": "program_enrollment",
			},
			{
				"fieldname": "academic_year",
				"fieldtype": "Link",
				"label": "Academic Year",
				"options": "Academic Year",
				"insert_after": "program",
			},
			{
				"fieldname": "academic_term",
				"fieldtype": "Link",
				"label": "Academic Term",
				"options": "Academic Term",
				"insert_after": "academic_year",
			},
			{
				"fieldname": "fee_structure",
				"fieldtype": "Link",
				"label": "Fee Structure",
				"options": "Fee Structure",
				"print_hide": 1,
				"reqd": 1,
				"insert_after": "term",
			},
		],
		# "Sales Invoice Item":[
		# ]
	}
