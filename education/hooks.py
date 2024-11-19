from frappe import _

from . import __version__ as app_version

app_name = "education"
app_title = "Education"
app_publisher = "Frappe Technologies Pvt. Ltd."
app_description = "Education"
app_icon = "octicon octicon-file-directory"
app_color = "grey"
app_email = "hello@frappe.io"
app_license = "gpl-3.0"

# Apps
# ------------------

required_apps = ["erpnext"]

# Each item in the list will be shown as an app in the apps page
add_to_apps_screen = [
	{
		"name": "education",
		"logo": "/assets/education/images/education_logo.svg",
		"title": "Education",
		"route": "/app/education",
# 		"has_permission": "education.api.permission.has_app_permission"
	}
]

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
	{"from_route": "/student-portal/<path:app_path>", "to_route": "student-portal"},
]

treeviews = ["Assessment Group"]

calendars = [
	"Course Schedule",
]

standard_portal_menu_items = [
	{
		"title": "Admission",
		"route": "/admissions",
		"reference_doctype": "Student Admission",
		"role": "Student",
	},
]

default_roles = [
	{"role": "Student", "doctype": "Student", "email_field": "student_email_id"},
]

accounting_dimension_doctypes = ["Fee Schedule", "Fee Structure"]

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
		{"doctype": "Student Group", "index": 10},
		{"doctype": "Student", "index": 11},
		{"doctype": "Instructor", "index": 12},
		{"doctype": "Course Activity", "index": 13},
		{"doctype": "Quiz Activity", "index": 14},
		{"doctype": "Course Enrollment", "index": 15},
		{"doctype": "Program Enrollment", "index": 16},
		{"doctype": "Student Language", "index": 17},
		{"doctype": "Student Applicant", "index": 18},
		{"doctype": "Assessment Result", "index": 19},
		{"doctype": "Assessment Plan", "index": 20},
		{"doctype": "Grading Scale", "index": 21},
		{"doctype": "Guardian", "index": 22},
		{"doctype": "Student Leave Application", "index": 23},
		{"doctype": "Student Log", "index": 24},
		{"doctype": "Room", "index": 25},
		{"doctype": "Course Schedule", "index": 26},
		{"doctype": "Student Attendance", "index": 27},
		{"doctype": "Announcement", "index": 28},
		{"doctype": "Student Category", "index": 29},
		{"doctype": "Assessment Group", "index": 30},
		{"doctype": "Student Batch Name", "index": 31},
		{"doctype": "Assessment Criteria", "index": 32},
		{"doctype": "Academic Year", "index": 33},
		{"doctype": "Academic Term", "index": 34},
		{"doctype": "School House", "index": 35},
		{"doctype": "Student Admission", "index": 36},
		{"doctype": "Fee Category", "index": 37},
		{"doctype": "Assessment Code", "index": 38},
		{"doctype": "Discussion", "index": 39},
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

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "education/public/icons.svg"

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

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "education.utils.before_app_install"
# after_app_install = "education.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "education.utils.before_app_uninstall"
# after_app_uninstall = "education.utils.after_app_uninstall"

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

before_tests = "education.education.test_utils.before_tests"

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

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["education.utils.before_request"]
# after_request = ["education.utils.after_request"]

# Job Events
# ----------
# before_job = ["education.utils.before_job"]
# after_job = ["education.utils.after_job"]

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

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

