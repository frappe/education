# Copyright (c) 2015, Frappe Technologies and contributors
# For license information, please see license.txt


import frappe
from frappe import _
from frappe.model.document import Document
from frappe.model.mapper import get_mapped_doc
from frappe.utils import getdate, today

from education.education.doctype.admission_register.admission_register import (
	STATUS_ADMISSION_OPEN,
)
from education.education.doctype.student_batch_name.student_batch_name import (
	validate_batch_capacity,
)

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
		self.populate_from_student()
		self.validate_email_address()
		self.validate_admission_register()
		self.validate_student_batch()

		if self.course_fee_amount and self.course_fee_amount <= 0:
			frappe.throw(_("Course Fee Amount must be greater than 0."))

		if not self.fee_term:
			frappe.throw(_("Fee Term is required."))

	def set_title(self):
		self.title = " ".join(filter(None, [self.first_name, self.middle_name, self.last_name]))

	def validate_dates(self):
		if self.date_of_birth and getdate(self.date_of_birth) >= getdate():
			frappe.throw(_("Date of Birth cannot be greater than today."))

	def validate_term(self):
		if self.academic_year and self.academic_term:
			actual_academic_year = frappe.db.get_value("Academic Term", self.academic_term, "academic_year")
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
				_("Email Address is mandatory as a user will be created for the student upon admission.")
			)

		if not self.email_address:
			return

		email = self.email_address.strip().lower()
		linked_student = self.student if self.is_already_a_student else None

		student_with_email = frappe.db.sql(
			"""
			SELECT name FROM `tabStudent`
			WHERE name != %s
				AND (
					lower(trim(ifnull(email_address, ''))) = %s
					OR lower(trim(ifnull(student_email_id, ''))) = %s
				)
			LIMIT 1
			""",
			(linked_student or "", email, email),
			as_dict=True,
		)
		if student_with_email:
			frappe.throw(
				_("Email Address {0} is already in use by Student {1}.").format(
					frappe.bold(self.email_address), frappe.bold(student_with_email[0].name)
				)
			)

		other_applicants = frappe.db.sql(
			"""
			SELECT name, student, application_status
			FROM `tabStudent Applicant`
			WHERE lower(trim(email_address)) = %s
				AND name != %s
			""",
			(email, self.name or ""),
			as_dict=True,
		)
		for other in other_applicants:
			if other.application_status == "Rejected":
				continue
			if linked_student and other.student == linked_student:
				continue
			frappe.throw(
				_("Email Address {0} is already in use by Student Applicant {1}.").format(
					frappe.bold(self.email_address), frappe.bold(other.name)
				)
			)

	def populate_from_student(self):
		if not self.is_already_a_student or not self.student:
			return

		if not (
			self.is_new()
			or self.has_value_changed("student")
			or (self.has_value_changed("is_already_a_student") and self.is_already_a_student)
		):
			return

		self.set_student_details(frappe.get_doc("Student", self.student))

	def set_student_details(self, student):
		for field in STUDENT_FIELDS:
			self.set(field, student.get(field))

		self.set("guardians", [])
		for row in student.guardians or []:
			self.append(
				"guardians",
				{
					"guardian": row.guardian,
					"guardian_name": row.guardian_name,
					"relation": row.relation,
				},
			)

		self.set("siblings", [])
		for row in student.siblings or []:
			self.append(
				"siblings",
				{
					"studying_in_same_institute": row.studying_in_same_institute,
					"full_name": row.full_name,
					"gender": row.gender,
					"student": row.student,
					"institution": row.institution,
					"program": row.program,
					"date_of_birth": row.date_of_birth,
				},
			)

	@frappe.whitelist()
	def get_student_details(self):
		if not self.is_already_a_student or not self.student:
			return {}

		student = frappe.get_doc("Student", self.student)
		return {
			**{field: student.get(field) for field in STUDENT_FIELDS},
			"guardians": [
				{
					"guardian": row.guardian,
					"guardian_name": row.guardian_name,
					"relation": row.relation,
				}
				for row in student.guardians or []
			],
			"siblings": [
				{
					"studying_in_same_institute": row.studying_in_same_institute,
					"full_name": row.full_name,
					"gender": row.gender,
					"student": row.student,
					"institution": row.institution,
					"program": row.program,
					"date_of_birth": row.date_of_birth,
				}
				for row in student.siblings or []
			],
		}

	def validate_admission_register(self):
		if not self.admission_register:
			return

		register = frappe.db.get_value(
			"Admission Register",
			self.admission_register,
			["docstatus", "status", "end_date"],
			as_dict=True,
		)
		if not register or register.docstatus != 1:
			frappe.throw(_("Admission Register {0} must be submitted.").format(self.admission_register))

		is_new_application = self.is_new() or self.has_value_changed("admission_register")
		if is_new_application:
			if register.status != STATUS_ADMISSION_OPEN:
				frappe.throw(
					_("Admission is not open for Admission Register {0}.").format(self.admission_register)
				)

			if register.end_date and getdate(today()) > getdate(register.end_date):
				frappe.throw(
					_("The admission period for {0} ended on {1}.").format(
						self.admission_register, frappe.bold(register.end_date)
					)
				)

		if self.admission_based_on == "Program" and self.course:
			allowed_courses = self.get_register_courses()
			if self.course not in allowed_courses:
				frappe.throw(
					_("Course {0} is not offered in Admission Register {1}.").format(
						self.course, self.admission_register
					)
				)

	def validate_student_batch(self):
		if not self.student_batch:
			return

		batch = frappe.db.get_value(
			"Student Batch Name",
			self.student_batch,
			["course", "disabled"],
			as_dict=True,
		)
		if not batch:
			frappe.throw(_("Student Batch {0} does not exist.").format(frappe.bold(self.student_batch)))

		if self.course and batch.course != self.course:
			frappe.throw(
				_("Batch {0} belongs to Course {1}, not to Course {2}.").format(
					frappe.bold(self.student_batch),
					frappe.bold(batch.course),
					frappe.bold(self.course),
				)
			)

		if batch.disabled:
			frappe.throw(_("Batch {0} is disabled.").format(frappe.bold(self.student_batch)))

		validate_batch_capacity(self.student_batch, exclude_applicant=self.name)

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
			"academic_term": register.academic_term,
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
			return frappe.db.get_value("Admission Register", self.admission_register, "course_fee_amount")

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

		if not self.student_batch:
			frappe.throw(_("Student Batch is required before the application can be approved."))

		self.validate_student_batch()

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

	@frappe.whitelist()
	def reject(self):
		"""Mark the application as Rejected without running full form validation."""
		if self.application_status not in ("Applied", "Approved"):
			frappe.throw(_("Only applications with status Applied or Approved can be rejected."))

		self.db_set("application_status", "Rejected")
		frappe.msgprint(_("Application has been rejected."), alert=True)

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
	def enroll_in_course(self):
		"""Enroll the approved student in the selected course."""
		if self.application_status != "Approved":
			frappe.throw(_("Only approved applications can be enrolled."))

		if not self.student:
			frappe.throw(_("No Student is linked to this application. Please approve it first."))

		if not self.student_batch:
			frappe.throw(_("Student Batch is required before the student can be enrolled."))

		try:
			enrollment_name = self.create_course_enrollment().name
		except Exception:
			frappe.db.rollback()
			frappe.log_error(frappe.get_traceback(), _("Student Applicant Enrollment Failed"))
			raise

		self.db_set("application_status", "Admitted")

		return enrollment_name

	def create_course_enrollment(self):
		if not self.course:
			frappe.throw(_("Please select a Course to enroll the student in."))

		course_enrollment = frappe.get_doc(
			{
				"doctype": "Course Enrollment",
				"student": self.student,
				"course": self.course,
				"company": self.company,
				"admission_register": self.admission_register,
				"academic_term": self.academic_term,
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
