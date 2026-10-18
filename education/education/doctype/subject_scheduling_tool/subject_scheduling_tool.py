# Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt


import calendar

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import add_days, cint, formatdate, get_time, getdate

from education.education.doctype.faculty.faculty import get_taught_faculty_subjects
from education.education.utils import OverlapError

IGNORE_FIELDTYPES = {
	"Section Break",
	"Column Break",
	"Tab Break",
	"HTML",
	"Heading",
	"Fold",
}


class SubjectSchedulingTool(Document):
	@frappe.whitelist()
	def schedule_subjects(self):
		"""Creates subject schedules for each weekday slot in the date range."""

		subject_schedules = []
		subject_schedules_errors = []
		rescheduled = []
		reschedule_errors = []

		self.set_course_from_batch()
		self.validate_mandatory()
		self.validate_batch()
		self.validate_date()
		self.validate_slots()

		days = list({slot.day for slot in self.slots})

		if self.reschedule:
			rescheduled, reschedule_errors = self.delete_subject_schedule(
				rescheduled, reschedule_errors, days
			)

		date = getdate(self.from_date)
		end_date = getdate(self.to_date)
		slots_by_day = {}
		for slot in self.slots:
			slots_by_day.setdefault(slot.day, []).append(slot)

		while date <= end_date:
			day_name = calendar.day_name[date.weekday()]
			for slot in slots_by_day.get(day_name, []):
				subject_schedule = self.make_subject_schedule(date, slot)
				try:
					subject_schedule.save()
				except OverlapError:
					subject_schedules_errors.append(
						{"date": date, "subject": slot.subject, "faculty": slot.faculty}
					)
				else:
					subject_schedules.append(subject_schedule)

			date = add_days(date, 1)

		return dict(
			subject_schedules=subject_schedules,
			subject_schedules_errors=subject_schedules_errors,
			rescheduled=rescheduled,
			reschedule_errors=reschedule_errors,
		)

	def set_course_from_batch(self):
		if not self.student_batch:
			return

		course = frappe.db.get_value("Student Batch Name", self.student_batch, "course")
		if course:
			self.course = course

	def validate_mandatory(self):
		"""Reject scheduling when any required form field is empty."""
		for df in self.meta.get("fields", []):
			if not cint(df.reqd) or df.fieldtype in IGNORE_FIELDTYPES:
				continue
			if not self.get(df.fieldname):
				frappe.throw(_("{0} is mandatory").format(_(df.label or df.fieldname)))

		if not self.slots:
			frappe.throw(_("Please add at least one weekly slot."))

		for slot in self.slots:
			for df in slot.meta.get("fields", []):
				if not cint(df.reqd) or df.fieldtype in IGNORE_FIELDTYPES:
					continue
				if not slot.get(df.fieldname):
					frappe.throw(_("Row {0}: {1} is mandatory").format(slot.idx, _(df.label or df.fieldname)))
			if get_time(slot.from_time) >= get_time(slot.to_time):
				frappe.throw(
					_("Row {0}: From Time cannot be greater than or equal to To Time.").format(slot.idx)
				)

	def validate_batch(self):
		if not self.student_batch:
			return

		disabled = frappe.db.get_value("Student Batch Name", self.student_batch, "disabled")
		if cint(disabled):
			frappe.throw(_("Student Batch {0} is disabled.").format(frappe.bold(self.student_batch)))

	def validate_date(self):
		if getdate(self.from_date) > getdate(self.to_date):
			frappe.throw(_("From Date cannot be greater than To Date."))

		start_date, end_date = frappe.db.get_value(
			"Student Batch Name", self.student_batch, ["start_date", "end_date"]
		)
		if not (start_date and end_date):
			return

		start_date, end_date = getdate(start_date), getdate(end_date)
		if getdate(self.from_date) < start_date or getdate(self.to_date) > end_date:
			frappe.throw(
				_("Schedule dates must lie within the duration of Batch {0} ({1} to {2}).").format(
					frappe.bold(self.student_batch),
					formatdate(start_date),
					formatdate(end_date),
				)
			)

	def validate_slots(self):
		subjects = list({slot.subject for slot in self.slots if slot.subject})
		faculties = list({slot.faculty for slot in self.slots if slot.faculty})
		subject_courses = {}
		if subjects:
			subject_courses = {
				row.name: row.course
				for row in frappe.get_all(
					"Subject",
					filters={"name": ["in", subjects]},
					fields=["name", "course"],
				)
			}
		taught = get_taught_faculty_subjects(faculties, subjects)

		for slot in self.slots:
			if slot.subject and self.course:
				subject_course = subject_courses.get(slot.subject)
				if subject_course and subject_course != self.course:
					frappe.throw(
						_("Row {0}: Subject {1} does not belong to Course {2}").format(
							slot.idx, frappe.bold(slot.subject), frappe.bold(self.course)
						)
					)

			if slot.faculty and slot.subject and (slot.faculty, slot.subject) not in taught:
				frappe.throw(
					_("Row {0}: Faculty {1} does not teach Subject {2}").format(
						slot.idx, frappe.bold(slot.faculty), frappe.bold(slot.subject)
					)
				)

		self.validate_slot_overlaps()

	def validate_slot_overlaps(self):
		slots = list(self.slots)
		for i, first in enumerate(slots):
			for second in slots[i + 1 :]:
				if first.day != second.day:
					continue
				if not times_overlap(first.from_time, first.to_time, second.from_time, second.to_time):
					continue
				if first.faculty and first.faculty == second.faculty:
					frappe.throw(
						_("Row {0} and {1}: Faculty {2} is double-booked on {3}.").format(
							first.idx, second.idx, frappe.bold(first.faculty), _(first.day)
						)
					)
				if first.room and first.room == second.room:
					frappe.throw(
						_("Row {0} and {1}: Room {2} is double-booked on {3}.").format(
							first.idx, second.idx, frappe.bold(first.room), _(first.day)
						)
					)
				frappe.throw(
					_("Row {0} and {1}: Slots overlap on {2} for the same batch.").format(
						first.idx, second.idx, _(first.day)
					)
				)

	def delete_subject_schedule(self, rescheduled, reschedule_errors, days):
		"""Delete matching subject schedules in the date range for selected weekdays."""
		subjects = list({slot.subject for slot in self.slots if slot.subject})
		filters = [
			["student_batch", "=", self.student_batch],
			["schedule_date", ">=", self.from_date],
			["schedule_date", "<=", self.to_date],
		]
		if subjects:
			filters.append(["subject", "in", subjects])

		schedules = frappe.get_list(
			"Subject Schedule",
			fields=["name", "schedule_date"],
			filters=filters,
		)

		for d in schedules:
			try:
				if calendar.day_name[getdate(d.schedule_date).weekday()] in days:
					frappe.delete_doc("Subject Schedule", d.name)
					rescheduled.append(d.name)
			except Exception:
				reschedule_errors.append(d.name)
		return rescheduled, reschedule_errors

	def make_subject_schedule(self, date, slot):
		subject_schedule = frappe.new_doc("Subject Schedule")
		subject_schedule.student_batch = self.student_batch
		subject_schedule.course = self.course
		subject_schedule.subject = slot.subject
		subject_schedule.faculty = slot.faculty
		subject_schedule.faculty_name = slot.faculty_name
		subject_schedule.room = slot.room
		subject_schedule.schedule_date = date
		subject_schedule.from_time = slot.from_time
		subject_schedule.to_time = slot.to_time
		subject_schedule.class_schedule_color = self.class_schedule_color
		return subject_schedule


def times_overlap(from_a, to_a, from_b, to_b):
	from_a, to_a, from_b, to_b = (
		get_time(from_a),
		get_time(to_a),
		get_time(from_b),
		get_time(to_b),
	)
	return from_a < to_b and from_b < to_a
