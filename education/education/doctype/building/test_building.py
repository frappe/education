# Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and Contributors
# See license.txt

import frappe
from frappe.tests.utils import FrappeTestCase

from education.education.doctype.building.building import building_query
from education.education.doctype.hostel_allocation.test_hostel_allocation import (
	get_test_campus,
	get_test_company,
	make_hostel,
	make_hostel_room,
)


def make_building(name="_Test Science Block", **kwargs):
	company = get_test_company()
	return frappe.get_doc(
		{
			"doctype": "Building",
			"building_name": name,
			"building_code": "SCI",
			"company": company,
			"campus": get_test_campus(company),
			**kwargs,
		}
	).insert()


class TestBuilding(FrappeTestCase):
	def setUp(self):
		self.addCleanup(frappe.db.rollback)

	def test_room_takes_campus_from_building(self):
		building = make_building()
		room = frappe.get_doc(
			{"doctype": "Room", "room_name": "_Test Lab 1", "building": building.name}
		).insert()
		self.assertEqual((room.company, room.campus), (building.company, building.campus))

	def test_building_name_is_unique_per_campus(self):
		make_building()
		self.assertRaises(frappe.ValidationError, make_building)

	def test_disabled_building_takes_no_new_rooms(self):
		building = make_building(disabled=1)
		room = frappe.get_doc({"doctype": "Room", "room_name": "_Test Lab 2", "building": building.name})
		self.assertRaises(frappe.ValidationError, room.insert)

	def test_hostel_room_building_must_share_the_hostel_campus(self):
		hostel = make_hostel()
		room = make_hostel_room(hostel.name)
		room.building = make_building(building_type="Hostel").name
		room.save()

		other_campus = frappe.get_doc(
			{
				"doctype": "Campus",
				"campus_name": "_Test Other Campus",
				"campus_code": "TOC",
				"company": hostel.company,
			}
		).insert()
		room.building = make_building(
			"_Test Far Block", campus=other_campus.name, building_type="Hostel"
		).name
		self.assertRaises(frappe.ValidationError, room.save)

	def test_hostel_room_building_search_follows_the_hostel(self):
		hostel = make_hostel()
		near = make_building(building_type="Hostel")
		academic = make_building("_Test Lecture Block")
		other_campus = frappe.get_doc(
			{
				"doctype": "Campus",
				"campus_name": "_Test Other Campus",
				"campus_code": "TOC",
				"company": hostel.company,
			}
		).insert()
		far = make_building("_Test Far Block", campus=other_campus.name, building_type="Hostel")

		def search(txt):
			return [row[0] for row in building_query("Building", txt, "name", 0, 20, {"hostel": hostel.name})]

		self.assertIn(near.name, search(""))
		self.assertIn(near.name, search(near.name))
		self.assertIn(near.name, search("Science"))
		self.assertNotIn(far.name, search(""))
		self.assertNotIn(academic.name, search(""))

	def test_building_holds_rooms_or_hostel_rooms_not_both(self):
		academic = make_building()
		residence = make_building("_Test Residence", building_type="Hostel")

		room = frappe.get_doc({"doctype": "Room", "room_name": "_Test Lab 3", "building": residence.name})
		self.assertRaises(frappe.ValidationError, room.insert)
		room.building = academic.name
		room.insert()

		hostel_room = make_hostel_room(make_hostel().name)
		hostel_room.building = academic.name
		self.assertRaises(frappe.ValidationError, hostel_room.save)

		# A building's type cannot change while it holds rooms of the current type.
		academic.building_type = "Hostel"
		self.assertRaises(frappe.ValidationError, academic.save)

	def test_hostel_default_building(self):
		residence = make_building("_Test Residence", building_type="Hostel")
		annex = make_building("_Test Annex", building_type="Hostel")
		hostel = make_hostel()
		hostel.default_building = residence.name
		hostel.save()

		# New rooms start in the default building and can be moved to another hostel building.
		first = make_hostel_room(hostel.name, room_number="201")
		self.assertEqual(first.building, residence.name)
		second = frappe.get_doc(
			{"doctype": "Hostel Room", "hostel": hostel.name, "room_number": "202", "building": annex.name}
		).insert()
		self.assertEqual(second.building, annex.name)

		hostel.reload()
		self.assertEqual(
			[(b.building_name, b.rooms) for b in hostel.get_buildings_in_use()],
			[("_Test Annex", 1), ("_Test Residence", 1)],
		)

		hostel.default_building = make_building("_Test Lecture Hall").name
		self.assertRaises(frappe.ValidationError, hostel.save)

	def test_building_search_for_an_unsaved_hostel(self):
		residence = make_building("_Test Residence", building_type="Hostel")
		results = building_query(
			"Building", "", "name", 0, 20, {"company": residence.company, "campus": residence.campus or ""}
		)
		self.assertIn(residence.name, [row[0] for row in results])
