# Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.query_builder.functions import Count

from education.education.doctype.building.building import get_building_location, validate_building_type
from education.education.doctype.campus.campus import validate_campus


class Hostel(Document):
	def onload(self):
		self.set_onload("buildings", self.get_buildings_in_use())

	def validate(self):
		validate_campus(self, required=True)
		self.validate_company_change()
		self.validate_default_building()
		self.validate_room_buildings()

	def validate_company_change(self):
		"""Rent of an active stay is invoiced under its company, so the company cannot change under it."""
		if self.is_new() or not self.has_value_changed("company"):
			return

		active = frappe.db.get_value(
			"Hostel Allocation", {"hostel": self.name, "docstatus": 1, "status": "Active"}
		)
		if active:
			frappe.throw(
				_(
					"Hostel {0} has active stays, such as {1}. Check them out before moving it to another company."
				).format(frappe.bold(self.name), frappe.get_desk_link("Hostel Allocation", active))
			)

	def validate_default_building(self):
		if not self.default_building:
			return

		building = get_building_location(self.default_building)
		if building.disabled and self.has_value_changed("default_building"):
			frappe.throw(_("Building {0} is disabled.").format(frappe.bold(self.default_building)))
		validate_building_type(self.default_building, building, "Hostel")
		if not same_site(building, self):
			frappe.throw(
				_("Building {0} is not on this hostel's campus.").format(frappe.bold(self.default_building))
			)

	def validate_room_buildings(self):
		"""Moving the hostel to another campus must not leave its rooms in buildings on the old one."""
		if self.is_new() or not (self.has_value_changed("company") or self.has_value_changed("campus")):
			return

		for building in self.get_buildings_in_use():
			if not same_site(get_building_location(building.name), self):
				frappe.throw(
					_("Rooms of this hostel are in Building {0}, which is on another campus.").format(
						frappe.bold(building.building_name)
					)
				)

	def get_buildings_in_use(self):
		"""Buildings that this hostel's rooms are in, with how many rooms each holds."""
		if self.is_new():
			return []

		room = frappe.qb.DocType("Hostel Room")
		building = frappe.qb.DocType("Building")
		return (
			frappe.qb.from_(room)
			.join(building)
			.on(building.name == room.building)
			.select(building.name, building.building_name, Count(room.name).as_("rooms"))
			.where(room.hostel == self.name)
			.groupby(building.name, building.building_name)
			.orderby(building.building_name)
		).run(as_dict=True)

	def on_update(self):
		if self.is_new():
			return
		if not (self.has_value_changed("company") or self.has_value_changed("campus")):
			return

		# Rooms and beds copy the hostel's site so lists and reports can filter by campus.
		location = {"company": self.company, "campus": self.campus}
		for doctype in ("Hostel Room", "Hostel Bed"):
			frappe.db.set_value(doctype, {"hostel": self.name}, location, update_modified=False)

		# Active stays move with the hostel: invoices raised from now on use the new campus and
		# its cost center. Invoices already raised keep the campus they were raised under.
		frappe.db.set_value(
			"Hostel Allocation",
			{"hostel": self.name, "docstatus": 1, "status": "Active"},
			"campus",
			self.campus,
			update_modified=False,
		)


def same_site(building, record):
	return building.company == record.company and (building.campus or None) == (record.campus or None)
