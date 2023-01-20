# Copyright (c) 2023, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

from education.education.utils import OverlapError


class AssessmentPlanTool(Document):
	@frappe.whitelist()
	def generate_plans(self):
		total = len(self.subjects)
		plan_errors = []
		for student_group in self.student_groups:
			for i, subject in enumerate(self.subjects):
				frappe.publish_realtime(
					"assessment_plan_tool", dict(progress=[i + 1, total]), user=frappe.session.user
				)
				assessment_plan = frappe.new_doc("Assessment Plan")
				assessment_plan.assessment_group = self.assessment_group
				assessment_plan.grading_scale = self.grading_scale
				assessment_plan.student_group = student_group.student_group
				assessment_plan.program = self.student_class
				assessment_plan.course = subject.subject
				assessment_plan.academic_year = self.academic_year
				assessment_plan.academic_term = self.academic_term
				assessment_plan.maximum_assessment_score = self.maximum_assessment_score
				assessment_plan.assessment_criteria = self.assessment_criteria
				assessment_plan.docstatus = 0
				try:
					assessment_plan.save()
				except OverlapError:
					plan_errors.append(subject.subject)
		return total, plan_errors