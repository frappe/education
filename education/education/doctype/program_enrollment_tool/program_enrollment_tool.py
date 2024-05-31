# Copyright (c) 2015, Frappe and contributors
# For license information, please see license.txt


import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import cint

from education.education.api import enroll_student


class ProgramEnrollmentTool(Document):
	def onload(self):
		academic_term_reqd = cint(
			frappe.db.get_single_value("Education Settings", "academic_term_reqd")
		)
		self.set_onload("academic_term_reqd", academic_term_reqd)

	@frappe.whitelist()
	def get_students(self):
		students = []
		if not self.get_students_from:
			frappe.throw(_("Mandatory field - Get Students From"))
		elif not self.program:
			frappe.throw(_("Mandatory field - Program"))
		elif not self.academic_year:
			frappe.throw(_("Mandatory field - Academic Year"))
		else:
			if self.get_students_from == "Student Applicant":
				student_applicant = frappe.qb.DocType("Student Applicant")

				students = (
					frappe.qb.from_(student_applicant)
					.select(
						(student_applicant.name).as_("student_applicant"),
						(student_applicant.title).as_("student_name"),
					)
					.where(student_applicant.application_status == "Approved")
					.where(student_applicant.program == self.program)
					.where(student_applicant.academic_year == self.academic_year)
				)
				if self.academic_term:
					students = students.where(student_applicant.academic_term == self.academic_term)
				students = students.run(as_dict=1)

			elif self.get_students_from == "Program Enrollment":
				program_enrollment = frappe.qb.DocType("Program Enrollment")
				students = (
					frappe.qb.from_(program_enrollment)
					.select(
						program_enrollment.student,
						program_enrollment.student_name,
						program_enrollment.student_batch_name,
						program_enrollment.student_category,
					)
					.where(program_enrollment.program == self.program)
					.where(program_enrollment.academic_year == self.academic_year)
				)
				if self.academic_term:
					students = students.where(program_enrollment.academic_term == self.academic_term)
				if self.student_batch:
					students = students.where(
						program_enrollment.student_batch_name == self.student_batch
					)
				students = students.run(as_dict=1)

				student_list = [d.student for d in students]
				if student_list:
					inactive_students = frappe.db.sql(
						"""
						select name as student, student_name from `tabStudent` where name in (%s) and enabled = 0"""
						% ", ".join(["%s"] * len(student_list)),
						tuple(student_list),
						as_dict=1,
					)

					for student in students:
						if student.student in [d.student for d in inactive_students]:
							students.remove(student)

		if students:
			return students
		else:
			frappe.throw(_("No students Found"))

	@frappe.whitelist()
	def enroll_students(self):
		total = len(self.students)
		for i, stud in enumerate(self.students):
			frappe.publish_realtime(
				"program_enrollment_tool", dict(progress=[i + 1, total]), user=frappe.session.user
			)
			if stud.student:
				prog_enrollment = frappe.new_doc("Program Enrollment")
				prog_enrollment.student = stud.student
				prog_enrollment.student_name = stud.student_name
				prog_enrollment.student_category = stud.student_category
				prog_enrollment.program = self.new_program
				prog_enrollment.academic_year = self.new_academic_year
				prog_enrollment.academic_term = self.new_academic_term
				prog_enrollment.student_batch_name = (
					stud.student_batch_name if stud.student_batch_name else self.new_student_batch
				)
				prog_enrollment.enrollment_date = self.enrollment_date
				prog_enrollment.save()

			elif stud.student_applicant:
				prog_enrollment = enroll_student(stud.student_applicant)
				prog_enrollment.academic_year = self.academic_year
				prog_enrollment.academic_term = self.academic_term
				prog_enrollment.student_batch_name = (
					stud.student_batch_name if stud.student_batch_name else self.new_student_batch
				)
				prog_enrollment.save()

		frappe.msgprint(_("{0} Students have been enrolled").format(total))
