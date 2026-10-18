import frappe
from frappe import _


class StudentNotInBatchError(frappe.ValidationError):
	pass


def validate_student_belongs_to_batch(student, student_batch):
	if not student_batch:
		return

	if not frappe.db.exists(
		"Course Enrollment",
		{"student": student, "student_batch": student_batch, "docstatus": 1},
	):
		frappe.throw(
			_("Student {0} is not enrolled in Batch {1}").format(
				frappe.bold(student), frappe.bold(student_batch)
			),
			StudentNotInBatchError,
		)
