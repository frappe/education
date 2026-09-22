# Copyright (c) 2015, Frappe Technologies and contributors
# For license information, please see license.txt


import frappe
from erpnext import get_default_company
from erpnext.setup.doctype.holiday_list.holiday_list import is_holiday
from frappe import _
from frappe.model.document import Document
from frappe.utils import formatdate, get_link_to_form, getdate

from education.education.api import get_batch_students, validate_attendance_date


class StudentAttendance(Document):
	def validate(self):
		self.validate_mandatory()
		self.validate_date()
		self.set_date()
		self.set_student_batch()
		self.validate_student()
		self.validate_duplication()
		self.validate_is_holiday()

	def set_date(self):
		if self.subject_schedule:
			self.date = frappe.db.get_value(
				"Subject Schedule", self.subject_schedule, "schedule_date"
			)

	def validate_mandatory(self):
		if not (self.student_batch or self.subject_schedule):
			frappe.throw(
				_("{0} or {1} is mandatory").format(
					frappe.bold(_("Student Batch")), frappe.bold(_("Subject Schedule"))
				),
				title=_("Mandatory Fields"),
			)

	def validate_date(self):
		if not self.leave_application and getdate(self.date) > getdate():
			frappe.throw(_("Attendance cannot be marked for future dates."))

		if self.student_batch:
			validate_attendance_date(self.student_batch, self.date)

	def set_student_batch(self):
		if self.subject_schedule:
			self.student_batch = frappe.db.get_value(
				"Subject Schedule", self.subject_schedule, "student_batch"
			)

	def validate_student(self):
		if not self.student_batch:
			return

		batch_students = [d.student for d in get_batch_students(self.student_batch)]
		if self.student not in batch_students:
			batch_link = get_link_to_form("Student Batch Name", self.student_batch)
			frappe.throw(
				_("Student {0}: {1} is not enrolled in Batch {2}").format(
					frappe.bold(self.student), self.student_name, batch_link
				)
			)

	def validate_duplication(self):
		"""Check if the Attendance Record is Unique"""
		attendance_record = None
		if self.subject_schedule:
			attendance_record = frappe.db.exists(
				"Student Attendance",
				{
					"student": self.student,
					"subject_schedule": self.subject_schedule,
					"docstatus": ("!=", 2),
					"name": ("!=", self.name),
				},
			)
		else:
			attendance_record = frappe.db.exists(
				"Student Attendance",
				{
					"student": self.student,
					"student_batch": self.student_batch,
					"date": self.date,
					"docstatus": ("!=", 2),
					"name": ("!=", self.name),
				},
			)

		if attendance_record:
			record = get_link_to_form("Student Attendance", attendance_record)
			frappe.throw(
				_("Student Attendance record {0} already exists against the Student {1}").format(
					record, frappe.bold(self.student)
				),
				title=_("Duplicate Entry"),
			)

	def validate_is_holiday(self):
		holiday_list = get_holiday_list()
		if is_holiday(holiday_list, self.date):
			frappe.throw(
				_("Attendance cannot be marked for {0} as it is a holiday.").format(
					frappe.bold(formatdate(self.date))
				)
			)


def get_holiday_list(company=None):
	if not company:
		company = get_default_company() or frappe.get_all("Company")[0].name

	holiday_list = frappe.get_cached_value("Company", company, "default_holiday_list")
	if not holiday_list:
		frappe.throw(
			_("Please set a default Holiday List for Company {0}").format(
				frappe.bold(get_default_company())
			)
		)
	return holiday_list
