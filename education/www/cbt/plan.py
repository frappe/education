import frappe

import education.education.utils as utils

no_cache = 1


def get_context(context):
	try:
		program = frappe.form_dict["class"]
	except KeyError:
		frappe.local.flags.redirect_location = "/lms"
		raise frappe.Redirect

	education_settings = frappe.get_single("Education Settings")
	context.education_settings = education_settings
	context.program = program


	plans = frappe.get_list("Assessment Plan", filters={
		"program": program, 
		"academic_year": education_settings.current_academic_year,
		"academic_term": education_settings.current_academic_term
	},
	fields=['name', 'cbt', "schedule_date"],
	order_by='schedule_date desc',
	)
	print("plans", plans)
	context.plans = plans
	context.has_access = utils.allowed_program_access(context.program)
	# context.progress = get_topic_progress(context.topics, course, context.program)


def get_topic_progress(topics, course, program):
	progress = {topic.name: utils.get_topic_progress(topic, course.name, program) for topic in topics}
	return progress
