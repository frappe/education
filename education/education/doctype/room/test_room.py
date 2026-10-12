# Copyright (c) 2015, Frappe Technologies and Contributors
# See license.txt

import frappe
from frappe.tests.utils import FrappeTestCase

from education.education.doctype.room.room import room_query
from education.education.doctype.room_booking.test_room_booking import make_room


class TestRoom(FrappeTestCase):
	def setUp(self):
		self.addCleanup(frappe.db.rollback)

	def test_facility_can_only_be_added_once(self):
		room = make_room("_Test Facility Room")
		facility = frappe.get_doc(
			{
				"doctype": "Facility",
				"facility_name": "_Test Projector",
				"company": room.company,
				"campus": room.campus,
			}
		).insert()
		room.append("facilities", {"facility": facility.name, "quantity": 1})
		room.append("facilities", {"facility": facility.name, "quantity": 2})
		self.assertRaises(frappe.ValidationError, room.save)

	def test_disabled_rooms_are_not_offered(self):
		room = make_room("_Test Disabled Room", disabled=1)
		names = [row[0] for row in room_query("Room", "_Test Disabled", "name", 0, 20, {})]
		self.assertNotIn(room.name, names)
