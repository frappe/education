# Copyright (c) 2018, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt


from functools import reduce

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import get_link_to_form


class SubjectEnrollment(Document):
	def validate(self):
		self.validate_duplication()

	def get_progress(self, student):
		"""
		Returns Progress of given student for a particular course enrollment

		        :param self: Course Enrollment Object
		        :param student: Student Object
		"""
		course = frappe.get_doc("Subject", self.course)
		topics = course.get_topics()
		progress = []
		for topic in topics:
			progress.append(student.get_topic_progress(self.name, topic))
		if progress:
			return reduce(lambda x, y: x + y, progress)  # Flatten out the List
		else:
			return []

	def add_cbt_activity(self, cbt_name, cbt_response, answers, score, status, time_taken):
		result = {k: ("Correct" if v else "Wrong") for k, v in answers.items()}
		result_data = []
		for key in answers:
			item = {}
			item["question"] = key
			item["cbt_result"] = result[key]
			try:
				if not cbt_response[key]:
					item["selected_option"] = "Unattempted"
				elif isinstance(cbt_response[key], list):
					item["selected_option"] = ", ".join(
						frappe.get_value("Options", res, "option") for res in cbt_response[key]
					)
				else:
					item["selected_option"] = frappe.get_value("Options", cbt_response[key], "option")
			except KeyError:
				item["selected_option"] = "Unattempted"
			result_data.append(item)

		cbt_activity = frappe.get_doc(
			{
				"doctype": "CBT Activity",
				"enrollment": self.name,
				"cbt": cbt_name,
				"activity_date": frappe.utils.datetime.datetime.now(),
				"result": result_data,
				"score": score,
				"status": status,
				"time_taken": time_taken,
			}
		).insert(ignore_permissions=True)		

	def validate_duplication(self):
		enrollment = frappe.db.exists(
			"Subject Enrollment",
			{
				"student": self.student,
				"course": self.course,
				"program_enrollment": self.program_enrollment,
				"name": ("!=", self.name),
			},
		)
		if enrollment:
			frappe.throw(
				_("Student is already enrolled via Subject Enrollment {0}").format(
					get_link_to_form("Subject Enrollment", enrollment)
				),
				title=_("Duplicate Entry"),
			)

	def add_quiz_activity(
		self, quiz_name, quiz_response, answers, score, status, time_taken
	):
		result = {k: ("Correct" if v else "Wrong") for k, v in answers.items()}
		result_data = []
		for key in answers:
			item = {}
			item["question"] = key
			item["quiz_result"] = result[key]
			try:
				if not quiz_response[key]:
					item["selected_option"] = "Unattempted"
				elif isinstance(quiz_response[key], list):
					item["selected_option"] = ", ".join(
						frappe.get_value("Options", res, "option") for res in quiz_response[key]
					)
				else:
					item["selected_option"] = frappe.get_value("Options", quiz_response[key], "option")
			except KeyError:
				item["selected_option"] = "Unattempted"
			result_data.append(item)

		quiz_activity = frappe.get_doc(
			{
				"doctype": "Quiz Activity",
				"enrollment": self.name,
				"quiz": quiz_name,
				"activity_date": frappe.utils.datetime.datetime.now(),
				"result": result_data,
				"score": score,
				"status": status,
				"time_taken": time_taken,
			}
		).insert(ignore_permissions=True)

	def add_activity(self, content_type, content):
		activity = check_activity_exists(self.name, content_type, content)
		if activity:
			return activity
		else:
			activity = frappe.get_doc(
				{
					"doctype": "Subject Activity",
					"enrollment": self.name,
					"content_type": content_type,
					"content": content,
					"activity_date": frappe.utils.datetime.datetime.now(),
				}
			)

			activity.insert(ignore_permissions=True)
			return activity.name


def check_activity_exists(enrollment, content_type, content):
	activity = frappe.get_all(
		"Subject Activity",
		filters={"enrollment": enrollment, "content_type": content_type, "content": content},
	)
	if activity:
		return activity[0].name
	else:
		return None
