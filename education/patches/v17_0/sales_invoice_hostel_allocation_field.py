from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

from education.install import get_custom_fields


def execute():
	hostel_allocation = [
		f for f in get_custom_fields()["Sales Invoice"] if f["fieldname"] == "hostel_allocation"
	]
	create_custom_fields({"Sales Invoice": hostel_allocation})
