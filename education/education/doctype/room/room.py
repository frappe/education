# Copyright (c) 2015, Frappe Technologies and contributors
# For license information, please see license.txt

from typing import Any

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.query_builder.functions import IfNull

from education.education.doctype.building.building import get_building_location, validate_building_type
from education.education.doctype.campus.campus import validate_campus
from education.education.doctype.facility.facility import validate_facilities
from education.education.doctype.floor.floor import validate_floor_in_building


class Room(Document):
	def validate(self):
		self.set_location_from_building()
		validate_campus(self, required=True)
		validate_facilities(self, self.campus)
		validate_floor_in_building(self)

	def set_location_from_building(self):
		if not self.building:
			return

		building = get_building_location(self.building)
		if building.disabled and self.has_value_changed("building"):
			frappe.throw(_("Building {0} is disabled.").format(frappe.bold(self.building)))
		validate_building_type(self.building, building, "Academic")
		# The building is the source of truth for where the room is.
		self.company = building.company
		if building.campus:
			self.campus = building.campus


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def room_query(
	doctype: str,
	txt: str,
	searchfield: str,
	start: int,
	page_len: int,
	filters: dict[str, Any],
):
	"""Enabled rooms on the selected campus, plus rooms shared across campuses."""
	frappe.has_permission("Room", "read", throw=True)
	filters = filters or {}
	room = frappe.qb.DocType("Room")
	query = (
		frappe.qb.from_(room)
		.select(room.name, room.room_name)
		.where(room.disabled == 0)
		.where(room.name.like(f"%{txt}%") | room.room_name.like(f"%{txt}%"))
		.orderby(room.room_name)
		.limit(page_len)
		.offset(start)
	)

	campus = filters.get("campus")
	if campus:
		query = query.where((IfNull(room.campus, "") == "") | (room.campus == campus))

	return query.run()
