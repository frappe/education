# Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.model.naming import append_number_if_name_exists, set_name_by_naming_series
from frappe.utils import getdate


class Faculty(Document):
	def autoname(self):
		naming_method = (
			frappe.db.get_single_value("Education Settings", "faculty_created_by") or "Naming Series"
		)
		if naming_method == "Employee Number":
			if not self.employee:
				frappe.throw(_("Please select Employee"))
			self.name = self.employee
		elif naming_method == "Full Name":
			self.set_title()
			self.name = append_number_if_name_exists("Faculty", self.faculty_name)
		else:
			set_name_by_naming_series(self)

	def validate(self):
		self.set_title()
		self.validate_dates()
		self.validate_duplicate_employee()
		self.validate_user()

	def set_title(self):
		self.faculty_name = " ".join(
			name for name in (self.first_name, self.middle_name, self.last_name) if name
		)

	def validate_dates(self):
		if self.date_of_birth and getdate(self.date_of_birth) >= getdate():
			frappe.throw(_("Date of Birth cannot be greater than today."))

	def validate_duplicate_employee(self):
		if not self.employee:
			return
		existing = frappe.db.exists("Faculty", {"employee": self.employee, "name": ("!=", self.name)})
		if existing:
			frappe.throw(
				_("Employee {0} is already linked to Faculty {1}.").format(
					frappe.bold(self.employee), frappe.bold(existing)
				)
			)

	def validate_user(self):
		"""Create a user for the faculty if one does not already exist"""
		if not self.email_address:
			return
		if not frappe.db.get_single_value(
			"Education Settings", "user_creation_skip"
		) and not frappe.db.exists("User", self.email_address):
			faculty_user = frappe.get_doc(
				{
					"doctype": "User",
					"first_name": self.first_name,
					"last_name": self.last_name,
					"email": self.email_address,
					"gender": self.gender,
					"send_welcome_email": 1,
					"user_type": "System User",
				}
			)
			faculty_user.add_roles("Faculty")
			faculty_user.save(ignore_permissions=True)

			self.user_id = faculty_user.name


def faculty_teaches_subject(faculty, subject):
	if not faculty or not subject:
		return False
	return bool(
		frappe.db.exists(
			"Course Subject",
			{"parenttype": "Faculty", "parent": faculty, "subject": subject},
		)
	)


def get_taught_faculty_subjects(faculties, subjects):
	"""Return {(faculty, subject)} pairs taught by the given faculty members."""
	if not faculties or not subjects:
		return set()

	rows = frappe.get_all(
		"Course Subject",
		filters={
			"parenttype": "Faculty",
			"parent": ["in", list(faculties)],
			"subject": ["in", list(subjects)],
		},
		fields=["parent", "subject"],
	)
	return {(row.parent, row.subject) for row in rows}


def get_faculty_names(subject=None, course=None):
	filters = {"parenttype": "Faculty"}
	if subject:
		filters["subject"] = subject
	elif course:
		subjects = frappe.get_all("Subject", filters={"course": course}, pluck="name")
		if not subjects:
			return []
		filters["subject"] = ["in", subjects]
	return list(set(frappe.get_all("Course Subject", filters=filters, pluck="parent")))


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def faculty_query(doctype: str, txt: str, searchfield: str, start: int, page_len: int, filters: dict | None):
	filters = filters or {}
	faculty_names = get_faculty_names(subject=filters.get("subject"), course=filters.get("course"))
	if not faculty_names:
		return []

	return frappe.db.sql(
		"""
		SELECT name, faculty_name
		FROM `tabFaculty`
		WHERE name IN %(names)s
			AND status = 'Active'
			AND (name LIKE %(txt)s OR ifnull(faculty_name, '') LIKE %(txt)s)
		ORDER BY
			if(locate(%(_txt)s, name), locate(%(_txt)s, name), 99999),
			faculty_name
		LIMIT %(start)s, %(page_len)s
		""",
		{
			"names": faculty_names,
			"txt": f"%{txt}%",
			"_txt": txt.replace("%", ""),
			"start": start,
			"page_len": page_len,
		},
	)


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def subject_query(doctype: str, txt: str, searchfield: str, start: int, page_len: int, filters: dict | None):
	filters = filters or {}
	conditions = ["cs.parenttype = 'Faculty'"]
	values = {
		"txt": f"%{txt}%",
		"_txt": txt.replace("%", ""),
	}
	if filters.get("faculty"):
		conditions.append("cs.parent = %(faculty)s")
		values["faculty"] = filters["faculty"]
	if filters.get("course"):
		conditions.append("s.course = %(course)s")
		values["course"] = filters["course"]

	values["start"] = start
	values["page_len"] = page_len
	query = (
		"""
		SELECT DISTINCT s.name, s.subject_name
		FROM `tabCourse Subject` cs
		INNER JOIN `tabSubject` s ON s.name = cs.subject
		WHERE """
		+ " AND ".join(conditions)
		+ """
			AND (s.name LIKE %(txt)s OR ifnull(s.subject_name, '') LIKE %(txt)s)
		ORDER BY
			if(locate(%(_txt)s, s.name), locate(%(_txt)s, s.name), 99999),
			s.subject_name
		LIMIT %(start)s, %(page_len)s
		"""
	)
	return frappe.db.sql(query, values)


def get_timeline_data(doctype, name):
	"""Return timeline for subject schedules"""
	return dict(
		frappe.db.sql(
			"""
			SELECT unix_timestamp(`schedule_date`), count(*)
			FROM `tabSubject Schedule`
			WHERE
				faculty=%s and
				`schedule_date` > date_sub(curdate(), interval 1 year)
			GROUP BY schedule_date
		""",
			name,
		)
	)
