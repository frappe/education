# Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import cint, getdate


class StudentBatchName(Document):
	def validate(self):
		self.validate_dates()
		self.validate_company()
		self.validate_strength()

	def validate_dates(self):
		if (
			self.start_date
			and self.end_date
			and getdate(self.end_date) < getdate(self.start_date)
		):
			frappe.throw(_("End Date cannot be before Start Date"))

	def validate_company(self):
		if not self.course:
			return

		course_company = frappe.db.get_value("Course", self.course, "company")
		if course_company and self.company and course_company != self.company:
			frappe.throw(
				_("Company {0} does not match the Company {1} of Course {2}").format(
					frappe.bold(self.company), frappe.bold(course_company), frappe.bold(self.course)
				)
			)

	def validate_strength(self):
		if cint(self.max_strength) < 0:
			frappe.throw(_("Max Strength cannot be less than zero."))

		if not self.max_strength or self.is_new():
			return

		occupancy = get_batch_occupancy(self.name)
		if occupancy > cint(self.max_strength):
			frappe.throw(
				_(
					"Batch already has {0} students enrolled or approved, Max Strength cannot be set to {1}."
				).format(frappe.bold(occupancy), frappe.bold(self.max_strength))
			)


def get_batch_strength(batch):
	"""Return the number of students enrolled in the batch."""
	return frappe.db.count("Course Enrollment", {"student_batch": batch, "docstatus": 1})


def get_batch_occupancy(batch, exclude_applicant=None, exclude_enrollment=None):
	"""Return seats taken by submitted enrollments and approved applicants not yet enrolled."""
	if not batch:
		return 0

	enrollment_filters = {"student_batch": batch, "docstatus": 1}
	if exclude_enrollment:
		enrollment_filters["name"] = ("!=", exclude_enrollment)

	enrolled = frappe.db.count("Course Enrollment", enrollment_filters)

	enrolled_applicants = set(
		frappe.get_all(
			"Course Enrollment",
			filters={
				"student_batch": batch,
				"docstatus": 1,
				"student_applicant": ("is", "set"),
			},
			pluck="student_applicant",
		)
	)

	approved_applicants = frappe.get_all(
		"Student Applicant",
		filters={"student_batch": batch, "application_status": "Approved"},
		pluck="name",
	)
	reserved = sum(
		1
		for name in approved_applicants
		if name != exclude_applicant and name not in enrolled_applicants
	)

	return enrolled + reserved


def validate_batch_capacity(batch, exclude_applicant=None, exclude_enrollment=None):
	"""Raise if the batch has no remaining seats. 0 max strength means no limit."""
	if not batch:
		return

	max_strength = frappe.db.get_value("Student Batch Name", batch, "max_strength")
	if not cint(max_strength):
		return

	occupancy = get_batch_occupancy(batch, exclude_applicant, exclude_enrollment)
	if occupancy >= cint(max_strength):
		frappe.throw(
			_("Batch {0} has reached its maximum strength of {1}.").format(
				frappe.bold(batch), frappe.bold(max_strength)
			)
		)


def get_batch_students(batch, include_inactive=0):
	"""Return the students enrolled in the batch, ordered by roll number.

	Students of a batch are derived from submitted Course Enrollments instead of being
	maintained on the batch itself.

	:param batch: Student Batch Name.
	:param include_inactive: Include students that have been disabled.
	"""
	if not batch:
		return []

	enrollment = frappe.qb.DocType("Course Enrollment")
	student = frappe.qb.DocType("Student")

	query = (
		frappe.qb.from_(enrollment)
		.inner_join(student)
		.on(enrollment.student == student.name)
		.select(
			enrollment.student,
			enrollment.student_name,
			enrollment.roll_number,
			enrollment.name.as_("course_enrollment"),
			student.enabled.as_("active"),
		)
		.where(enrollment.student_batch == batch)
		.where(enrollment.docstatus == 1)
		.orderby(enrollment.roll_number)
		.orderby(enrollment.student_name)
	)

	if not cint(include_inactive):
		query = query.where(student.enabled == 1)

	return query.run(as_dict=True)
