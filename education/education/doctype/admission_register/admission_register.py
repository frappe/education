# Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.utils import cint, getdate, today
from frappe.website.website_generator import WebsiteGenerator

STATUS_DRAFT = "Draft"
STATUS_SUBMITTED = "Submitted"
STATUS_PUBLISHED = "Published"
STATUS_ADMISSION_OPEN = "Admission Open"
STATUS_CLOSED = "Closed"
STATUS_CANCELLED = "Cancelled"

APPLICATION_ALLOWED_STATUSES = (STATUS_ADMISSION_OPEN,)
ENROLLMENT_ALLOWED_STATUSES = (STATUS_ADMISSION_OPEN, STATUS_CLOSED)
WEBSITE_VISIBLE_STATUSES = (STATUS_PUBLISHED, STATUS_ADMISSION_OPEN)

STATUS_TRANSITIONS = {
	STATUS_SUBMITTED: {STATUS_PUBLISHED, STATUS_CLOSED},
	STATUS_PUBLISHED: {STATUS_SUBMITTED, STATUS_ADMISSION_OPEN, STATUS_CLOSED},
	STATUS_ADMISSION_OPEN: {STATUS_CLOSED},
	STATUS_CLOSED: {STATUS_ADMISSION_OPEN},
}


class AdmissionRegister(WebsiteGenerator):
	website = frappe._dict(condition_field="published")

	def validate(self):
		if self.docstatus == 0:
			self.status = STATUS_DRAFT

		self.set_title()
		self.set_route()
		self.published = cint(self.docstatus == 1 and self.status in WEBSITE_VISIBLE_STATUSES)
		self.validate_academic_term()

		if self.end_date < self.start_date:
			frappe.throw(_("End Date cannot be before Start Date"))

		if self.admission_based_on == "Course":
			if not self.course:
				frappe.throw(_("Course is required"))

			if not self.course_fee_amount:
				frappe.throw(_("Course Fee Amount is required"))

		elif self.admission_based_on == "Program":
			if not self.program:
				frappe.throw(_("Program is required"))

		if self.registration_fee:
			if not self.registration_fee_item:
				frappe.throw(_("Registration Fee Item is required"))

			if not self.registration_fee_amount:
				frappe.throw(_("Registration Fee Amount is required"))

		if self.max_number_of_admissions < 1:
			frappe.throw(_("Max Number of Admissions must be greater than 0"))

		if self.minimum_age < 1:
			frappe.throw(_("Minimum Age must be greater than 0"))

		if self.admission_based_on == "Program":
			self.validate_duplicate_courses()
			if any(row.course_fee_amount <= 0 for row in self.courses):
				frappe.throw(_("Course Fee Amount must be greater than 0 for all courses"))

	def validate_academic_term(self):
		if not self.academic_term:
			return

		term_year = frappe.db.get_value("Academic Term", self.academic_term, "academic_year")
		if term_year != self.academic_year:
			frappe.throw(
				_("Academic Term {0} does not belong to Academic Year {1}").format(
					frappe.bold(self.academic_term), frappe.bold(self.academic_year)
				)
			)

	def set_title(self):
		if self.title:
			return

		if self.admission_based_on == "Program" and self.program:
			self.title = _("Admissions for {0} ({1})").format(self.program, self.academic_year)
		elif self.admission_based_on == "Course" and self.course:
			self.title = _("Admissions for {0} ({1})").format(self.course, self.academic_year)
		else:
			self.title = self.name

	def set_route(self):
		if not self.route:
			self.route = self.make_route()
		if self.route:
			self.route = self.route.strip("/.")[:139]

	def make_route(self):
		return f"{self.meta.route}/{self.scrub(self.name)}"

	def validate_duplicate_courses(self):
		seen_courses = set()
		for row in self.courses or []:
			if not row.course:
				continue
			if row.course in seen_courses:
				frappe.throw(
					_("Row {0}: Course {1} is duplicated. Each Course can only be added once.").format(
						row.idx, frappe.bold(row.course)
					)
				)
			seen_courses.add(row.course)

	def on_submit(self):
		self.db_set("status", STATUS_SUBMITTED)
		self.sync_website_published()

	def on_cancel(self):
		self.db_set("status", STATUS_CANCELLED)
		self.sync_website_published()

	@frappe.whitelist()
	def publish(self):
		self.set_admission_status(STATUS_PUBLISHED)
		frappe.msgprint(_("Admission Register has been published."), alert=True)

	@frappe.whitelist()
	def unpublish(self):
		self.set_admission_status(STATUS_SUBMITTED)
		frappe.msgprint(_("Admission Register has been unpublished."), alert=True)

	@frappe.whitelist()
	def start_admission(self):
		self.set_admission_status(STATUS_ADMISSION_OPEN)
		frappe.msgprint(_("Admission has started."), alert=True)

	@frappe.whitelist()
	def close_admission(self):
		self.set_admission_status(STATUS_CLOSED)
		frappe.msgprint(_("Admission has been closed."), alert=True)

	@frappe.whitelist()
	def reopen_admission(self):
		self.set_admission_status(STATUS_ADMISSION_OPEN)
		frappe.msgprint(_("Admission has been reopened."), alert=True)

	def set_admission_status(self, status):
		if not self.flags.ignore_permissions:
			self.check_permission("write")

		if self.docstatus != 1:
			frappe.throw(_("Admission Register must be submitted before changing its stage."))

		if self.status == status:
			self.sync_website_published()
			return

		allowed = STATUS_TRANSITIONS.get(self.status, set())
		if status not in allowed:
			frappe.throw(
				_("Cannot change status from {0} to {1}.").format(
					frappe.bold(self.status), frappe.bold(status)
				)
			)

		self.validate_status_transition(status)
		self.db_set("status", status)
		self.sync_website_published()
		self.notify_update()

	def sync_website_published(self):
		published = cint(self.docstatus == 1 and self.status in WEBSITE_VISIBLE_STATUSES)
		if not self.route:
			self.db_set("route", self.make_route())
		if cint(self.published) != published:
			self.db_set("published", published)
		self.clear_cache()

	def validate_status_transition(self, status):
		today_date = getdate(today())
		end_date = getdate(self.end_date)

		if status in (STATUS_PUBLISHED, STATUS_ADMISSION_OPEN) and today_date > end_date:
			frappe.throw(
				_("Cannot {0} because the admission end date {1} has already passed.").format(
					(_("publish") if status == STATUS_PUBLISHED else _("start or reopen admission")),
					frappe.bold(self.end_date),
				)
			)

	def get_context(self, context):
		context.no_cache = 1
		context.show_sidebar = True
		context.title = self.title or self.name
		context.show_apply_button = self.status == STATUS_ADMISSION_OPEN
		context.parents = [
			{
				"name": "admission-registers",
				"title": _("Admissions"),
				"route": "admission-registers",
			}
		]
		return context

	@frappe.whitelist()
	def get_course_details(self):
		if self.course:
			course = frappe.get_doc("Course", self.course)
			return {
				"registration_fee_amount": course.registration_fee_amount,
				"registration_fee": course.registration_fee,
				"registration_fee_item": course.registration_fee_item,
			}


# Frappe looks for the below function on the module level
def get_list_context(context=None):
	context = context or frappe._dict()
	context.update(
		{
			"show_sidebar": True,
			"title": _("Admissions"),
			"no_breadcrumbs": False,
			"allow_guest": True,
			"order_by": "start_date asc",
			"filters": {"docstatus": 1, "end_date": [">=", today()]},
			"row_template": "education/doctype/admission_register/templates/admission_register_row.html",
		}
	)
	return context


def process_admission_register_schedules():
	"""Daily job: start published intakes whose start date has arrived, then close expired ones."""
	start_due_admissions()
	close_expired_admissions()


def start_due_admissions():
	registers = frappe.get_all(
		"Admission Register",
		filters={
			"docstatus": 1,
			"status": STATUS_PUBLISHED,
			"start_date": ["<=", today()],
			"end_date": [">=", today()],
		},
		pluck="name",
	)
	for name in registers:
		_run_scheduled_status_change(name, STATUS_ADMISSION_OPEN)


def close_expired_admissions():
	registers = frappe.get_all(
		"Admission Register",
		filters={
			"docstatus": 1,
			"status": [
				"in",
				[STATUS_SUBMITTED, STATUS_PUBLISHED, STATUS_ADMISSION_OPEN],
			],
			"end_date": ["<", today()],
		},
		pluck="name",
	)
	for name in registers:
		_run_scheduled_status_change(name, STATUS_CLOSED)


def _run_scheduled_status_change(name, status):
	try:
		doc = frappe.get_doc("Admission Register", name)
		doc.flags.ignore_permissions = True
		doc.set_admission_status(status)
		if not frappe.flags.in_test:
			frappe.db.commit()
	except Exception:
		frappe.db.rollback()
		frappe.log_error(
			frappe.get_traceback(),
			_("Admission Register schedule update failed for {0}").format(name),
		)
