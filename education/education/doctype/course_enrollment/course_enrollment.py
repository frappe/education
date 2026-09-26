# Copyright (c) 2018, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt


from functools import reduce

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import cint, flt, get_link_to_form

from education.education.doctype.admission_register.admission_register import (
	ENROLLMENT_ALLOWED_STATUSES,
)
from education.education.doctype.fee_plan.fee_plan import (
	INSTALLMENT_TERM_TYPES,
	get_billing_error,
	get_installments,
)
from education.education.doctype.student_batch_name.student_batch_name import (
	validate_batch_capacity,
)

BILLING_NOT_APPLICABLE = "Not Applicable"
BILLING_PENDING = "Pending"
BILLING_CREATED = "Created"
BILLING_PARTIALLY_INVOICED = "Partially Invoiced"
BILLING_FAILED = "Failed"

RETRYABLE_BILLING_STATUSES = (
	BILLING_PENDING,
	BILLING_FAILED,
	BILLING_PARTIALLY_INVOICED,
)


class CourseEnrollment(Document):
	def validate(self):
		self.set_program_from_course()
		self.set_fee_term_from_course()
		self.set_academic_term_from_register()
		self.validate_admission_register()
		self.validate_duplication()
		self.validate_batch()
		self.set_roll_number()

	def on_submit(self):
		self.update_student_joining_date()
		self.create_or_retry_fee_plan()
		self.create_subject_registration()

	def on_cancel(self):
		self.ignore_linked_doctypes = ["Subject Registration", "Fee Plan", "Fees"]
		self.cancel_fee_plan()
		self.cancel_open_subject_registrations()

	def before_update_after_submit(self):
		self.set_roll_number()

	def update_student_joining_date(self):
		from frappe.query_builder.functions import Min

		table = frappe.qb.DocType("Course Enrollment")
		date = (
			frappe.qb.from_(table)
			.select(Min(table.enrollment_date).as_("enrollment_date"))
			.where(table.student == self.student)
			.where(table.docstatus == 1)
		).run(as_dict=True)

		if date and date[0].enrollment_date:
			frappe.db.set_value("Student", self.student, "joining_date", date[0].enrollment_date)

	@frappe.whitelist()
	def create_or_retry_fee_plan(self):
		"""Create or retry the Fee Plan and invoices without blocking enrollment."""
		if self.docstatus != 1:
			frappe.throw(_("Submit the Course Enrollment before creating a Fee Plan."))

		errors = []
		self._create_or_retry_fee_plan(errors)
		self._create_registration_fee_invoice(errors)
		self._finalize_billing_status(errors)
		self._notify_billing_result(errors)
		return {
			"billing_status": self.billing_status,
			"fee_plan": self.fee_plan,
			"billing_error": self.billing_error,
		}

	def _create_or_retry_fee_plan(self, errors):
		fee_term_type = frappe.db.get_value("Fee Term", self.fee_term, "term_type")
		if fee_term_type not in INSTALLMENT_TERM_TYPES:
			return

		if self.fee_plan:
			docstatus = frappe.db.get_value("Fee Plan", self.fee_plan, "docstatus")
			if docstatus == 1:
				fee_plan = frappe.get_doc("Fee Plan", self.fee_plan)
				fee_plan.create_invoices()
				errors.extend(fee_plan.flags.get("invoice_errors") or [])
				return
			self.db_set("fee_plan", None)
			self.fee_plan = None

		fee_term = frappe.get_doc("Fee Term", self.fee_term)
		total_fee = get_course_fee(self.admission_register, self.course)
		if total_fee <= 0:
			errors.append(
				_("Course fee amount for course {0} is not defined in Admission Register {1}.").format(
					self.course, self.admission_register
				)
			)
			return

		discount_amount = flt(total_fee) * flt(fee_term.discount) / 100.0
		payable_amount = flt(total_fee) - discount_amount
		installments = get_installments(fee_term, payable_amount, self.enrollment_date)
		if not installments:
			errors.append(_("Fee Term {0} has no installments to invoice.").format(self.fee_term))
			return

		frappe.db.savepoint("create_fee_plan")
		try:
			fee_plan = frappe.new_doc("Fee Plan")
			fee_plan.student = self.student
			fee_plan.fee_term = self.fee_term
			fee_plan.fee_term_type = fee_term.term_type
			fee_plan.company = self.company
			fee_plan.course_enrollment = self.name
			fee_plan.course = self.course
			fee_plan.program = self.program
			fee_plan.student_batch = self.student_batch
			fee_plan.student_name = self.student_name
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
			self.fee_plan = fee_plan.name
			errors.extend(fee_plan.flags.get("invoice_errors") or [])
		except Exception as e:
			frappe.db.rollback(save_point="create_fee_plan")
			frappe.log_error(
				title=_("Fee Plan creation failed"),
				message=frappe.get_traceback(),
			)
			errors.append(get_billing_error(e))

	def _create_registration_fee_invoice(self, errors):
		if not self.student_applicant:
			return

		student_applicant = frappe.get_doc("Student Applicant", self.student_applicant)
		if not student_applicant.registration_fee:
			return

		if self.has_registration_fee_invoice(student_applicant.registration_fee_item):
			return

		frappe.db.savepoint("registration_fee_invoice")
		try:
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
		except Exception as e:
			frappe.db.rollback(save_point="registration_fee_invoice")
			frappe.log_error(
				title=_("Registration fee invoice creation failed"),
				message=frappe.get_traceback(),
			)
			errors.append(_("Registration fee invoice: {0}").format(get_billing_error(e)))

	def has_registration_fee_invoice(self, item_code):
		if not item_code:
			return False

		return bool(
			frappe.db.sql(
				"""
				SELECT si.name
				FROM `tabSales Invoice` si
				INNER JOIN `tabSales Invoice Item` sii ON sii.parent = si.name
				WHERE si.student = %s
					AND si.docstatus = 1
					AND sii.item_code = %s
				LIMIT 1
				""",
				(self.student, item_code),
			)
		)

	def _finalize_billing_status(self, errors):
		fee_term_type = frappe.db.get_value("Fee Term", self.fee_term, "term_type")
		if fee_term_type not in INSTALLMENT_TERM_TYPES:
			self.set_billing_state(BILLING_NOT_APPLICABLE, errors)
			return

		if not self.fee_plan:
			self.set_billing_state(
				BILLING_FAILED,
				errors or [_("Fee Plan was not created.")],
			)
			return

		details = frappe.get_all(
			"Fee Plan Detail",
			filters={"parent": self.fee_plan},
			fields=["invoice"],
		)
		missing = sum(1 for row in details if not row.invoice)
		if details and missing == 0:
			self.set_billing_state(BILLING_CREATED, errors)
		elif missing == len(details):
			self.set_billing_state(
				BILLING_FAILED,
				errors or [_("No invoices were created.")],
			)
		else:
			self.set_billing_state(BILLING_PARTIALLY_INVOICED, errors)

	def set_billing_state(self, status, errors=None):
		error_text = "\n".join([error for error in (errors or []) if error])
		self.db_set("billing_status", status)
		self.db_set("billing_error", error_text)
		self.billing_status = status
		self.billing_error = error_text

	def _notify_billing_result(self, errors):
		if not errors and self.billing_status in (
			BILLING_CREATED,
			BILLING_NOT_APPLICABLE,
		):
			return

		frappe.msgprint(
			_("Enrollment is submitted, but billing is incomplete: {0}").format(
				errors[0] if errors else self.billing_status
			),
			title=_("Billing Incomplete"),
			indicator="orange",
			alert=True,
		)

	def cancel_fee_plan(self):
		if not self.fee_plan:
			return

		fee_plan = frappe.get_doc("Fee Plan", self.fee_plan)
		if fee_plan.docstatus == 1:
			fee_plan.cancel()

		self.db_set("fee_plan", None)

	def set_program_from_course(self):
		if not self.course:
			self.program = None
			return

		self.program = frappe.db.get_value("Course", self.course, "program")

	def set_fee_term_from_course(self):
		if self.fee_term or not self.course:
			return

		self.fee_term = frappe.db.get_value("Course", self.course, "fee_term")

	def set_academic_term_from_register(self):
		if not self.admission_register:
			self.academic_term = None
			return

		self.academic_term = frappe.db.get_value(
			"Admission Register", self.admission_register, "academic_term"
		)

	def validate_admission_register(self):
		register = frappe.db.get_value(
			"Admission Register",
			self.admission_register,
			["docstatus", "admission_based_on", "program", "status"],
			as_dict=True,
		)
		if not register or register.docstatus != 1:
			frappe.throw(_("Admission Register {0} must be submitted.").format(self.admission_register))

		if register.status not in ENROLLMENT_ALLOWED_STATUSES:
			frappe.throw(
				_("Admission has not started for Admission Register {0}.").format(self.admission_register)
			)

		if register.admission_based_on == "Program" and register.program:
			if self.program != register.program:
				frappe.throw(
					_(
						"Course {0} belongs to Program {1}, not to Program {2} of Admission Register {3}."
					).format(
						frappe.bold(self.course),
						frappe.bold(self.program) if self.program else _("None"),
						frappe.bold(register.program),
						frappe.bold(self.admission_register),
					)
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

	def validate_batch(self):
		"""Ensure the batch belongs to the enrolled course and still has room."""
		if not self.student_batch:
			return

		batch = frappe.db.get_value(
			"Student Batch Name",
			self.student_batch,
			["course", "disabled"],
			as_dict=True,
		)

		if batch.course != self.course:
			frappe.throw(
				_("Batch {0} belongs to Course {1}, not to Course {2}.").format(
					frappe.bold(self.student_batch),
					frappe.bold(batch.course),
					frappe.bold(self.course),
				)
			)

		if batch.disabled:
			frappe.throw(_("Batch {0} is disabled.").format(frappe.bold(self.student_batch)))

		validate_batch_capacity(
			self.student_batch,
			exclude_applicant=self.student_applicant,
			exclude_enrollment=self.name,
		)

	def set_roll_number(self):
		"""Assign the next roll number within the batch and keep it unique per course and batch."""
		self.roll_number = str(self.roll_number).strip() if self.roll_number else None
		if not self.roll_number:
			if not self.student_batch:
				return
			self.roll_number = str(get_next_roll_number(self.student_batch))

		duplicate = frappe.db.sql(
			"""
			SELECT name FROM `tabCourse Enrollment`
			WHERE course = %s
				AND ifnull(student_batch, '') = %s
				AND roll_number = %s
				AND docstatus != 2
				AND name != %s
			LIMIT 1
			""",
			(
				self.course,
				self.student_batch or "",
				self.roll_number,
				self.name or "",
			),
		)

		if duplicate:
			frappe.throw(
				_("Roll Number {0} is already used for Course {1} in Batch {2} by {3}").format(
					frappe.bold(self.roll_number),
					frappe.bold(self.course),
					(frappe.bold(self.student_batch) if self.student_batch else _("No Batch")),
					get_link_to_form("Course Enrollment", duplicate[0][0]),
				),
				title=_("Duplicate Roll Number"),
			)

	def validate_duplication(self):
		enrollment = frappe.db.exists(
			"Course Enrollment",
			{
				"student": self.student,
				"course": self.course,
				"name": ("!=", self.name),
				"docstatus": 1,
			},
		)
		if enrollment:
			frappe.throw(
				_("Student is already enrolled via Course Enrollment {0}").format(
					get_link_to_form("Course Enrollment", enrollment)
				),
				title=_("Duplicate Entry"),
			)

	def create_subject_registration(self):
		"""Create a draft Subject Registration and auto-submit Regular courses with no electives."""
		from education.education.doctype.subject_registration.subject_registration import (
			course_has_electives,
			get_course_subjects,
		)

		if self.flags.ignore_subject_registration:
			return

		if not get_course_subjects(self.course):
			return

		existing = frappe.db.exists(
			"Subject Registration",
			{
				"course_enrollment": self.name,
				"docstatus": ("<", 2),
			},
		)
		if existing:
			return

		registration = frappe.new_doc("Subject Registration")
		registration.course_enrollment = self.name
		registration.flags.ignore_permissions = True
		registration.insert(ignore_permissions=True)
		registration.get_subjects()

		subject_selection = frappe.db.get_value("Course", self.course, "subject_selection") or "Regular"
		if subject_selection == "Regular" and not course_has_electives(self.course):
			registration.reload()
			registration.flags.ignore_permissions = True
			registration.submit()

	def cancel_open_subject_registrations(self):
		registrations = frappe.get_all(
			"Subject Registration",
			filters={
				"course_enrollment": self.name,
				"docstatus": ("<", 2),
			},
			fields=["name", "docstatus"],
		)
		for row in registrations:
			registration = frappe.get_doc("Subject Registration", row.name)
			if row.docstatus == 0:
				registration.delete(ignore_permissions=True)
			else:
				registration.flags.ignore_permissions = True
				registration.cancel()

	def set_registered_subjects(self, rows):
		"""Replace the enrolled subjects from an approved Subject Registration."""
		frappe.db.delete(
			"Course Enrollment Subject",
			{"parent": self.name, "parenttype": "Course Enrollment"},
		)
		for idx, row in enumerate(rows or [], start=1):
			child = frappe.get_doc(
				{
					"doctype": "Course Enrollment Subject",
					"parent": self.name,
					"parenttype": "Course Enrollment",
					"parentfield": "subjects",
					"idx": idx,
					"subject": row.get("subject"),
					"subject_type": row.get("subject_type"),
					"type": row.get("type"),
					"abbreviation": row.get("abbreviation"),
					"credit_hours": row.get("credit_hours"),
					"credit": row.get("credit"),
					"attempted_units": row.get("attempted_units") or "1",
					"source": row.get("source") or row.get("subject_type"),
				}
			)
			child.set_new_name()
			child.db_insert()

	def get_registered_subjects(self):
		"""Return enrolled subjects, falling back to the Course catalog."""
		if self.subjects:
			return [row.subject for row in self.subjects if row.subject]

		from education.education.doctype.subject_registration.subject_registration import (
			get_course_subjects,
		)

		return [row.get("subject") for row in get_course_subjects(self.course) if row.get("subject")]

	def add_quiz_activity(self, quiz_name, quiz_response, answers, score, status, time_taken):
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

		frappe.get_doc(
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


@frappe.whitelist()
def get_next_roll_number(batch: str):
	"""Return the next roll number available in the batch."""
	roll_numbers = frappe.get_all(
		"Course Enrollment",
		filters={"student_batch": batch, "docstatus": ("!=", 2)},
		pluck="roll_number",
	)
	return cint(max((cint(roll_number) for roll_number in roll_numbers), default=0)) + 1


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


def get_enrolled_subject_names(student, course, student_batch=None):
	"""Return subjects the student is registered for, or the Course catalog."""
	if not student or not course:
		return []

	filters = {"student": student, "course": course, "docstatus": 1}
	if student_batch:
		filters["student_batch"] = student_batch

	enrollment_name = frappe.db.get_value("Course Enrollment", filters, "name")
	if enrollment_name:
		subjects = frappe.get_all(
			"Course Enrollment Subject",
			filters={
				"parent": enrollment_name,
				"parenttype": "Course Enrollment",
			},
			pluck="subject",
			order_by="idx",
		)
		if subjects:
			return subjects

	from education.education.doctype.subject_registration.subject_registration import (
		get_course_subjects,
	)

	return [row.get("subject") for row in get_course_subjects(course) if row.get("subject")]


@frappe.whitelist()
def get_allowed_courses(admission_register: str, student: str | None = None):
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
