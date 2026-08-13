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

		if self.course_fee_amount and self.course_fee_amount <= 0:
			frappe.throw(_("Course Fee Amount must be greater than 0."))

		if not self.fee_term:
			frappe.throw(_("Fee Term is required."))

		if not self.student_batch:
			frappe.throw(_("Student Batch is required."))

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
			filters={
				"parenttype": "Admission Register",
				"parent": self.admission_register,
			},
			pluck="course",
		)

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
			"registration_fee_amount": register.registration_fee_amount,
			"courses": [row.course for row in register.courses],
		}

	@frappe.whitelist()
	def get_course_fee_amount(self):
		if self.admission_based_on == "Course":
			return frappe.db.get_value(
				"Admission Register", self.admission_register, "course_fee_amount"
			)

		if self.admission_based_on == "Program":
			return frappe.db.get_value(
				"Admission Register Course",
				{"parent": self.admission_register, "course": self.course},
				"course_fee_amount",
			)

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
			(
				_("Student {0} has been updated.").format(student.name)
				if self.is_already_a_student
				else _("Student {0} has been created.").format(student.name)
			),
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
	def enroll_in_program_and_course(self):
		"""Enroll the approved student.

		Program-based admission: enroll the student in the register's program
		and in the selected course. Course-based admission: enroll the student
		in the course only.
		"""
		if self.application_status != "Approved":
			frappe.throw(_("Only approved applications can be enrolled."))

		if not self.student:
			frappe.throw(_("No Student is linked to this application. Please approve it first."))

		try:
			if self.admission_based_on == "Program":
				self.get_or_create_program_enrollment()

			enrollment_name = self.create_course_enrollment().name
		except Exception:
			frappe.db.rollback()
			frappe.log_error(frappe.get_traceback(), _("Student Applicant Enrollment Failed"))
			raise

		self.db_set("application_status", "Admitted")

		return enrollment_name

	def get_or_create_program_enrollment(self):
		"""Return the student's submitted Program Enrollment, creating it if needed."""
		program = frappe.db.get_value(
			"Admission Register", self.admission_register, "program"
		)

		existing = frappe.db.exists(
			"Program Enrollment",
			{
				"student": self.student,
				"program": program,
				"intake_year": self.academic_year,
				"docstatus": ("<", 2),
			},
		)
		if existing:
			program_enrollment = frappe.get_doc("Program Enrollment", existing)
		else:
			program_enrollment = frappe.get_doc(
				{
					"doctype": "Program Enrollment",
					"student": self.student,
					"student_category": self.student_category,
					"program": program,
					"intake_year": self.academic_year,
					"academic_term": self.academic_term,
					"enrollment_date": today(),
				}
			).insert(ignore_permissions=True)

		if program_enrollment.docstatus == 0:
			program_enrollment.submit()

		return program_enrollment

	def create_course_enrollment(self):
		if not self.course:
			frappe.throw(_("Please select a Course to enroll the student in."))

		course_enrollment = frappe.get_doc(
			{
				"doctype": "Course Enrollment",
				"student": self.student,
				"course": self.course,
				"admission_register": self.admission_register,
				"enrollment_date": today(),
				"fee_term": self.fee_term,
				"student_applicant": self.name,
				"student_batch": self.student_batch,
			}
		)
		course_enrollment.insert(ignore_permissions=True)
		course_enrollment.submit()
		return course_enrollment

	def on_payment_authorized(self, *args, **kwargs):
		self.db_set("paid", 1)
