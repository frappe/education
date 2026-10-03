from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

from education.install import get_custom_fields


def execute():
	fee_plan = [f for f in get_custom_fields()["Sales Invoice"] if f["fieldname"] == "fee_plan"]
	create_custom_fields({"Sales Invoice": fee_plan})
