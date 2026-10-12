# Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and Contributors
# See license.txt

import frappe
from frappe.tests.utils import FrappeTestCase

from education.education.doctype.building.test_building import make_building
from education.education.doctype.floor.floor import (
	create_default_floors,
	match_default_floor,
)


class TestFloor(FrappeTestCase):
	def setUp(self):
		self.addCleanup(frappe.db.rollback)
		create_default_floors()

	def test_free_text_matches_default_floors(self):
		for text, floor in (
			("1", "First Floor"),
			("1st floor", "First Floor"),
			("First", "First Floor"),
			("Ground", "Ground Floor"),
			("G", "Ground Floor"),
			("basement", "Basement"),
			("4th", "Fourth Floor"),
		):
			self.assertEqual(match_default_floor(text), floor, text)
		self.assertIsNone(match_default_floor("Mezzanine"))
		self.assertIsNone(match_default_floor("12"))

	def test_room_floor_must_exist_in_its_building(self):
		building = make_building(floors=2)
		room = frappe.get_doc(
			{
				"doctype": "Room",
				"room_name": "_Test Floor Room",
				"building": building.name,
				"floor": "First Floor",
			}
		).insert()

		room.floor = "Second Floor"
		self.assertRaises(frappe.ValidationError, room.save)

		room.reload()
		room.floor = "Basement"
		room.save()

	def test_level_change_must_fit_existing_rooms(self):
		building = make_building(floors=3)
		frappe.get_doc(
			{
				"doctype": "Room",
				"room_name": "_Test Level Room",
				"building": building.name,
				"floor": "Second Floor",
			}
		).insert()

		floor = frappe.get_doc("Floor", "Second Floor")
		floor.level = 3
		self.assertRaises(frappe.ValidationError, floor.save)
