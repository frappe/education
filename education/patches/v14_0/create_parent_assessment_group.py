import frappe

from education.install import create_parent_assessment_group


def execute():
	create_parent_assessment_group()

	if frappe.db.exists("Assessment Group", "undefined"):
		frappe.delete_doc("Assessment Group", "undefined")
