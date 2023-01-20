# Copyright (c) 2023, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

from frappe.model.document import Document
import frappe
from frappe import _

class SubjectEnrollmentTool(Document):

	@frappe.whitelist()
	def get_enrollments(self):
		students = []
		if not self.class_name:
			frappe.throw(_("Mandatory field - Class"))
		elif not self.academic_year:
			frappe.throw(_("Mandatory field - Academic Year. Add in Educational Settings"))
		else:
			students = frappe.db.sql(
				"""select name as enrollment, student, student_name from `tabClass Enrollment`
				where program=%(class_name)s and academic_year=%(academic_year)s and docstatus != 2""",
				self.as_dict(),
				as_dict=1,
			)
		if students:
			return students
		else:
			frappe.throw(_("No students Found"))
	
	@frappe.whitelist()
	def get_current_academic_info(self):
		settings = frappe.get_doc('Education Settings', ['current_academic_term', 'current_academic_year'])
		return {"academic_year": settings.current_academic_year, "academic_term": settings.current_academic_term}

	@frappe.whitelist()
	def enroll_students(self):
		total = len(self.students)
		for subject in self.subjects:
			for i, stud in enumerate(self.students):
				frappe.publish_realtime(
					"subject_enrollment_tool", dict(progress=[i + 1, total]), user=frappe.session.user
				)
				subj_enrollment = frappe.new_doc("Subject Enrollment")
				subj_enrollment.student = stud.student
				subj_enrollment.program_enrollment = stud.enrollment
				subj_enrollment.course = subject.subject
				subj_enrollment.enrollment_date = frappe.utils.nowdate()
				subj_enrollment.save()

			frappe.msgprint(_("{0} Students have been enrolled in {1}").format(total, subject.subject))

