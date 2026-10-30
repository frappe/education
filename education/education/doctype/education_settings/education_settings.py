# Copyright (c) 2017, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt


import frappe
import frappe.defaults
from frappe.model.document import Document

education_keydict = {
	# "key in defaults": "key in Global Defaults"
	"academic_year": "current_academic_year",
	"academic_term": "current_academic_term",
}


class EducationSettings(Document):
	def on_update(self):
		"""update defaults"""
		for key in education_keydict:
			frappe.db.set_default(key, self.get(education_keydict[key], ""))

		# clear cache
		frappe.clear_cache()

	def get_defaults(self):
		return frappe.defaults.get_defaults()

	def validate(self):
		from frappe.custom.doctype.property_setter.property_setter import make_property_setter

		make_property_setter(
			"Faculty",
			"naming_series",
			"hidden",
			0 if (self.faculty_created_by or "Naming Series") == "Naming Series" else 1,
			"Check",
			validate_fields_for_doctype=False,
		)
