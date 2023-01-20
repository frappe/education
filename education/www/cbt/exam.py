import frappe

import education.education.utils as utils
from frappe import _

no_cache = 1


def get_context(context):
	# Load Query Parameters
	try:
		program = frappe.form_dict["class"]
		plan = frappe.form_dict["plan"]
		cbt = frappe.form_dict["cbt"] 
	except KeyError:
		frappe.local.flags.redirect_location = "/lms"
		raise frappe.Redirect

	# Check if user has access to the content
	has_program_access = utils.allowed_program_access(program)
	has_content_access = True

	if frappe.session.user == "Guest" or not has_program_access or not has_content_access:
		frappe.local.flags.redirect_location = "/cbt"
		raise frappe.Redirect

	# Set context for content to be displayed
	plan = frappe.get_doc("Assessment Plan", plan)
	cbt = frappe.get_doc("CBT", cbt)
	if not utils.has_super_access():
		student = utils.get_current_student()
		enrollment = utils.get_enrollment("subject", plan.course, student.name)
		cbt_attempts = frappe.db.count('CBT Activity', {'enrollment': enrollment, "student": student.name})
		if cbt_attempts >= cbt.max_attempts or not cbt.is_active:
			frappe.redirect_to_message(_('Unavailable'),
			_('This CBT is either currently inactive or you have exceeded the allowed attempts. Please contact your instructor'))
			frappe.local.flags.redirect_location = "/cbt"
			raise frappe.Redirect			


	context.content = cbt.as_dict()
	context.content_type = "Quiz"
	context.program = program
	context.course = plan.course
	context.plan = plan

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
