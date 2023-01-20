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
	class_enrollment = frappe.get_last_doc('Class Enrollment', filters={"academic_year": context.education_settings.current_academic_year, "student": student.name})
	context.assessment_plans = frappe.db.get_all("Assessment Plan", filters={"program": class_enrollment.program, "academic_year": context.education_settings.current_academic_year, "academic_term": context.education_settings.current_academic_term}, fields=["program", "course", "from_time", "to_time", "supervisor", "cbt", "name"])

def get_featured_programs():
	return utils.get_portal_programs() or []
