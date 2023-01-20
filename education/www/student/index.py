import frappe

import education.education.utils as utils

no_cache = 1


def get_context(context):
	context.education_settings = frappe.get_single("Education Settings")
	# if not context.education_settings.enable_lms:
	# 	frappe.local.flags.redirect_location = "/"
	# 	raise frappe.Redirect
	context.featured_programs = get_featured_programs()
	student = utils.get_current_student()
	context.student = student
	if not student:
			frappe.local.flags.redirect_location = "/"
			raise frappe.Redirect
	results = frappe.db.get_list(
		'CBT Activity',
		filters={
			'student': student.name,
		},
		fields=["course", "score"]
	)
	subjects = []
	scores = []
	for result in results:
		subjects.append(result.course)
		scores.append(result.score)
	context.result_scores = scores
	context.result_subjects = subjects
	context.class_enrollment = frappe.get_last_doc('Class Enrollment', filters={"academic_year": context.education_settings.current_academic_year, "student": student.name})
	context.subjects = frappe.get_list('Subject Enrollment', filters={'student': student.name, "program_enrollment": context.class_enrollment.name}, fields=["program_enrollment", "course", "enrollment_date"])

def get_featured_programs():
	return utils.get_portal_programs() or []
