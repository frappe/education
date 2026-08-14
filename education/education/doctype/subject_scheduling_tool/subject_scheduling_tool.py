# Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt


import calendar

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import add_days, formatdate, getdate

from education.education.utils import OverlapError


class SubjectSchedulingTool(Document):
	@frappe.whitelist()
	def schedule_subjects(self):
		"""Creates subject schedules for each weekday slot in the date range."""

		subject_schedules = []
		subject_schedules_errors = []
		rescheduled = []
		reschedule_errors = []

		self.validate_mandatory()
		self.validate_date()

		course = frappe.db.get_value("Student Batch Name", self.student_batch, "course")
		if course:
			self.course = course

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

	def validate_mandatory(self):
		if not self.slots:
			frappe.throw(_("Please add at least one weekly slot."))

		for slot in self.slots:
			for field in ("day", "subject", "faculty", "room", "from_time", "to_time"):
				if not slot.get(field):
					frappe.throw(
						_("Row {0}: {1} is mandatory").format(slot.idx, _(slot.meta.get_label(field)))
					)
			if slot.from_time > slot.to_time:
				frappe.throw(
					_("Row {0}: From Time cannot be greater than To Time.").format(slot.idx)
				)

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

	def delete_subject_schedule(self, rescheduled, reschedule_errors, days):
		"""Delete subject schedules in the date range for the selected weekdays."""
		schedules = frappe.get_list(
			"Subject Schedule",
			fields=["name", "schedule_date"],
			filters=[
				["student_batch", "=", self.student_batch],
				["schedule_date", ">=", self.from_date],
				["schedule_date", "<=", self.to_date],
			],
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
