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
	pass


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
