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

		facility_names = [row.facility for row in self.facilities if row.facility]
		if not facility_names:
			return

		facility_campus = {
			facility.name: facility.campus
			for facility in frappe.db.get_all(
				"Facility",
				filters={"name": ("in", facility_names)},
				fields=["name", "campus"],
			)
		}
		for row in self.facilities:
			campus = facility_campus.get(row.facility)
			if campus and campus != self.campus:
				frappe.throw(
					_("Facility {0} belongs to Campus {1}.").format(
						frappe.bold(row.facility), frappe.bold(campus)
					)
				)
