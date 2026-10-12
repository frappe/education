# Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import cint

from education.education.doctype.building.building import get_building_location, validate_building_type
from education.education.doctype.facility.facility import validate_facilities
from education.education.doctype.floor.floor import validate_floor_in_building


class HostelRoom(Document):
	def validate(self):
		self.set_location()
		self.validate_hostel()
		self.validate_building()
		validate_floor_in_building(self)
		self.validate_capacity()
		validate_facilities(self, self.campus)

	def set_location(self):
		self.company, self.campus, default_building = frappe.db.get_value(
			"Hostel", self.hostel, ["company", "campus", "default_building"]
		)
		if self.is_new() and not self.building:
			self.building = default_building

	def validate_hostel(self):
		if self.is_new() and frappe.db.get_value("Hostel", self.hostel, "disabled"):
			frappe.throw(_("Hostel {0} is disabled.").format(frappe.bold(self.hostel)))

	def validate_building(self):
		"""A hostel room can sit in any hostel building on the hostel's campus."""
		if not self.building:
			return

		building = get_building_location(self.building)
		if building.disabled and self.has_value_changed("building"):
			frappe.throw(_("Building {0} is disabled.").format(frappe.bold(self.building)))
		validate_building_type(self.building, building, "Hostel")
		if building.company != self.company or (building.campus or None) != (self.campus or None):
			frappe.throw(
				_("Building {0} is not on the same campus as Hostel {1}.").format(
					frappe.bold(self.building), frappe.bold(self.hostel)
				)
			)

	def validate_capacity(self):
		if cint(self.capacity) < 1:
			frappe.throw(_("A hostel room needs at least one bed."))

		if self.is_new():
			return

		removed_beds = frappe.get_all(
			"Hostel Bed",
			filters={"hostel_room": self.name, "bed_number": (">", cint(self.capacity)), "disabled": 0},
			pluck="name",
		)
		allocated = [bed for bed in removed_beds if has_open_allocation(bed)]
		if allocated:
			frappe.throw(
				_(
					"Beds {0} have active allocations. Check those students out before reducing the beds."
				).format(", ".join(frappe.bold(bed) for bed in allocated))
			)

	def on_update(self):
		self.sync_beds()

	def on_trash(self):
		for bed in frappe.get_all("Hostel Bed", filters={"hostel_room": self.name}, pluck="name"):
			frappe.delete_doc("Hostel Bed", bed, ignore_permissions=True)

	def sync_beds(self):
		"""Keep one enabled bed per place. Beds above the count are removed, or disabled if they have history."""
		capacity = cint(self.capacity)
		location = {"hostel": self.hostel, "company": self.company, "campus": self.campus}
		beds = {
			bed.bed_number: bed
			for bed in frappe.get_all(
				"Hostel Bed",
				filters={"hostel_room": self.name},
				fields=["name", "bed_number", "disabled"],
			)
		}

		for number in range(1, capacity + 1):
			bed = beds.get(number)
			if not bed:
				frappe.get_doc(
					{"doctype": "Hostel Bed", "hostel_room": self.name, "bed_number": number, **location}
				).insert(ignore_permissions=True)
			elif bed.disabled:
				set_bed_disabled(bed.name, 0)

		for number, bed in beds.items():
			if number <= capacity or bed.disabled:
				continue
			if frappe.db.exists("Hostel Allocation", {"hostel_bed": bed.name}):
				set_bed_disabled(bed.name, 1)
			else:
				frappe.delete_doc("Hostel Bed", bed.name, ignore_permissions=True)

		frappe.db.set_value("Hostel Bed", {"hostel_room": self.name}, location, update_modified=False)


def set_bed_disabled(bed, disabled):
	doc = frappe.get_doc("Hostel Bed", bed)
	doc.disabled = disabled
	doc.save(ignore_permissions=True)


def has_open_allocation(bed):
	return bool(
		frappe.db.exists("Hostel Allocation", {"hostel_bed": bed, "docstatus": 1, "status": "Active"})
	)
