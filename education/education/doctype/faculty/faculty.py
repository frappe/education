# Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import getdate


class Faculty(Document):
	def validate(self):
		self.set_title()
		self.validate_dates()
		self.validate_user()

	def set_title(self):
		self.faculty_name = " ".join(filter(None, [self.first_name, self.middle_name, self.last_name]))

	def validate_dates(self):
		if self.date_of_birth and getdate(self.date_of_birth) >= getdate():
			frappe.throw(_("Date of Birth cannot be greater than today."))

	def validate_user(self):
		"""Create a website user for faculty creation if not already exists"""
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
					"user_type": "Website User",
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
def faculty_query(doctype, txt, searchfield, start, page_len, filters):
	filters = filters or {}
	faculty_names = get_faculty_names(subject=filters.get("subject"), course=filters.get("course"))
	if not faculty_names:
		return []

	return frappe.db.sql(
		"""
		SELECT name, faculty_name
		FROM `tabFaculty`
		WHERE name IN %(names)s
			AND (name LIKE %(txt)s OR ifnull(faculty_name, '') LIKE %(txt)s)
		ORDER BY
			if(locate(%(_txt)s, name), locate(%(_txt)s, name), 99999),
			faculty_name
		LIMIT {start}, {page_len}
		""".format(start=start, page_len=page_len),
		{
			"names": faculty_names,
			"txt": f"%{txt}%",
			"_txt": txt.replace("%", ""),
		},
	)


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def subject_query(doctype, txt, searchfield, start, page_len, filters):
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

	return frappe.db.sql(
		"""
		SELECT DISTINCT s.name, s.subject_name
		FROM `tabCourse Subject` cs
		INNER JOIN `tabSubject` s ON s.name = cs.subject
		WHERE {conditions}
			AND (s.name LIKE %(txt)s OR ifnull(s.subject_name, '') LIKE %(txt)s)
		ORDER BY
			if(locate(%(_txt)s, s.name), locate(%(_txt)s, s.name), 99999),
			s.subject_name
		LIMIT {start}, {page_len}
		""".format(conditions=" AND ".join(conditions), start=start, page_len=page_len),
		values,
	)


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
