# Copyright (c) 2015, Frappe Technologies and contributors
# For license information, please see license.txt


import frappe
from frappe import _
from frappe.model.document import Document


class Course(Document):
	def validate(self):
		self.validate_registration_fee()
		self.validate_grade_templates()
		self.validate_duplicate_grade_templates()

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

	# def get_topics(self):
	#     topic_data = []
	#     for topic in self.topics:
	#         topic_doc = frappe.get_doc("Topic", topic.topic)
	#         if topic_doc.topic_content:
	#             topic_data.append(topic_doc)
	#     return topic_data

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

	def validate_duplicate_grade_templates(self):
		seen_names = set()
		seen_keys = set()
		for row in self.grade_templates or []:
			if not row.grade_template:
				continue

			if row.grade_template in seen_names:
				frappe.throw(
					_("Row {0}: Grade Template {1} is duplicated").format(
						row.idx, frappe.bold(row.grade_template)
					)
				)
			seen_names.add(row.grade_template)

			year, term, weightage_type = frappe.db.get_value(
				"Grade Template",
				row.grade_template,
				["academic_year", "academic_term", "weightage_type"],
			)
			key = (year, term or "", weightage_type)
			if key in seen_keys:
				frappe.throw(
					_(
						"Row {0}: Grade Template {1} duplicates another template for Academic Year {2}, Academic Term {3}, and Weightage Type {4}"
					).format(
						row.idx,
						frappe.bold(row.grade_template),
						frappe.bold(year),
						frappe.bold(term) if term else _("None"),
						frappe.bold(weightage_type),
					)
				)
			seen_keys.add(key)


@frappe.whitelist()
def get_grade_template(course, subject, academic_year, academic_term=None):
	"""Return the Grade Template for a course subject in a given academic period."""
	if not course:
		frappe.throw(_("Course is required"))
	if not subject:
		frappe.throw(_("Subject is required"))
	if not academic_year:
		frappe.throw(_("Academic Year is required"))

	academic_term = academic_term or None
	course_doc = frappe.get_doc("Course", course)

	subject_row = next(
		(row for row in course_doc.subjects or [] if row.subject == subject), None
	)
	if not subject_row:
		frappe.throw(
			_("Subject {0} is not part of Course {1}").format(
				frappe.bold(subject), frappe.bold(course)
			)
		)

	if not subject_row.use_course_grade_template:
		if not subject_row.grade_template:
			frappe.throw(
				_("Subject {0} on Course {1} does not have a Grade Template").format(
					frappe.bold(subject), frappe.bold(course)
				)
			)
		_assert_template_matches_period(
			subject_row.grade_template, academic_year, academic_term
		)
		return subject_row.grade_template

	candidates = []
	seen = set()
	for row in course_doc.grade_templates or []:
		if not row.grade_template or row.grade_template in seen:
			continue
		seen.add(row.grade_template)

		year, term = frappe.db.get_value(
			"Grade Template", row.grade_template, ["academic_year", "academic_term"]
		)
		if year != academic_year:
			continue
		if academic_term and term and term != academic_term:
			continue
		candidates.append(row.grade_template)

	if not candidates:
		period = academic_year
		if academic_term:
			period = f"{academic_year} / {academic_term}"
		frappe.throw(
			_("No Grade Template found on Course {0} for Subject {1} in {2}").format(
				frappe.bold(course), frappe.bold(subject), frappe.bold(period)
			)
		)

	if len(candidates) > 1:
		frappe.throw(
			_(
				"Multiple Grade Templates match Course {0}, Subject {1}, and Academic Year {2}. Keep one matching template on the Course or set a template on the Subject."
			).format(
				frappe.bold(course), frappe.bold(subject), frappe.bold(academic_year)
			)
		)

	return candidates[0]


def _assert_template_matches_period(grade_template, academic_year, academic_term=None):
	year, term = frappe.db.get_value(
		"Grade Template", grade_template, ["academic_year", "academic_term"]
	)
	if year != academic_year:
		frappe.throw(
			_("Grade Template {0} belongs to Academic Year {1}, not {2}").format(
				frappe.bold(grade_template), frappe.bold(year), frappe.bold(academic_year)
			)
		)
	if academic_term and term and term != academic_term:
		frappe.throw(
			_("Grade Template {0} belongs to Academic Term {1}, not {2}").format(
				frappe.bold(grade_template), frappe.bold(term), frappe.bold(academic_term)
			)
		)
