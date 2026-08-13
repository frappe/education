# Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt


import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt


class AssessmentPlan(Document):
	def validate(self):
		self.validate_overlap()
		self.validate_max_score()
		self.validate_subject()
		self.validate_academic_year_and_term()
		self.validate_company()

	def validate_subject(self):
		if not (self.subject and self.course):
			return

		subject_course = frappe.db.get_value("Subject", self.subject, "course")
		if subject_course and subject_course != self.course:
			frappe.throw(
				_("Subject {0} does not belong to Course {1}").format(
					frappe.bold(self.subject), frappe.bold(self.course)
				)
			)

	def validate_academic_year_and_term(self):
		if not (self.academic_year and self.academic_term):
			return

		term_year = frappe.db.get_value("Academic Term", self.academic_term, "academic_year")
		if term_year and term_year != self.academic_year:
			frappe.throw(
				_("Academic Term {0} does not belong to Academic Year {1}").format(
					frappe.bold(self.academic_term), frappe.bold(self.academic_year)
				)
			)

	def validate_company(self):
		if not self.company:
			return

		for doctype, value in (
			("Course", self.course),
			("Academic Year", self.academic_year),
			("Academic Term", self.academic_term),
		):
			if not value:
				continue

			company = frappe.db.get_value(doctype, value, "company")
			if company and company != self.company:
				frappe.throw(
					_("Company must be the same as that of {0} {1}").format(
						_(doctype), frappe.bold(value)
					)
				)

	def validate_overlap(self):
		"""Validates overlap for Batch, Instructor, Room"""

		from education.education.utils import validate_overlap_for

		# Validate overlapping course schedules.
		if self.student_batch:
			validate_overlap_for(self, "Course Schedule", "student_batch")

		validate_overlap_for(self, "Course Schedule", "instructor")
		validate_overlap_for(self, "Course Schedule", "room")

		# validate overlapping assessment schedules.
		if self.student_batch:
			validate_overlap_for(self, "Assessment Plan", "student_batch")

		validate_overlap_for(self, "Assessment Plan", "room")
		validate_overlap_for(self, "Assessment Plan", "supervisor", self.supervisor)

	def validate_max_score(self):
		if flt(self.maximum_assessment_score) <= 0:
			frappe.throw(_("Maximum Score must be greater than zero"))
