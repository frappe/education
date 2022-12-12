from frappe import _

from . import __version__ as app_version

app_name = "education"
app_title = "Education"
app_publisher = "Frappe Technologies Pvt. Ltd."
app_description = "Education"
app_icon = "octicon octicon-file-directory"
app_color = "grey"
app_email = "hello@frappe.io"
app_license = "GNU GPL V3"

required_apps = ["erpnext"]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "/assets/education/css/education.css"
# app_include_js = "/assets/education/js/education.js"
app_include_js = "education.bundle.js"

# include js, css files in header of web template
# web_include_css = "/assets/education/css/education.css"
# web_include_js = "/assets/education/js/education.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "education/public/scss/website"

# website
update_website_context = []

website_generators = ["Student Admission"]

website_route_rules = [
	{"from_route": "/admissions", "to_route": "Student Admission"},
]

treeviews = ["Assessment Group"]

calendars = [
	"Course Schedule",
]

standard_portal_menu_items = [
	{"title": _("Fees"), "route": "/fees", "reference_doctype": "Fees", "role": "Student"},
	{
		"title": _("Admission"),
		"route": "/admissions",
		"reference_doctype": "Student Admission",
		"role": "Student",
	},
]

default_roles = [
	{"role": "Student", "doctype": "Student", "email_field": "student_email_id"},
]

accounting_dimension_doctypes = ["Fee Schedule", "Fee Structure", "Fees"]

global_search_doctypes = {
	"Education": [
		{"doctype": "Article", "index": 1},
		{"doctype": "Video", "index": 2},
		{"doctype": "Topic", "index": 3},
		{"doctype": "Course", "index": 4},
		{"doctype": "Program", "index": 5},
		{"doctype": "Quiz", "index": 6},
		{"doctype": "Question", "index": 7},
		{"doctype": "Fee Schedule", "index": 8},
		{"doctype": "Fee Structure", "index": 9},
		{"doctype": "Fees", "index": 10},
		{"doctype": "Student Group", "index": 11},
		{"doctype": "Student", "index": 12},
		{"doctype": "Instructor", "index": 13},
		{"doctype": "Course Activity", "index": 14},
		{"doctype": "Quiz Activity", "index": 15},
		{"doctype": "Course Enrollment", "index": 16},
		{"doctype": "Program Enrollment", "index": 17},
		{"doctype": "Student Language", "index": 18},
		{"doctype": "Student Applicant", "index": 19},
		{"doctype": "Assessment Result", "index": 20},
		{"doctype": "Assessment Plan", "index": 21},
		{"doctype": "Grading Scale", "index": 22},
		{"doctype": "Guardian", "index": 23},
		{"doctype": "Student Leave Application", "index": 24},
		{"doctype": "Student Log", "index": 25},
		{"doctype": "Room", "index": 26},
		{"doctype": "Course Schedule", "index": 27},
		{"doctype": "Student Attendance", "index": 28},
		{"doctype": "Announcement", "index": 29},
		{"doctype": "Student Category", "index": 30},
		{"doctype": "Assessment Group", "index": 31},
		{"doctype": "Student Batch Name", "index": 32},
		{"doctype": "Assessment Criteria", "index": 33},
		{"doctype": "Academic Year", "index": 34},
		{"doctype": "Academic Term", "index": 35},
		{"doctype": "School House", "index": 36},
		{"doctype": "Student Admission", "index": 37},
		{"doctype": "Fee Category", "index": 38},
		{"doctype": "Assessment Code", "index": 39},
		{"doctype": "Discussion", "index": 40},
	]
}

# fixed route to education setup
domains = {
	"Education": "education.education.setup",
}
# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "education.utils.jinja_methods",
# 	"filters": "education.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "education.install.before_install"
after_install = "education.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "education.uninstall.before_uninstall"
# after_uninstall = "education.uninstall.after_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "education.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# DocType Class
# ---------------
# Override standard doctype classes

# override_doctype_class = {
# 	"ToDo": "custom_app.overrides.CustomToDo"
# }

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
# 	}
# }

# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"education.tasks.all"
# 	],
# 	"daily": [
# 		"education.tasks.daily"
# 	],
# 	"hourly": [
# 		"education.tasks.hourly"
# 	],
# 	"weekly": [
# 		"education.tasks.weekly"
# 	],
# 	"monthly": [
# 		"education.tasks.monthly"
# 	],
# }

# Testing
# -------

# before_tests = "education.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "education.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "education.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]


# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"education.auth.validate"
# ]

# Translation
# --------------------------------

# Make link fields search translated document names for these DocTypes
# Recommended only for DocTypes which have limited documents with untranslated names
# For example: Role, Gender, etc.
# translated_search_doctypes = []
