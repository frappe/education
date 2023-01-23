# Copyright (c) 2015, Frappe Technologies and contributors
# For license information, please see license.txt


import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import cint

from education.education.utils import validate_duplicate_student, get_user_id_from_instructor


class StudentGroup(Document):
	def validate(self):
		self.validate_mandatory_fields()
		self.validate_strength()
		self.validate_students()
		self.validate_and_set_child_table_fields()
		validate_duplicate_student(self.students)

	def validate_mandatory_fields(self):
		if not self.program:
			frappe.throw(_("Please select Class"))

	def validate_strength(self):
		if cint(self.max_strength) < 0:
			frappe.throw(_("""Max strength cannot be less than zero."""))
		if self.max_strength and len(self.students) > self.max_strength:
			frappe.throw(
				_("""Cannot enroll more than {0} students for this student group.""").format(
					self.max_strength
				)
			)

	def validate_students(self):
		program_enrollment = get_program_enrollment(
			self.academic_year,
			self.academic_term,
			self.program,
		)
		students = [d.student for d in program_enrollment] if program_enrollment else []
		for d in self.students:
			if (
				not frappe.db.get_value("Student", d.student, "enabled")
				and d.active
				and not self.disabled
			):
				frappe.throw(
					_("{0} - {1} is inactive student").format(d.group_roll_number, d.student_name)
				)
		
	def on_update(self):
		for instructor in self.instructors:
			user_id = get_user_id_from_instructor(instructor.instructor)
			roles = frappe.get_roles(user_id)
			if "Class Instructor" not in roles:
				frappe.get_doc("User", user_id).add_roles("Class Instructor")


	def validate_and_set_child_table_fields(self):
		roll_numbers = [d.group_roll_number for d in self.students if d.group_roll_number]
		max_roll_no = max(roll_numbers) if roll_numbers else 0
		roll_no_list = []
		for d in self.students:
			if not d.student_name:
				d.student_name = frappe.db.get_value("Student", d.student, "title")
			if not d.group_roll_number:
				max_roll_no += 1
				d.group_roll_number = max_roll_no
			if d.group_roll_number in roll_no_list:
				frappe.throw(_("Duplicate roll number for student {0}").format(d.student_name))
			else:
				roll_no_list.append(d.group_roll_number)


@frappe.whitelist()
def get_students(
	academic_year,
	academic_term=None,
	program=None,
	batch=None,
	student_category=None,
	course=None,
):
	enrolled_students = get_program_enrollment(
		academic_year, academic_term, program, batch, student_category, course
	)

	if enrolled_students:
		student_list = []
		for s in enrolled_students:
			if frappe.db.get_value("Student", s.student, "enabled"):
				s.update({"active": 1})
			else:
				s.update({"active": 0})
			student_list.append(s)
		return student_list
	else:
		frappe.msgprint(_("No students found"))
		return []


def get_program_enrollment(
	academic_year,
	academic_term=None,
	program=None,
	batch=None,
	student_category=None,
	course=None,
):

	condition1 = " "
	condition2 = " "
	if academic_term:
		condition1 += " and pe.academic_term = %(academic_term)s"
	if program:
		condition1 += " and pe.program = %(program)s"
	if batch:
		condition1 += " and pe.student_batch_name = %(batch)s"
	if student_category:
		condition1 += " and pe.student_category = %(student_category)s"
	if course:
		condition1 += " and pe.name = pec.parent and pec.course = %(course)s"
		condition2 = ", `tabProgram Enrollment Course` pec"

	return frappe.db.sql(
		"""
		select
			pe.student, pe.student_name
		from
			`tabClass Enrollment` pe {condition2}
		where
			pe.academic_year = %(academic_year)s  
			and pe.docstatus = 1 {condition1}
		order by
			pe.student_name asc
		""".format(
			condition1=condition1, condition2=condition2
		),
		(
			{
				"academic_year": academic_year,
				"academic_term": academic_term,
				"program": program,
				"batch": batch,
				"student_category": student_category,
				"course": course,
			}
		),
		as_dict=1,
	)


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def fetch_students(doctype, txt, searchfield, start, page_len, filters):
	enrolled_students = get_program_enrollment(
		filters.get("academic_year"),
		filters.get("academic_term"),
		filters.get("program"),
		filters.get("batch"),
		filters.get("student_category"),
	)
	student_group_student = frappe.db.sql_list(
		"""select student from `tabStudent Group Student` where parent=%s""",
		(filters.get("student_group")),
	)
	students = (
		[d.student for d in enrolled_students if d.student not in student_group_student]
		if enrolled_students
		else [""]
	) or [""]
	return frappe.db.sql(
		"""select name, student_name from tabStudent
		where name in ({0}) and (`{1}` LIKE %s or student_name LIKE %s)
		order by idx desc, name
		limit %s, %s""".format(
			", ".join(["%s"] * len(students)), searchfield
		),
		tuple(students + ["%%%s%%" % txt, "%%%s%%" % txt, start, page_len]),
	)

