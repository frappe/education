# Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt, get_link_to_form

CATALOG_FIELDS = (
	"subject",
	"subject_type",
	"type",
	"abbreviation",
	"credit_hours",
	"credit",
	"attempted_units",
)
SUBJECT_ROW_FIELDS = (*CATALOG_FIELDS, "source")


class SubjectRegistration(Document):
	def validate(self):
		self.set_details_from_enrollment()
		self.set_row_sources()
		self.refresh_subject_details()
		self.calculate_total_credits()
		self.validate_enrollment()
		self.validate_open_duplicate()
		self.validate_subject_membership()
		if self.docstatus == 0:
			self.status = "Draft"

	def before_submit(self):
		self.validate_for_submit()
		self.status = "Submitted"

	def on_submit(self):
		self.write_subjects_to_enrollment()

	def on_cancel(self):
		self.clear_enrollment_subjects()
		self.db_set("status", "Cancelled")

	def set_details_from_enrollment(self):
		if not self.course_enrollment:
			return

		enrollment = frappe.db.get_value(
			"Course Enrollment",
			self.course_enrollment,
			[
				"student",
				"student_name",
				"course",
				"program",
				"student_batch",
				"academic_term",
				"company",
				"docstatus",
			],
			as_dict=True,
		)
		if not enrollment:
			frappe.throw(
				_("Course Enrollment {0} does not exist.").format(frappe.bold(self.course_enrollment))
			)

		self.student = enrollment.student
		self.student_name = enrollment.student_name
		self.course = enrollment.course
		self.program = enrollment.program
		self.student_batch = enrollment.student_batch
		self.academic_term = enrollment.academic_term
		self.company = enrollment.company
		self.flags.enrollment_docstatus = enrollment.docstatus

		if self.course:
			course = frappe.db.get_value(
				"Course",
				self.course,
				["subject_selection", "minimum_unit_load", "maximum_unit_load"],
				as_dict=True,
			)
			if course:
				self.subject_selection = course.subject_selection or "Regular"
				self.minimum_unit_load = course.minimum_unit_load
				self.maximum_unit_load = course.maximum_unit_load

	def set_row_sources(self):
		for row in self.compulsory_subjects or []:
			row.source = "Compulsory"
		for row in self.elective_subjects or []:
			row.source = "Elective"

	def refresh_subject_details(self):
		if not self.course:
			return

		catalog = get_course_subject_map(self.course)
		for row in list(self.compulsory_subjects or []) + list(self.elective_subjects or []):
			if not row.subject:
				continue
			meta = catalog.get(row.subject)
			if not meta:
				continue
			for field in SUBJECT_ROW_FIELDS:
				if field in ("subject", "source"):
					continue
				if meta.get(field) is not None:
					row.set(field, meta.get(field))

	def calculate_total_credits(self):
		self.total_credits = sum(
			get_row_unit_load(row)
			for row in list(self.compulsory_subjects or []) + list(self.elective_subjects or [])
		)

	def validate_enrollment(self):
		if self.docstatus == 2:
			return

		if self.flags.enrollment_docstatus != 1:
			frappe.throw(
				_("Course Enrollment {0} must be submitted.").format(
					get_link_to_form("Course Enrollment", self.course_enrollment)
				)
			)

	def validate_open_duplicate(self):
		if self.docstatus == 2:
			return

		existing = frappe.db.exists(
			"Subject Registration",
			{
				"course_enrollment": self.course_enrollment,
				"docstatus": ("<", 2),
				"name": ("!=", self.name or ""),
			},
		)
		if existing:
			frappe.throw(
				_("Subject Registration {0} is already open for Course Enrollment {1}.").format(
					get_link_to_form("Subject Registration", existing),
					get_link_to_form("Course Enrollment", self.course_enrollment),
				),
				title=_("Duplicate Entry"),
			)

	def validate_subject_membership(self):
		catalog = get_course_subject_map(self.course)
		seen = set()

		for row in self.compulsory_subjects or []:
			self._assert_catalog_subject(row, catalog, "Compulsory")
			self._assert_unique_subject(row.subject, seen)

		for row in self.elective_subjects or []:
			self._assert_catalog_subject(row, catalog, "Elective")
			self._assert_unique_subject(row.subject, seen)

	def _assert_catalog_subject(self, row, catalog, expected_type):
		if not row.subject:
			return

		meta = catalog.get(row.subject)
		if not meta:
			frappe.throw(
				_("Subject {0} is not part of Course {1}.").format(
					frappe.bold(row.subject), frappe.bold(self.course)
				)
			)

		if meta.get("subject_type") != expected_type:
			frappe.throw(
				_("Subject {0} is {1} on Course {2}, not {3}.").format(
					frappe.bold(row.subject),
					frappe.bold(meta.get("subject_type")),
					frappe.bold(self.course),
					frappe.bold(expected_type),
				)
			)

	def _assert_unique_subject(self, subject, seen):
		if not subject:
			return
		if subject in seen:
			frappe.throw(_("Subject {0} is selected more than once.").format(frappe.bold(subject)))
		seen.add(subject)

	def validate_for_submit(self):
		catalog = get_course_subject_map(self.course)
		required = {subject for subject, meta in catalog.items() if meta.get("subject_type") == "Compulsory"}
		present = {row.subject for row in self.compulsory_subjects or [] if row.subject}
		missing = required - present
		if missing:
			frappe.throw(
				_("Compulsory subjects are missing: {0}. Click Get Subjects before submitting.").format(
					", ".join(frappe.bold(subject) for subject in sorted(missing))
				)
			)

		selected = list(self.compulsory_subjects or []) + list(self.elective_subjects or [])
		if self.subject_selection == "Subject Based" and not selected:
			frappe.throw(_("Select at least one subject for this Course."))

		validate_unit_load(
			self.subject_selection,
			self.total_credits,
			self.minimum_unit_load,
			self.maximum_unit_load,
		)

	@frappe.whitelist()
	def get_subjects(self):
		self._ensure_draft()
		if not self.course:
			self.set_details_from_enrollment()

		self.set("compulsory_subjects", [])
		for row in get_course_subjects(self.course):
			if row.get("subject_type") == "Compulsory":
				self.append("compulsory_subjects", make_subject_values(row, "Compulsory"))

		self.set_row_sources()
		self.calculate_total_credits()
		if not self.is_new():
			self.save()
		return self.name

	@frappe.whitelist()
	def get_allowed_electives(self):
		if not self.course:
			self.set_details_from_enrollment()
		return [
			row.get("subject")
			for row in get_course_subjects(self.course)
			if row.get("subject_type") == "Elective" and row.get("subject")
		]

	def write_subjects_to_enrollment(self):
		enrollment = frappe.get_doc("Course Enrollment", self.course_enrollment)
		if enrollment.docstatus != 1:
			frappe.throw(
				_("Course Enrollment {0} is not submitted.").format(
					get_link_to_form("Course Enrollment", self.course_enrollment)
				)
			)

		enrollment.set_registered_subjects(self.get_selected_subject_rows())

	def clear_enrollment_subjects(self):
		if not self.course_enrollment:
			return

		frappe.db.delete(
			"Course Enrollment Subject",
			{"parent": self.course_enrollment, "parenttype": "Course Enrollment"},
		)

	def get_selected_subject_rows(self):
		rows = []
		for row in list(self.compulsory_subjects or []) + list(self.elective_subjects or []):
			if not row.subject:
				continue
			rows.append(make_subject_values(row, row.source or row.subject_type))
		return rows

	def _ensure_draft(self):
		if self.docstatus != 0:
			frappe.throw(_("Subjects can only be changed while the registration is Draft."))


def make_subject_values(row, source):
	values = {field: row.get(field) for field in SUBJECT_ROW_FIELDS}
	values["source"] = source
	return values


def get_row_unit_load(row):
	return flt(row.get("credit")) or flt(row.get("credit_hours"))


def validate_unit_load(subject_selection, total, minimum, maximum):
	if subject_selection != "Credit Based":
		return

	total = flt(total)
	minimum = flt(minimum)
	maximum = flt(maximum)

	if minimum and total < minimum:
		frappe.throw(
			_("Total credits {0} are below the minimum unit load {1}.").format(
				frappe.bold(total), frappe.bold(minimum)
			)
		)

	if maximum and total > maximum:
		frappe.throw(
			_("Total credits {0} exceed the maximum unit load {1}.").format(
				frappe.bold(total), frappe.bold(maximum)
			)
		)


def get_course_subjects(course):
	if not course:
		return []
	return frappe.get_all(
		"Course Subject",
		filters={"parent": course, "parenttype": "Course"},
		fields=list(CATALOG_FIELDS),
		order_by="idx",
	)


def get_course_subject_map(course):
	return {row.get("subject"): row for row in get_course_subjects(course) if row.get("subject")}


def course_has_electives(course):
	return any(row.get("subject_type") == "Elective" for row in get_course_subjects(course))


@frappe.whitelist()
def get_subject_registration(course_enrollment: str):
	"""Return the current Subject Registration for a Course Enrollment, if any."""
	if not course_enrollment:
		return None

	open_name = frappe.db.get_value(
		"Subject Registration",
		{"course_enrollment": course_enrollment, "docstatus": ("<", 2)},
		"name",
	)
	if open_name:
		return open_name

	return frappe.db.get_value(
		"Subject Registration",
		{"course_enrollment": course_enrollment},
		"name",
		order_by="modified desc",
	)
