# Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document

from education.education.doctype.campus.campus import validate_campus


class ClassRoom(Document):
	def validate(self):
		validate_campus(self, required=True)
		self.validate_facilities()

	def validate_facilities(self):
		if not self.campus:
			return

		for row in self.facilities:
			if not row.facility:
				continue
			facility_campus = frappe.db.get_value("Facility", row.facility, "campus")
			if facility_campus and facility_campus != self.campus:
				frappe.throw(
					_("Facility {0} belongs to Campus {1}.").format(
						frappe.bold(row.facility), frappe.bold(facility_campus)
					)
				)
