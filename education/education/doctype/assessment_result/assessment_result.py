# Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt


import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt
from frappe.utils.csvutils import getlink

import education.education
from education.education.api import get_grade


class AssessmentResult(Document):
	def validate(self):
		education.education.validate_student_belongs_to_batch(
			self.student, self.student_batch
		)
		self.validate_maximum_score()
		self.validate_grade()
		self.validate_duplicate()

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
