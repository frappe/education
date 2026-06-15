# Copyright (c) 2018, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt


from functools import reduce

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt, get_link_to_form

from education.education.doctype.fee_plan.fee_plan import (
	INSTALLMENT_TERM_TYPES,
	get_installments,
)


class CourseEnrollment(Document):
	def validate(self):
		self.validate_admission_register()
		self.validate_duplication()

	def on_submit(self):
		self.create_fee_plan()
		self.create_registration_fee_invoice()

	def on_cancel(self):
		self.cancel_fee_plan()

	def create_registration_fee_invoice(self):
		student_applicant = frappe.get_doc("Student Applicant", self.student_applicant)
		if not student_applicant.registration_fee:
			return
		customer = frappe.db.get_value("Student", self.student, "customer")
		if not customer:
			frappe.throw(_("Student {0} does not have a linked Customer.").format(self.student))

		invoice = frappe.new_doc("Sales Invoice")
		invoice.customer = customer
		invoice.student = self.student
		invoice.company = self.company
		invoice.posting_date = self.enrollment_date
		invoice.set_posting_time = 1
		invoice.due_date = self.enrollment_date
		invoice.append(
			"items",
			{
				"item_code": student_applicant.registration_fee_item,
				"qty": 1,
				"rate": student_applicant.registration_fee_amount,
			},
		)
		invoice.insert(ignore_permissions=True)
		invoice.submit()

	def create_fee_plan(self):
		"""Create and submit a Fee Plan (and its invoices) for this enrollment."""
		if self.fee_plan:
			return

		fee_term = frappe.get_doc("Fee Term", self.fee_term)
		if fee_term.term_type not in INSTALLMENT_TERM_TYPES:
			return

		total_fee = get_course_fee(self.admission_register, self.course)
		if total_fee <= 0:
			frappe.throw(
				_(
					"Course fee amount for course {0} is not defined in Admission Register {1}."
				).format(self.course, self.admission_register)
			)

		discount_amount = flt(total_fee) * flt(fee_term.discount) / 100.0
		payable_amount = flt(total_fee) - discount_amount

		installments = get_installments(fee_term, payable_amount, self.enrollment_date)
		if not installments:
			return

		fee_plan = frappe.new_doc("Fee Plan")
		fee_plan.student = self.student
		fee_plan.fee_term = self.fee_term
		fee_plan.fee_term_type = fee_term.term_type
		fee_plan.company = self.company
		fee_plan.total_before_discount = total_fee
		fee_plan.discount = fee_term.discount
		fee_plan.discount_amount = discount_amount
		fee_plan.total_amount = payable_amount
		for installment in installments:
			fee_plan.append(
				"fee_plan_details",
				{"date": installment["date"], "amount": installment["amount"]},
			)

		fee_plan.insert(ignore_permissions=True)
		fee_plan.submit()

		self.db_set("fee_plan", fee_plan.name)

	def cancel_fee_plan(self):
		if not self.fee_plan:
			return

		fee_plan = frappe.get_doc("Fee Plan", self.fee_plan)
		if fee_plan.docstatus == 1:
			fee_plan.cancel()

		self.db_set("fee_plan", None)

	def validate_admission_register(self):
		if (
			frappe.db.get_value("Admission Register", self.admission_register, "docstatus") != 1
		):
			frappe.throw(
				_("Admission Register {0} must be submitted.").format(self.admission_register)
			)

		if self.course not in get_register_courses(self.admission_register):
			frappe.throw(
				_("Course {0} is not offered in Admission Register {1}.").format(
					self.course, self.admission_register
				)
			)

	def get_progress(self, student):
		"""
		Returns Progress of given student for a particular course enrollment

		        :param self: Course Enrollment Object
		        :param student: Student Object
		"""
		course = frappe.get_doc("Course", self.course)
		topics = course.get_topics()
		progress = []
		for topic in topics:
			progress.append(student.get_topic_progress(self.name, topic))
		if progress:
			return reduce(lambda x, y: x + y, progress)  # Flatten out the List
		else:
			return []

	def validate_duplication(self):
		enrollment = frappe.db.exists(
			"Course Enrollment",
			{
				"student": self.student,
				"course": self.course,
				"name": ("!=", self.name),
			},
		)
		if enrollment:
			frappe.throw(
				_("Student is already enrolled via Course Enrollment {0}").format(
					get_link_to_form("Course Enrollment", enrollment)
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
					"doctype": "Course Activity",
					"enrollment": self.name,
					"content_type": content_type,
					"content": content,
					"activity_date": frappe.utils.datetime.datetime.now(),
				}
			)

			activity.insert(ignore_permissions=True)
			return activity.name


def get_course_fee(admission_register, course):
	"""Return the course fee defined in the Admission Register for the course."""
	based_on, course_fee_amount = frappe.db.get_value(
		"Admission Register",
		admission_register,
		["admission_based_on", "course_fee_amount"],
	)

	if based_on == "Course":
		return flt(course_fee_amount)

	return flt(
		frappe.db.get_value(
			"Admission Register Course",
			{
				"parenttype": "Admission Register",
				"parent": admission_register,
				"course": course,
			},
			"course_fee_amount",
		)
	)


def get_register_courses(admission_register):
	"""Return the courses offered in the given Admission Register."""
	admission_based_on, course = frappe.db.get_value(
		"Admission Register", admission_register, ["admission_based_on", "course"]
	)

	if admission_based_on == "Course":
		return [course] if course else []

	return frappe.get_all(
		"Admission Register Course",
		filters={"parenttype": "Admission Register", "parent": admission_register},
		pluck="course",
	)


@frappe.whitelist()
def get_allowed_courses(admission_register, student=None):
	"""Return register courses the student is not yet enrolled in."""
	courses = get_register_courses(admission_register)

	if student and courses:
		enrolled = frappe.get_all(
			"Course Enrollment",
			filters={"student": student, "course": ("in", courses)},
			pluck="course",
		)
		courses = [course for course in courses if course not in enrolled]

	return courses


def check_activity_exists(enrollment, content_type, content):
	activity = frappe.get_all(
		"Course Activity",
		filters={
			"enrollment": enrollment,
			"content_type": content_type,
			"content": content,
		},
	)
	if activity:
		return activity[0].name
	else:
		return None
