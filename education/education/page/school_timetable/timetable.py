import frappe
from frappe import _
from frappe.utils import date_diff, getdate

from education.education.utils import get_current_student

# Roles that may see the whole school's schedule. Everyone else is narrowed to
# the student groups they belong to (Student) or are a guardian for.
STAFF_ROLES = {"Academics User", "Education Manager", "Instructor", "System Manager"}

# Upper bound on a single query's span, so the endpoint cannot be used to pull
# the entire schedule history in one call.
MAX_RANGE_DAYS = 400

SCHEDULE_FIELDS = [
	"name",
	"course",
	"instructor",
	"student_group",
	"schedule_date",
	"from_time",
	"to_time",
	"room",
]


def _is_staff():
	"""True when the caller holds a role allowed to see all schedules."""
	return bool(STAFF_ROLES & set(frappe.get_roles()))


def _caller_student_groups():
	"""
	Student Groups the current non-staff caller may see: their own groups if
	they are a Student, plus those of any students they guard.

	Returns an empty list when the caller maps to no student, which callers
	must treat as "show nothing" rather than "show everything".
	"""
	# The lookups below deliberately use get_all: this helper decides what the
	# caller is allowed to see, so it must not itself be filtered by the
	# caller's permissions. Its result is only ever used to narrow a query.
	students = []

	student = get_current_student()
	if student:
		students.append(student.name)

	guardian = frappe.db.get_value("Guardian", {"user": frappe.session.user}, "name")
	if guardian:
		students += frappe.get_all(
			"Student Guardian",
			filters={"guardian": guardian, "parenttype": "Student"},
			pluck="parent",
		)

	if not students:
		return []

	return frappe.get_all(
		"Student Group Student",
		filters={"student": ["in", list(set(students))], "parenttype": "Student Group"},
		pluck="parent",
	)


@frappe.whitelist()
def get_course_schedule(instructor=None, stream=None, start_date=None, end_date=None):
	"""
	Fetch Course Schedule records for the given date range.

	Both dates are required and the span is capped: previously the date filter
	was skipped when either was missing, which returned schedules across the
	whole history. Students and Guardians are further restricted to their own
	student groups.
	"""
	if not (start_date and end_date):
		frappe.throw(_("Both start_date and end_date are required."))

	start, end = getdate(start_date), getdate(end_date)
	if end < start:
		frappe.throw(_("end_date cannot be earlier than start_date."))
	if date_diff(end, start) > MAX_RANGE_DAYS:
		frappe.throw(_("Date range cannot exceed {0} days.").format(MAX_RANGE_DAYS))

	filters = {"schedule_date": ["between", [start, end]]}
	if instructor:
		filters["instructor"] = instructor
	if stream:
		filters["student_group"] = stream

	if not _is_staff():
		allowed = _caller_student_groups()
		if not allowed:
			return []
		if stream:
			if stream not in allowed:
				frappe.throw(
					_("Not permitted to view this student group."), frappe.PermissionError
				)
		else:
			filters["student_group"] = ["in", allowed]

	# get_list applies doctype and user permissions; get_all deliberately does not.
	return frappe.get_list(
		"Course Schedule",
		filters=filters,
		fields=SCHEDULE_FIELDS,
		order_by="schedule_date ASC, from_time ASC",
		limit=2000,
	)


@frappe.whitelist()
def get_course_schedule_details(schedule_name):
	"""Get full details of a specific Course Schedule record."""
	if not schedule_name:
		return None

	doc = frappe.get_doc("Course Schedule", schedule_name)
	# frappe.get_doc does not enforce read permission on its own.
	doc.check_permission("read")

	if not _is_staff() and doc.student_group not in _caller_student_groups():
		frappe.throw(_("Not permitted to view this schedule."), frappe.PermissionError)

	return doc


@frappe.whitelist()
def get_teachers():
	"""Fetch all instructors."""
	teachers = frappe.get_list(
		"Instructor",
		fields=["name", "instructor_name"],
		order_by="instructor_name ASC",
	)
	return [{"value": t.name, "label": t.instructor_name or t.name} for t in teachers]


@frappe.whitelist()
def get_streams():
	"""Fetch all student groups."""
	streams = frappe.get_list(
		"Student Group",
		fields=["name"],
		order_by="name ASC",
	)
	return [{"value": s.name, "label": s.name} for s in streams]


@frappe.whitelist()
def get_academic_terms():
	"""Fetch all academic terms with their date bounds for calendar navigation."""
	terms = frappe.get_list(
		"Academic Term",
		fields=["name", "term_start_date", "term_end_date"],
		order_by="term_start_date DESC",
	)
	return [
		{
			"value": t.name,
			"label": t.name,
			"start": str(t.term_start_date) if t.term_start_date else None,
			"end": str(t.term_end_date) if t.term_end_date else None,
		}
		for t in terms
	]


@frappe.whitelist()
def get_rooms():
	"""Fetch all rooms."""
	rooms = frappe.get_list("Room", fields=["name", "room_name"], order_by="room_name ASC")
	return [{"value": r.name, "label": r.room_name or r.name} for r in rooms]


@frappe.whitelist()
def get_courses():
	"""Fetch all courses."""
	courses = frappe.get_list(
		"Course", fields=["name", "course_name"], order_by="course_name ASC"
	)
	return [{"value": c.name, "label": c.course_name or c.name} for c in courses]


@frappe.whitelist()
def create_course_schedule(
	course,
	instructor,
	student_group,
	room=None,
	schedule_date=None,
	from_time=None,
	to_time=None,
):
	"""
	Create a new Course Schedule.

	Permission is enforced by doc.insert(), which checks create access.
	Errors are allowed to propagate so the caller sees the real reason rather
	than an opaque "error", and the framework rolls the request back.
	"""
	if not all([course, instructor, student_group, schedule_date, from_time, to_time]):
		frappe.throw(_("Course, instructor, student group, date and times are required."))

	doc = frappe.new_doc("Course Schedule")
	doc.course = course
	doc.instructor = instructor
	doc.student_group = student_group
	doc.schedule_date = schedule_date
	doc.from_time = from_time
	doc.to_time = to_time

	if room:
		doc.room = room

	program = frappe.db.get_value("Student Group", student_group, "program")
	if program:
		doc.program = program

	doc.insert()
	return doc.name


@frappe.whitelist()
def update_course_schedule(schedule_name, schedule_date=None, from_time=None, to_time=None):
	"""Update time/date after drag or resize. Write access enforced by doc.save()."""
	if not schedule_name:
		frappe.throw(_("schedule_name is required."))

	doc = frappe.get_doc("Course Schedule", schedule_name)
	if schedule_date:
		doc.schedule_date = schedule_date
	if from_time:
		doc.from_time = from_time
	if to_time:
		doc.to_time = to_time
	doc.save()
	return doc.name


@frappe.whitelist()
def update_course_schedule_details(
	schedule_name,
	course=None,
	instructor=None,
	student_group=None,
	room=None,
	schedule_date=None,
	from_time=None,
	to_time=None,
):
	"""Update all fields of a Course Schedule. Write access enforced by doc.save()."""
	if not schedule_name:
		frappe.throw(_("schedule_name is required."))

	doc = frappe.get_doc("Course Schedule", schedule_name)
	for field, value in (
		("course", course),
		("instructor", instructor),
		("student_group", student_group),
		("room", room),
		("schedule_date", schedule_date),
		("from_time", from_time),
		("to_time", to_time),
	):
		if value:
			setattr(doc, field, value)
	doc.save()
	return doc.name
