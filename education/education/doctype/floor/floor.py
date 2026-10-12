# Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

import re

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import cint

# Created on install, and the names that existing free-text floors are matched against.
DEFAULT_FLOORS = (
	{"floor_name": "Basement", "abbreviation": "B", "level": -1},
	{"floor_name": "Ground Floor", "abbreviation": "G", "level": 0},
	{"floor_name": "First Floor", "abbreviation": "1", "level": 1},
	{"floor_name": "Second Floor", "abbreviation": "2", "level": 2},
	{"floor_name": "Third Floor", "abbreviation": "3", "level": 3},
	{"floor_name": "Fourth Floor", "abbreviation": "4", "level": 4},
)

# Ways of writing each default floor, after lowercasing and dropping the word "floor".
FLOOR_SPELLINGS = {
	-1: ("basement", "b", "-1"),
	0: ("ground", "g", "0", "gf"),
	1: ("first", "1", "1st"),
	2: ("second", "2", "2nd"),
	3: ("third", "3", "3rd"),
	4: ("fourth", "4", "4th"),
}


class Floor(Document):
	def validate(self):
		if self.is_new() or not self.has_value_changed("level"):
			return

		rooms = get_rooms_above_floor_count(floor=self.name, level=self.level)
		if rooms:
			frappe.throw(
				_(
					"At level {0}, {1} would be above the top floor of the building these rooms are in: {2}."
				).format(
					self.level, frappe.bold(self.floor_name), ", ".join(frappe.bold(room) for room in rooms)
				)
			)


def create_default_floors():
	for floor in DEFAULT_FLOORS:
		if not frappe.db.exists("Floor", floor["floor_name"]):
			frappe.get_doc({"doctype": "Floor", **floor}).insert(ignore_permissions=True)


def match_default_floor(text):
	"""The default floor that free text such as "1st", "Ground" or "2nd floor" means, if any."""
	key = re.sub(r"\bfloor\b", "", (text or "").lower()).strip(" .-_")
	for floor in DEFAULT_FLOORS:
		if key in FLOOR_SPELLINGS[floor["level"]]:
			return floor["floor_name"]
	return None


def get_rooms_above_floor_count(floor_counts=None, floor=None, level=None):
	"""Rooms and hostel rooms whose floor would not fit their building.

	Pass `floor_counts` ({building: floors}) to try new floor counts, or `floor` and `level`
	to try a new level for one floor. Buildings without a floor count are not checked.
	"""
	rooms = []
	for doctype in ("Room", "Hostel Room"):
		room = frappe.qb.DocType(doctype)
		building = frappe.qb.DocType("Building")
		floor_table = frappe.qb.DocType("Floor")
		query = (
			frappe.qb.from_(room)
			.join(building)
			.on(building.name == room.building)
			.join(floor_table)
			.on(floor_table.name == room.floor)
			.select(room.name, building.name.as_("building"), building.floors, floor_table.level)
		)
		if floor_counts:
			query = query.where(building.name.isin(list(floor_counts)))
		if floor:
			query = query.where(floor_table.name == floor)

		for row in query.run(as_dict=True):
			floors = cint(floor_counts[row.building]) if floor_counts else cint(row.floors)
			room_level = cint(level) if floor else cint(row.level)
			if floors and room_level >= floors:
				rooms.append(row.name)
	return rooms


def validate_floor_in_building(doc):
	"""A room's floor must exist in its building. Basements are always allowed."""
	if not doc.get("floor") or not doc.get("building"):
		return

	floors = cint(frappe.db.get_value("Building", doc.building, "floors"))
	level = cint(frappe.db.get_value("Floor", doc.floor, "level"))
	if floors and level >= floors:
		frappe.throw(
			_("Building {0} has {1} floors, not counting basements, so it has no {2}.").format(
				frappe.bold(doc.building), floors, frappe.bold(doc.floor)
			)
		)
