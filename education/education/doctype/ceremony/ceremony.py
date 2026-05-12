# Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class Ceremony(Document):
	pass


@frappe.whitelist()
def get_allowed_programs(ceremony):
	return frappe.get_all(
		"Ceremony Program", filters={"parent": ceremony}, pluck="program"
	)
