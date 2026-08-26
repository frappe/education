# Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt


import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt, get_link_to_form
from frappe.utils.csvutils import getlink

import education.education
from education.education.api import get_grade


class AssessmentResult(Document):
	def validate(self):
		education.education.validate_student_belongs_to_batch(
			self.student, self.student_batch
		)
		self.validate_assessment_plan()
		self.validate_maximum_score()
		self.validate_grade()
		self.validate_duplicate()

	def before_cancel(self):
		self.validate_computed_grade_book()

	def validate_assessment_plan(self):
		if not self.assessment_plan:
			return

		plan_status = frappe.db.get_value(
			"Assessment Plan", self.assessment_plan, "docstatus"
		)
		if plan_status != 1:
			frappe.throw(
				_("Assessment Plan {0} must be submitted").format(frappe.bold(self.assessment_plan))
			)

	def validate_maximum_score(self):
		self.maximum_score = frappe.db.get_value(
			"Assessment Plan", self.assessment_plan, "maximum_assessment_score"
		)

		if not self.maximum_score:
			frappe.throw(
				_("Maximum Score is not set on Assessment Plan {0}").format(
					frappe.bold(self.assessment_plan)
				)
			)

		if flt(self.score) > flt(self.maximum_score):
			frappe.throw(_("Score cannot be greater than Maximum Score"))

		if flt(self.score) < 0:
			frappe.throw(_("Score cannot be negative"))

	def validate_grade(self):
		self.percentage = (flt(self.score) / flt(self.maximum_score)) * 100
		self.grade = get_grade(self.grading_scale, self.percentage)

	def validate_duplicate(self):
		assessment_result = frappe.get_list(
			"Assessment Result",
			filters={
				"name": ("not in", [self.name]),
				"student": self.student,
				"assessment_plan": self.assessment_plan,
				"docstatus": ("!=", 2),
			},
		)
		if assessment_result:
			frappe.throw(
				_("Assessment Result record {0} already exists.").format(
					getlink("Assessment Result", assessment_result[0].name)
				)
			)

	def validate_computed_grade_book(self):
		grade_book = _get_computed_grade_book(
			self.student,
			self.course,
			self.academic_year,
			self.academic_term,
			self.student_batch,
		)
		if not grade_book:
			return

		frappe.throw(
			_(
				"Cannot cancel Assessment Result because Grade Book {0} has already been computed. Reset that Grade Book to Draft before cancelling this result."
			).format(get_link_to_form("Grade Book", grade_book))
		)


def _get_computed_grade_book(
	student, course, academic_year, academic_term=None, student_batch=None
):
	if not (student and course and academic_year):
		return None

	existing = frappe.db.sql(
		"""
		SELECT name FROM `tabGrade Book`
		WHERE status = 'Computed'
			AND student = %s
			AND course = %s
			AND academic_year = %s
			AND (ifnull(academic_term, '') = '' OR academic_term = %s)
			AND (ifnull(student_batch, '') = '' OR student_batch = %s)
		LIMIT 1
		""",
		(
			student,
			course,
			academic_year,
			academic_term or "",
			student_batch or "",
		),
	)
	return existing[0][0] if existing else None
