# Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import cint, to_timedelta

from education.education.doctype.campus.campus import apply_room_campus
from education.education.utils import validate_overlap_for


class RoomBooking(Document):
	def validate(self):
		self.validate_times()
		apply_room_campus(self)
		self.validate_capacity()
		self.validate_overlap()

	def validate_times(self):
		if to_timedelta(self.from_time) >= to_timedelta(self.to_time):
			frappe.throw(_("To Time must be after From Time."))

	def validate_capacity(self):
		capacity = cint(frappe.db.get_value("Room", self.room, "seating_capacity"))
		if capacity and cint(self.attendees) > capacity:
			frappe.throw(
				_("Room {0} seats {1}, but {2} attendees are expected.").format(
					frappe.bold(self.room), capacity, cint(self.attendees)
				)
			)

	def validate_overlap(self):
		"""A room can hold one booking, class or exam at a time."""
		for doctype in ("Room Booking", "Subject Schedule", "Assessment Plan"):
			validate_overlap_for(self, doctype, "room")
