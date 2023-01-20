import frappe

import education.education.utils as utils

no_cache = 1


def get_context(context):
	# Load Query Parameters
	try:
		preview_code = frappe.form_dict["code"]
	except KeyError:
		frappe.local.flags.redirect_location = "/lms"
		raise frappe.Redirect

	# Check if user has access to the content
	cbts = frappe.db.get_list('CBT', filters={
		'preview_url': preview_code
	}, fields=['name', 'owner'],)
	print(cbts)
	cbt = cbts[0]
	has_program_access = utils.is_creator_or_super_user(cbt.owner)

	if not has_program_access:
		frappe.local.flags.redirect_location = "/cbt"
		raise frappe.Redirect

	# Set context for content to be displayed
	cbt = frappe.get_doc("CBT", cbt.name)	


	context.content = cbt.as_dict()
	context.content_type = "Quiz"
	context.program = ""
	context.plan = ""

	# Set context for progress numbers
	context.position = 1
	context.length = 1

	# Set context for navigation
	context.previous = ""
	context.next = ""



def allowed_content_access(program, content, content_type):
	contents_of_program = frappe.db.sql(
		"""select `tabTopic Content`.content, `tabTopic Content`.content_type
	from `tabCourse Topic`,
		 `tabProgram Course`,
		 `tabTopic Content`
	where `tabCourse Topic`.parent = `tabProgram Course`.course
			and `tabTopic Content`.parent = `tabCourse Topic`.topic
			and `tabProgram Course`.parent = %(program)s""",
		{"program": program},
	)

	return (content, content_type) in contents_of_program
