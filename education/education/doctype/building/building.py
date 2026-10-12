# Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

from typing import Any

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.query_builder.functions import IfNull

from education.education.doctype.campus.campus import validate_campus
from education.education.doctype.facility.facility import validate_facilities


class Building(Document):
	def validate(self):
		validate_campus(self, required=True)
		self.validate_unique_name()
		self.validate_building_type()
		self.validate_floor_count()
		self.validate_hostel_rooms_campus()
		validate_facilities(self, self.campus)

	def on_update(self):
		if self.is_new():
			return
		if self.has_value_changed("company") or self.has_value_changed("campus"):
			# Rooms take their site from the building.
			frappe.db.set_value(
				"Room",
				{"building": self.name},
				{"company": self.company, "campus": self.campus},
				update_modified=False,
			)

	def validate_unique_name(self):
		filters = {"building_name": self.building_name, "company": self.company, "name": ("!=", self.name)}
		if self.campus:
			filters["campus"] = self.campus
		existing = frappe.db.get_value("Building", filters)
		if existing:
			frappe.throw(
				_("Building {0} already exists on this campus as {1}.").format(
					frappe.bold(self.building_name), frappe.get_desk_link("Building", existing)
				)
			)

	def validate_building_type(self):
		"""A building holds either rooms or hostel rooms, never both, so its type follows its rooms."""
		if self.is_new() or not self.has_value_changed("building_type"):
			return

		other_kind = "Room" if self.building_type == "Hostel" else "Hostel Room"
		if frappe.db.exists(other_kind, {"building": self.name}):
			frappe.throw(
				_(
					"Building {0} still has {1} records. Move them to another building before changing its type."
				).format(frappe.bold(self.building_name), _(other_kind))
			)

		if self.building_type != "Hostel":
			hostel = frappe.db.get_value("Hostel", {"default_building": self.name})
			if hostel:
				frappe.throw(
					_("Hostel {0} uses Building {1} as its default building. Change that first.").format(
						frappe.bold(hostel), frappe.bold(self.building_name)
					)
				)

	def validate_floor_count(self):
		"""Fewer floors must still hold every room's floor."""
		if self.is_new() or not self.has_value_changed("floors"):
			return

		from education.education.doctype.floor.floor import get_rooms_above_floor_count

		rooms = get_rooms_above_floor_count({self.name: self.floors})
		if rooms:
			frappe.throw(
				_("Building {0} would have no floor for these rooms: {1}. Move them first.").format(
					frappe.bold(self.building_name), ", ".join(frappe.bold(room) for room in rooms)
				)
			)

	def validate_hostel_rooms_campus(self):
		"""Hostel rooms take their campus from the hostel, so a move must not split them."""
		if self.is_new() or not self.campus:
			return

		other_campus = frappe.db.get_value(
			"Hostel Room",
			{"building": self.name, "campus": ("not in", [self.campus, ""])},
			["name", "campus"],
			as_dict=True,
		)
		if other_campus:
			frappe.throw(
				_("Hostel Room {0} in this building belongs to Campus {1}.").format(
					frappe.bold(other_campus.name), frappe.bold(other_campus.campus)
				)
			)

		hostel = frappe.db.get_value(
			"Hostel",
			{"default_building": self.name, "campus": ("not in", [self.campus, ""])},
			["name", "campus"],
			as_dict=True,
		)
		if hostel:
			frappe.throw(
				_("Hostel {0} uses this building as its default and belongs to Campus {1}.").format(
					frappe.bold(hostel.name), frappe.bold(hostel.campus)
				)
			)


def get_building_location(building):
	"""Company, campus, type and disabled flag of a building, for records placed in it."""
	return frappe.db.get_value(
		"Building", building, ["company", "campus", "building_type", "disabled"], as_dict=True
	)


def validate_building_type(building, location, building_type):
	"""Rooms go in Academic buildings and hostel rooms in Hostel buildings."""
	if location.building_type != building_type:
		frappe.throw(
			_("Building {0} is a {1} building. Pick a {2} building.").format(
				frappe.bold(building), _(location.building_type), _(building_type)
			)
		)


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def building_query(
	doctype: str,
	txt: str,
	searchfield: str,
	start: int,
	page_len: int,
	filters: dict[str, Any],
):
	"""Enabled hostel buildings on a hostel's campus.

	Pass `hostel` to look its campus up here, so the form needs no site fields, or pass
	`company` and `campus` directly for a hostel that is not saved yet.
	"""
	filters = filters or {}
	building = frappe.qb.DocType("Building")
	query = (
		frappe.qb.get_query("Building", fields=["name", "building_name"], ignore_permissions=False)
		.where(building.disabled == 0)
		.where(building.building_type == "Hostel")
		.where(building.name.like(f"%{txt}%") | building.building_name.like(f"%{txt}%"))
		.orderby(building.building_name)
		.limit(page_len)
		.offset(start)
	)

	if filters.get("hostel"):
		site = frappe.db.get_value("Hostel", filters["hostel"], ["company", "campus"], as_dict=True)
	elif filters.get("company"):
		site = frappe._dict(company=filters["company"], campus=filters.get("campus"))
	else:
		site = None

	if site:
		query = query.where(building.company == site.company)
		query = query.where(IfNull(building.campus, "") == (site.campus or ""))

	return query.run()
