# Copyright (c) 2015, Frappe Technologies and contributors
# For license information, please see license.txt


import json

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.permissions import add_user_permission

from education.education.utils import get_user_id_from_instructor


class Subject(Document):
	def validate(self):
		self.validate_assessment_criteria()

	def validate_assessment_criteria(self):
		if self.assessment_criteria:
			total_weightage = 0
			for criteria in self.assessment_criteria:
				total_weightage += criteria.weightage or 0
			if total_weightage != 100:
				frappe.throw(_("Total Weightage of all Assessment Criteria must be 100%"))

	def get_topics(self):
		topic_data = []
		for topic in self.topics:
			topic_doc = frappe.get_doc("Topic", topic.topic)
			if topic_doc.topic_content:
				topic_data.append(topic_doc)
		return topic_data

	def on_update(self):
		for instructor in self.subject_instructors:
			user_id = get_user_id_from_instructor(instructor.instructor)
			roles = frappe.get_roles(user_id)
			if frappe.db.exists("User Permission", {"allow": "Subject", "for_value": self.name, "user": user_id}):
				continue
			elif "Education Manager" in roles:
				continue	
			else:
				add_user_permission("Subject", self.name, user_id)


@frappe.whitelist()
def add_subject_to_programs(subject, programs, mandatory=False):
	programs = json.loads(programs)
	for entry in programs:
		program = frappe.get_doc("Program", entry)
		program.append(
			"subjects", {"subject": subject, "subject_name": subject, "mandatory": mandatory}
		)
		program.flags.ignore_mandatory = True
		program.save()
	frappe.db.commit()
	frappe.msgprint(
		_("Subject {0} has been added to all the selected programs successfully.").format(
			frappe.bold(subject)
		),
		title=_("Programs updated"),
		indicator="green",
	)


@frappe.whitelist()
def get_programs_without_subject(subject):
	data = []
	for entry in frappe.db.get_all("Program"):
		program = frappe.get_doc("Program", entry.name)
		subjects = [c.subject for c in program.subjects]
		if not subjects or subject not in subjects:
			data.append(program.name)
	return data
