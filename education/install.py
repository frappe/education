import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields
from frappe.desk.page.setup_wizard.setup_wizard import make_records
from frappe.permissions import add_permission, update_permission_property


def after_install():
	setup_fixtures()
	create_student_role()
	create_parent_assessment_group()
	create_invoice_permissions()
	create_custom_fields(get_custom_fields())
	create_permissions(get_permissions())


def setup_fixtures():
	records = [
		# Party Type Records
		{"doctype": "Party Type", "party_type": "Student", "account_type": "Receivable"},
		# Item Group Records
		{"doctype": "Item Group", "item_group_name": "Fee Component"},
		# Customer Group Records
		{"doctype": "Customer Group", "customer_group_name": "Student"},
	]
	make_records(records)


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


def create_invoice_permissions():
	add_permission("Sales Invoice", "Student", 0)

	doctype = "Sales Invoice"
	role = "Student"
	permlevel = 0
	ptype = ["read", "write", "print"]

	for p in ptype:
		# update permissions
		update_permission_property(doctype, role, permlevel, p, 1)


def get_permissions():
	return [
		{
			"doctype": "Sales Invoice",
			"role": "Student",
			"permlevel": 0,
			"ptype": ["read", "write", "print"],
		},
		{
			"doctype": "User",
			"role": "Academics User",
			"permlevel": 0,
			"ptype": ["read", "write", "create"],
		},
		{
			"doctype": "Customer",
			"role": "Academics User",
			"permlevel": 0,
			"ptype": ["read", "write", "create"],
		},
	]


def create_permissions(doctype_permissions):
	for doctype_permission in doctype_permissions:
		doctype = doctype_permission.get("doctype")
		role = doctype_permission.get("role")
		permlevel = doctype_permission.get("permlevel")
		ptype = doctype_permission.get("ptype")
		add_permission(doctype, role, permlevel)
		for p in ptype:
			update_permission_property(doctype, role, permlevel, p, 1)


def get_custom_fields():
	"""Education specific custom fields that needs to be added to the Sales Invoice DocType."""
	return {
		"Sales Invoice": [
			{
				"fieldname": "student_info_section",
				"fieldtype": "Section Break",
				"label": "Student Info",
				"collapsible": 1,
				"insert_after": "ignore_pricing_rule",
			},
			{
				"fieldname": "student",
				"fieldtype": "Link",
				"label": "Student",
				"options": "Student",
				"insert_after": "student_info_section",
			},
			{
				"fieldname": "column_break_ejcc",
				"fieldtype": "Column Break",
				"insert_after": "student",
			},
			{
				"fieldname": "fee_schedule",
				"fieldtype": "Link",
				"label": "Fee Schedule",
				"options": "Fee Schedule",
				"insert_after": "column_break_ejcc",
			},
		],
		"Sales Order": [
			{
				"fieldname": "student_info_section",
				"fieldtype": "Section Break",
				"label": "Student Info",
				"collapsible": 1,
				"insert_after": "ignore_pricing_rule",
			},
			{
				"fieldname": "student",
				"fieldtype": "Link",
				"label": "Student",
				"options": "Student",
				"insert_after": "student_info_section",
			},
			{
				"fieldname": "column_break_ejcc",
				"fieldtype": "Column Break",
				"insert_after": "student",
			},
			{
				"fieldname": "fee_schedule",
				"fieldtype": "Link",
				"label": "Fee Schedule",
				"options": "Fee Schedule",
				"insert_after": "column_break_ejcc",
			},
		],
	}
