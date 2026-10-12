# Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and Contributors
# See license.txt

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import nowdate

from education.education.doctype.hostel_allocation.test_hostel_allocation import (
	get_test_campus,
	get_test_company,
)
from education.education.utils import OverlapError


def make_room(name="_Test Booking Room", capacity=10, **kwargs):
	company = get_test_company()
	return frappe.get_doc(
		{
			"doctype": "Room",
			"room_name": name,
			"room_type": "Meeting Room",
			"seating_capacity": capacity,
			"company": company,
			"campus": get_test_campus(company),
			**kwargs,
		}
	).insert()


def make_booking(room, from_time="09:00:00", to_time="10:00:00", attendees=5, submit=True):
	booking = frappe.get_doc(
		{
			"doctype": "Room Booking",
			"room": room,
			"purpose": "Department meeting",
			"schedule_date": nowdate(),
			"from_time": from_time,
			"to_time": to_time,
			"attendees": attendees,
		}
	).insert()
	if submit:
		booking.submit()
	return booking


class TestRoomBooking(FrappeTestCase):
	def setUp(self):
		self.addCleanup(frappe.db.rollback)
		self.room = make_room()

	def test_overlapping_bookings_are_rejected(self):
		make_booking(self.room.name)
		self.assertRaises(OverlapError, make_booking, self.room.name, "09:30:00", "10:30:00")
		# Back-to-back bookings are fine.
		make_booking(self.room.name, "10:00:00", "11:00:00")

	def test_booking_must_fit_the_room(self):
		self.assertRaises(frappe.ValidationError, make_booking, self.room.name, attendees=11)
		self.assertRaises(frappe.ValidationError, make_booking, self.room.name, "11:00:00", "10:00:00")

	def test_disabled_room_cannot_be_booked(self):
		self.room.db_set("disabled", 1)
		self.assertRaises(frappe.ValidationError, make_booking, self.room.name)

	def test_cancelled_booking_frees_the_slot(self):
		make_booking(self.room.name).cancel()
		make_booking(self.room.name)
