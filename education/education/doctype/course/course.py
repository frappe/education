# Copyright (c) 2015, Frappe Technologies and contributors
# For license information, please see license.txt


import json

import frappe
from frappe import _
from frappe.model.document import Document


class Course(Document):
	def validate(self):
		self.validate_registration_fee()
		self.validate_grade_templates()

	def validate_registration_fee(self):
		if self.registration_fee:
			if self.registration_fee_amount < 1:
				frappe.throw(_("Registration Fee must be greater than zero"))

			if not self.registration_fee_item:
				frappe.throw(_("Registration Fee Item is required"))

	def validate_grade_templates(self):
		if self.grade_templates:
			for template in self.grade_templates:
				self._validate_grade_template_company(template.grade_template)

		for row in self.subjects or []:
			if row.use_course_grade_template:
				row.grade_template = None
				continue

			if not row.grade_template:
				frappe.throw(
					_(
						"Row {0}: Grade Template is required when Use Course Grade Template is unchecked"
					).format(row.idx)
				)

			self._validate_grade_template_company(row.grade_template, row.idx)

	def _validate_grade_template_company(self, grade_template, row_idx=None):
		if not self.company:
			return

		template_company = frappe.db.get_value("Grade Template", grade_template, "company")

		if template_company and template_company != self.company:
			message = _("Grade Template {0} belongs to a different Company").format(
				frappe.bold(grade_template)
			)
			if row_idx:
				message = _("Row {0}: {1}").format(row_idx, message)
			frappe.throw(message)

	# def get_topics(self):
	#     topic_data = []
	#     for topic in self.topics:
	#         topic_doc = frappe.get_doc("Topic", topic.topic)
	#         if topic_doc.topic_content:
	#             topic_data.append(topic_doc)
	#     return topic_data


# @frappe.whitelist()
# def add_course_to_programs(course, programs, mandatory=False):
#     programs = json.loads(programs)
#     for entry in programs:
#         program = frappe.get_doc("Program", entry)
#         program.append(
#             "courses", {"course": course, "course_name": course, "mandatory": mandatory}
#         )
#         program.flags.ignore_mandatory = True
#         program.save()
#     frappe.msgprint(
#         _(
#             "Course {0} has been added to all the selected programs successfully."
#         ).format(frappe.bold(course)),
#         title=_("Programs updated"),
#         indicator="green",
#     )


# @frappe.whitelist()
# def get_programs_without_course(course):
#     data = []
#     for entry in frappe.db.get_all("Program"):
#         program = frappe.get_doc("Program", entry.name)
#         courses = [c.course for c in program.courses]
#         if not courses or course not in courses:
#             data.append(program.name)
#     return data
