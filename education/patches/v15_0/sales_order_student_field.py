import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields
from education.install import get_custom_fields


def execute():
	sales_order_fields = get_custom_fields()["Sales Order"]
	sales_order_custom_fields = {"Sales Order": sales_order_fields}
	create_custom_fields(sales_order_custom_fields)
