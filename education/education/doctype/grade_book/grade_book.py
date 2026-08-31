# Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

from collections import defaultdict

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt, getdate

from education.education.api import get_grade_details
from education.education.doctype.course.course import get_grade_template


# NOTE: remember to map the correct status here
ATTENDANCE_STATUS_MAP = {
	"Present": "Present",
	"Absent": "Absent",
	"Leave": "Absent Excused",
}


class GradeBook(Document):
	def validate(self):
		self.validate_academic_year_and_term()
		self.validate_company()
		self.validate_enrollment()
		self.validate_batch()
		self.validate_unique()
		self.validate_grading_scale()
		self.reset_if_identity_changed()
		self.apply_overrides_and_totals()

	def validate_academic_year_and_term(self):
		if not self.academic_year:
			frappe.throw(_("Academic Year is mandatory"))

		if not self.academic_term:
			return

		term_year = frappe.db.get_value("Academic Term", self.academic_term, "academic_year")
		if term_year and term_year != self.academic_year:
			frappe.throw(
				_("Academic Term {0} does not belong to Academic Year {1}").format(
					frappe.bold(self.academic_term), frappe.bold(self.academic_year)
				)
			)

	def validate_company(self):
		if not self.company:
			return

		for doctype, value in (
			("Course", self.course),
			("Academic Year", self.academic_year),
			("Academic Term", self.academic_term),
			("Student Batch Name", self.student_batch),
		):
			if not value:
				continue

			company = frappe.db.get_value(doctype, value, "company")
			if company and company != self.company:
				frappe.throw(
					_("Company must be the same as that of {0} {1}").format(
						_(doctype), frappe.bold(value)
					)
				)

	def validate_enrollment(self):
		filters = {
			"student": self.student,
			"course": self.course,
			"docstatus": 1,
		}
		if self.student_batch:
			filters["student_batch"] = self.student_batch

		if not frappe.db.exists("Course Enrollment", filters):
			if self.student_batch:
				frappe.throw(
					_("Student {0} is not enrolled in Course {1} for Batch {2}").format(
						frappe.bold(self.student),
						frappe.bold(self.course),
						frappe.bold(self.student_batch),
					)
				)
			frappe.throw(
				_("Student {0} is not enrolled in Course {1}").format(
					frappe.bold(self.student), frappe.bold(self.course)
				)
			)

	def validate_batch(self):
		if not self.student_batch:
			return

		batch_course = frappe.db.get_value("Student Batch Name", self.student_batch, "course")
		if batch_course and batch_course != self.course:
			frappe.throw(
				_("Batch {0} belongs to Course {1}, not Course {2}").format(
					frappe.bold(self.student_batch),
					frappe.bold(batch_course),
					frappe.bold(self.course),
				)
			)

	def validate_unique(self):
		existing = frappe.db.sql(
			"""
			SELECT name FROM `tabGrade Book`
			WHERE student = %s
				AND course = %s
				AND academic_year = %s
				AND ifnull(academic_term, '') = %s
				AND name != %s
			LIMIT 1
			""",
			(
				self.student,
				self.course,
				self.academic_year,
				self.academic_term or "",
				self.name or "",
			),
		)
		if existing:
			frappe.throw(
				_(
					"Grade Book {0} already exists for Student {1}, Course {2}, Academic Year {3}{4}"
				).format(
					frappe.bold(existing[0][0]),
					frappe.bold(self.student),
					frappe.bold(self.course),
					frappe.bold(self.academic_year),
					(
						_(", Academic Term {0}").format(frappe.bold(self.academic_term))
						if self.academic_term
						else ""
					),
				)
			)

	def validate_grading_scale(self):
		if not self.grading_scale:
			frappe.throw(_("Grading Scale is mandatory"))

		if frappe.db.get_value("Grading Scale", self.grading_scale, "docstatus") != 1:
			frappe.throw(
				_("Grading Scale {0} must be submitted").format(frappe.bold(self.grading_scale))
			)

	def reset_if_identity_changed(self):
		if self.is_new() or self.status != "Computed":
			return

		identity_fields = (
			"student",
			"course",
			"academic_year",
			"academic_term",
			"student_batch",
			"grading_scale",
		)
		if any(self.has_value_changed(field) for field in identity_fields):
			self.status = "Draft"
			self.clear_grades()

	@frappe.whitelist()
	def reset_to_draft(self):
		if self.is_new():
			frappe.throw(_("Save the Grade Book before resetting"))

		if self.status != "Computed":
			return self.name

		self.status = "Draft"
		self.clear_grades()
		self.save()
		return self.name

	@frappe.whitelist()
	def generate_final_grade(self):
		if self.is_new():
			frappe.throw(_("Save the Grade Book before generating the final grade"))

		if not self.grading_scale:
			frappe.throw(_("Grading Scale is mandatory"))

		course = frappe.get_doc("Course", self.course)
		if not course.subjects:
			frappe.throw(
				_("Course {0} has no subjects. Add subjects before generating grades.").format(
					frappe.bold(self.course)
				)
			)

		overrides = {
			row.subject: {
				"percentage": row.percentage,
				"override_comment": row.override_comment,
			}
			for row in self.subjects
			if row.subject and row.is_overridden
		}

		self.set("subjects", [])
		self.set("components", [])

		for row in course.subjects:
			template_name = get_grade_template(
				self.course, row.subject, self.academic_year, self.academic_term
			)
			template = frappe.get_doc("Grade Template", template_name)

			if template.weightage_type == "Assignment Type Weightage":
				percentage, components = self._compute_assignment_percentage(row.subject, template)
			elif template.weightage_type == "Attendance Weightage":
				percentage, components = self._compute_attendance_percentage(row.subject, template)
			else:
				frappe.throw(
					_("Unknown Weightage Type {0} on Grade Template {1}").format(
						frappe.bold(template.weightage_type), frappe.bold(template_name)
					)
				)

			percentage = flt(percentage, 6)
			details = get_grade_details(self.grading_scale, percentage)
			override = overrides.get(row.subject)
			subject_row = {
				"subject": row.subject,
				"grade_template": template_name,
				"computed_percentage": percentage,
				"computed_grade": details.grade_code,
				"percentage": percentage,
				"grade": details.grade_code,
			}
			if override:
				subject_row.update(
					{
						"is_overridden": 1,
						"override_comment": override.get("override_comment"),
						"percentage": flt(override.get("percentage"), 6),
					}
				)
			self.append("subjects", subject_row)
			for component in components:
				self.append("components", component)

		self.status = "Computed"
		self.save()
		return self.name

	def clear_grades(self):
		self.set("subjects", [])
		self.set("components", [])
		self.overall_percentage = 0
		self.overall_grade = None

	def apply_overrides_and_totals(self):
		if self.status != "Computed" or not self.subjects:
			return

		for row in self.subjects:
			if row.is_overridden:
				if not row.override_comment:
					frappe.throw(_("Row {0}: Override Comment is required").format(row.idx))
				details = get_grade_details(self.grading_scale, row.percentage)
				row.grade = details.grade_code
			else:
				row.percentage = row.computed_percentage
				row.grade = row.computed_grade
				row.override_comment = None

		self.compute_overall()

	def compute_overall(self):
		percentages = [flt(row.percentage) for row in self.subjects]
		self.overall_percentage = (
			flt(sum(percentages) / len(percentages), 6) if percentages else 0
		)
		self.overall_grade = get_grade_details(
			self.grading_scale, self.overall_percentage
		).grade_code

	def _compute_assignment_percentage(self, subject, template):
		weights = {
			row.assignment_type: flt(row.weightage)
			for row in template.assignment_weights
			if row.assignment_type
		}
		if not weights:
			frappe.throw(
				_("Grade Template {0} has no Assignment Type weights").format(
					frappe.bold(template.name)
				)
			)

		results = self._get_assessment_results(subject)
		by_type = defaultdict(list)
		for result in results:
			if result.assignment_type in weights:
				by_type[result.assignment_type].append(flt(result.percentage))

		missing = [
			assignment_type for assignment_type in weights if assignment_type not in by_type
		]
		if missing:
			frappe.throw(
				_(
					"Student {0} has no submitted Assessment Result for Assignment Type {1} in Subject {2}"
				).format(
					frappe.bold(self.student),
					frappe.bold(", ".join(missing)),
					frappe.bold(subject),
				)
			)

		weighted = 0
		components = []
		for assignment_type, weightage in weights.items():
			raw_percentage = flt(
				sum(by_type[assignment_type]) / len(by_type[assignment_type]), 6
			)
			weighted_percentage = flt(raw_percentage * weightage / 100.0, 6)
			weighted += weighted_percentage
			components.append(
				{
					"subject": subject,
					"assignment_type": assignment_type,
					"raw_percentage": raw_percentage,
					"weightage": weightage,
					"weighted_percentage": weighted_percentage,
				}
			)

		return weighted, components

	def _get_assessment_results(self, subject):
		conditions = [
			"ar.docstatus = 1",
			"ap.docstatus = 1",
			"ar.student = %(student)s",
			"ap.course = %(course)s",
			"ap.subject = %(subject)s",
			"ap.academic_year = %(academic_year)s",
		]
		values = {
			"student": self.student,
			"course": self.course,
			"subject": subject,
			"academic_year": self.academic_year,
		}

		if self.academic_term:
			conditions.append("ap.academic_term = %(academic_term)s")
			values["academic_term"] = self.academic_term

		if self.student_batch:
			conditions.append("ap.student_batch = %(student_batch)s")
			values["student_batch"] = self.student_batch

		return frappe.db.sql(
			"""
			SELECT ar.percentage, ap.assignment_type
			FROM `tabAssessment Result` ar
			INNER JOIN `tabAssessment Plan` ap ON ap.name = ar.assessment_plan
			WHERE {conditions}
			""".format(
				conditions=" AND ".join(conditions)
			),
			values,
			as_dict=True,
		)

	def _compute_attendance_percentage(self, subject, template):
		weights = {
			row.attendance_type: flt(row.weightage)
			for row in template.attendance_weights
			if row.attendance_type
		}
		if not weights:
			frappe.throw(
				_("Grade Template {0} has no Attendance weights").format(frappe.bold(template.name))
			)

		records = self._get_attendance_records(subject)
		if not records:
			from_date, to_date = self._get_period_dates()
			frappe.throw(
				_(
					"Student {0} has no submitted Attendance between {1} and {2} for Subject {3}"
				).format(
					frappe.bold(self.student),
					frappe.bold(from_date),
					frappe.bold(to_date),
					frappe.bold(subject),
				)
			)

		counts = defaultdict(int)
		total_weight = 0
		for record in records:
			mapped = ATTENDANCE_STATUS_MAP.get(record.status)
			if not mapped:
				continue
			counts[mapped] += 1
			total_weight += weights.get(mapped, 0)

		days = len(records)
		percentage = flt(total_weight / days, 6)

		components = []
		for attendance_type, weightage in weights.items():
			count = counts.get(attendance_type, 0)
			raw_percentage = flt((count / days) * 100.0, 6)
			weighted_percentage = flt((count * weightage) / days, 6)
			components.append(
				{
					"subject": subject,
					"attendance_type": attendance_type,
					"raw_percentage": raw_percentage,
					"weightage": weightage,
					"weighted_percentage": weighted_percentage,
				}
			)

		return percentage, components

	def _get_attendance_records(self, subject):
		from_date, to_date = self._get_period_dates()
		attendance = frappe.qb.DocType("Student Attendance")
		schedule = frappe.qb.DocType("Subject Schedule")

		query = (
			frappe.qb.from_(attendance)
			.left_join(schedule)
			.on(attendance.subject_schedule == schedule.name)
			.select(attendance.status, attendance.subject_schedule, schedule.subject)
			.where(attendance.student == self.student)
			.where(attendance.docstatus == 1)
			.where(attendance.date >= from_date)
			.where(attendance.date <= to_date)
		)
		if self.student_batch:
			query = query.where(attendance.student_batch == self.student_batch)

		records = []
		for record in query.run(as_dict=True):
			if record.subject_schedule and record.subject != subject:
				continue
			records.append(record)
		return records

	def _get_period_dates(self):
		if self.academic_term:
			start, end = frappe.db.get_value(
				"Academic Term",
				self.academic_term,
				["term_start_date", "term_end_date"],
			)
			if start and end:
				return getdate(start), getdate(end)

		start, end = frappe.db.get_value(
			"Academic Year", self.academic_year, ["year_start_date", "year_end_date"]
		)
		if not (start and end):
			frappe.throw(
				_("Academic Year {0} does not have start and end dates").format(
					frappe.bold(self.academic_year)
				)
			)
		return getdate(start), getdate(end)


def _grade_book_exists(student, course, academic_year, academic_term=None):
	return frappe.db.sql(
		"""
		SELECT name FROM `tabGrade Book`
		WHERE student = %s
			AND course = %s
			AND academic_year = %s
			AND ifnull(academic_term, '') = %s
		LIMIT 1
		""",
		(student, course, academic_year, academic_term or ""),
	)


@frappe.whitelist()
def create_grade_books(student_batch, academic_year, academic_term=None):
	frappe.has_permission("Grade Book", ptype="create", throw=True)

	if not student_batch:
		frappe.throw(_("Student Batch is required"))
	if not academic_year:
		frappe.throw(_("Academic Year is required"))

	academic_term = academic_term or None
	batch = frappe.get_doc("Student Batch Name", student_batch)
	enrollments = frappe.get_all(
		"Course Enrollment",
		filters={"student_batch": student_batch, "docstatus": 1},
		fields=["student", "course"],
	)
	if not enrollments:
		frappe.throw(
			_("No submitted Course Enrollments found for Batch {0}").format(
				frappe.bold(student_batch)
			)
		)

	created = []
	skipped = []
	for enrollment in enrollments:
		course = enrollment.course or batch.course
		existing = _grade_book_exists(
			enrollment.student, course, academic_year, academic_term
		)
		if existing:
			skipped.append(existing[0][0])
			continue

		grading_scale = frappe.db.get_value("Course", course, "default_grading_scale")
		if not grading_scale:
			frappe.throw(
				_("Set a Default Grading Scale on Course {0} before creating Grade Books").format(
					frappe.bold(course)
				)
			)

		grade_book = frappe.new_doc("Grade Book")
		grade_book.student = enrollment.student
		grade_book.course = course
		grade_book.academic_year = academic_year
		grade_book.academic_term = academic_term
		grade_book.student_batch = student_batch
		grade_book.company = batch.company
		grade_book.program = batch.program
		grade_book.grading_scale = grading_scale
		grade_book.insert()
		created.append(grade_book.name)

	frappe.msgprint(
		_("Created {0} Grade Book(s). {1} already existed.").format(
			len(created), len(skipped)
		)
	)
	return {"created": created, "skipped": skipped}
