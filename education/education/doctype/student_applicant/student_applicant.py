# Copyright (c) 2015, Frappe Technologies and contributors
# For license information, please see license.txt


import frappe
from frappe import _
from frappe.model.document import Document
from frappe.model.mapper import get_mapped_doc
from frappe.utils import getdate, today

STUDENT_FIELDS = (
	"first_name",
	"middle_name",
	"last_name",
	"email_address",
	"image",
	"date_of_birth",
	"gender",
	"blood_group",
	"student_mobile_number",
	"nationality",
	"address_line_1",
	"address_line_2",
	"city",
	"state",
	"pincode",
	"country",
)


class StudentApplicant(Document):
	def autoname(self):
		from frappe.model.naming import set_name_by_naming_series

		set_name_by_naming_series(self)

	def validate(self):
		self.set_title()
		self.validate_dates()
		self.validate_term()
		self.validate_email_address()
		self.validate_admission_register()

	def set_title(self):
		self.title = " ".join(
			filter(None, [self.first_name, self.middle_name, self.last_name])
		)

	def validate_dates(self):
		if self.date_of_birth and getdate(self.date_of_birth) >= getdate():
			frappe.throw(_("Date of Birth cannot be greater than today."))

	def validate_term(self):
		if self.academic_year and self.academic_term:
			actual_academic_year = frappe.db.get_value(
				"Academic Term", self.academic_term, "academic_year"
			)
			if actual_academic_year != self.academic_year:
				frappe.throw(
					_("Academic Term {0} does not belong to Academic Year {1}").format(
						self.academic_term, self.academic_year
					)
				)

	def validate_email_address(self):
		"""Email is mandatory when a user has to be created for the student upon admission."""
		if not self.email_address and not frappe.db.get_single_value(
			"Education Settings", "user_creation_skip"
		):
			frappe.throw(
				_(
					"Email Address is mandatory as a user will be created for the student upon admission."
				)
			)

	def validate_admission_register(self):
		if not self.admission_register:
			return

		if (
			frappe.db.get_value("Admission Register", self.admission_register, "docstatus") != 1
		):
			frappe.throw(
				_("Admission Register {0} must be submitted.").format(self.admission_register)
			)

		if self.admission_based_on == "Program" and self.course:
			allowed_courses = self.get_register_courses()
			if self.course not in allowed_courses:
				frappe.throw(
					_("Course {0} is not offered in Admission Register {1}.").format(
						self.course, self.admission_register
					)
				)

	def get_register_courses(self):
		return frappe.get_all(
			"Admission Register Course",
			filters={"parenttype": "Admission Register", "parent": self.admission_register},
			pluck="course",
		)

		# NOTE: Review this method

	@frappe.whitelist()
	def get_admission_register_details(self):
		"""Return details of the linked Admission Register to populate the form."""
		if not self.admission_register:
			return {}

		register = frappe.get_doc("Admission Register", self.admission_register)
		return {
			"admission_based_on": register.admission_based_on,
			"academic_year": register.academic_year,
			"course": register.course,
			"program": register.program,
			"registration_fee_item": register.registration_fee_item,
			"registration_fee": register.registration_fee,
			"courses": [row.course for row in register.courses],
		}

	@frappe.whitelist()
	def approve(self):
		"""Create or update the Student and mark the application as Approved."""
		if self.application_status not in ("Applied", "Rejected"):
			frappe.throw(_("Only applications with status Applied or Rejected can be approved."))

		if self.is_already_a_student:
			if not self.student:
				frappe.throw(_("Please select the Student record to update."))
			student = self.update_student()
		else:
			student = self.create_student()

		self.db_set("student", student.name)
		self.db_set("application_status", "Approved")

		frappe.msgprint(
			_("Student {0} has been updated.").format(student.name)
			if self.is_already_a_student
			else _("Student {0} has been created.").format(student.name),
			alert=True,
		)
		return student.name

	def update_student(self):
		"""Update the existing Student record with the data in the application."""
		student = frappe.get_doc("Student", self.student)
		for field in STUDENT_FIELDS:
			if self.get(field):
				student.set(field, self.get(field))
		student.save(ignore_permissions=True)
		return student

	def create_student(self):
		student = get_mapped_doc(
			"Student Applicant",
			self.name,
			{
				"Student Applicant": {
					"doctype": "Student",
					"field_map": {
						"name": "student_applicant",
					},
				}
			},
			ignore_permissions=True,
		)
		student.save(ignore_permissions=True)
		return student

	@frappe.whitelist()
	def enroll_in_program(self):
		"""Enroll the approved student in the program of the Admission Register.

		Submitting the Program Enrollment also enrolls the student in the
		selected course (Course Enrollment is created on submit).
		"""
		if self.application_status != "Approved":
			frappe.throw(_("Only approved applications can be enrolled."))

		if self.admission_based_on != "Program":
			frappe.throw(
				_("Enrollment in a program is only applicable when admission is based on Program.")
			)

		if not self.student:
			frappe.throw(_("No Student is linked to this application. Please approve it first."))

		program = frappe.db.get_value(
			"Admission Register", self.admission_register, "program"
		)

		program_enrollment = frappe.get_doc(
			{
				"doctype": "Program Enrollment",
				"student": self.student,
				"student_category": self.student_category,
				"program": program,
				"academic_year": self.academic_year,
				"academic_term": self.academic_term,
				"enrollment_date": today(),
			}
		)
		if self.course:
			program_enrollment.append("courses", {"course": self.course})

		program_enrollment.insert(ignore_permissions=True)
		program_enrollment.submit()

		self.db_set("application_status", "Admitted")

		return program_enrollment.name

	def on_payment_authorized(self, *args, **kwargs):
		self.db_set("paid", 1)
