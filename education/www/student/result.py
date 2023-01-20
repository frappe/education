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
	context.results = frappe.db.get_all("CBT Activity", filters={"student": student.name}, fields=["activity_date", "score", "status", "cbt", "course", "time_taken"])

def get_featured_programs():
	return utils.get_portal_programs() or []
