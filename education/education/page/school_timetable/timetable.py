import frappe


@frappe.whitelist()
def get_course_schedule(instructor=None, stream=None, start_date=None, end_date=None):
    """
    Fetch Course Schedule records for the given date range.
    Supports filtering by instructor and/or student group.
    A date range is required to avoid pulling the entire schedule history.
    """
    filters = {}

    if instructor:
        filters["instructor"] = instructor
    if stream:
        filters["student_group"] = stream
    if start_date and end_date:
        filters["schedule_date"] = ["between", [start_date, end_date]]

    return frappe.get_all(
        "Course Schedule",
        filters=filters,
        fields=[
            "name",
            "course",
            "instructor",
            "student_group",
            "schedule_date",
            "from_time",
            "to_time",
            "room",
        ],
        order_by="schedule_date ASC, from_time ASC",
        limit=2000,
    )


@frappe.whitelist()
def get_course_schedule_details(schedule_name):
    """Get full details of a specific Course Schedule record."""
    if not schedule_name:
        return None
    return frappe.get_doc("Course Schedule", schedule_name)


@frappe.whitelist()
def get_teachers():
    """Fetch all instructors."""
    teachers = frappe.get_all(
        "Instructor",
        fields=["name", "instructor_name"],
        order_by="instructor_name ASC",
    )
    return [{"value": t.name, "label": t.instructor_name or t.name} for t in teachers]


@frappe.whitelist()
def get_streams():
    """Fetch all student groups."""
    streams = frappe.get_all(
        "Student Group",
        fields=["name"],
        order_by="name ASC",
    )
    return [{"value": s.name, "label": s.name} for s in streams]


@frappe.whitelist()
def get_academic_terms():
    """Fetch all academic terms with their date bounds for calendar navigation."""
    terms = frappe.get_all(
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
    rooms = frappe.get_all(
        "Room", fields=["name", "room_name"], order_by="room_name ASC"
    )
    return [{"value": r.name, "label": r.room_name or r.name} for r in rooms]


@frappe.whitelist()
def get_courses():
    """Fetch all courses."""
    courses = frappe.get_all(
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
    """Create a new Course Schedule."""
    try:
        if not all(
            [course, instructor, student_group, schedule_date, from_time, to_time]
        ):
            return "error"

        doc = frappe.new_doc("Course Schedule")
        doc.course = course
        doc.instructor = instructor
        doc.student_group = student_group
        doc.schedule_date = schedule_date
        doc.from_time = from_time
        doc.to_time = to_time

        if room:
            doc.room = room

        sg = frappe.get_doc("Student Group", student_group)
        if sg and sg.program:
            doc.program = sg.program

        doc.insert()
        frappe.db.commit()
        return doc.name
    except Exception as e:
        frappe.log_error(f"Failed to create course schedule: {str(e)}")
        return "error"


@frappe.whitelist()
def update_course_schedule(
    schedule_name, schedule_date=None, from_time=None, to_time=None
):
    """Update time/date after drag or resize."""
    try:
        if not schedule_name:
            return "error"
        doc = frappe.get_doc("Course Schedule", schedule_name)
        if schedule_date:
            doc.schedule_date = schedule_date
        if from_time:
            doc.from_time = from_time
        if to_time:
            doc.to_time = to_time
        doc.save()
        frappe.db.commit()
        return "success"
    except Exception as e:
        frappe.log_error(f"Failed to update course schedule: {str(e)}")
        return "error"


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
    """Update all fields of a Course Schedule."""
    try:
        if not schedule_name:
            return "error"
        doc = frappe.get_doc("Course Schedule", schedule_name)
        if course:
            doc.course = course
        if instructor:
            doc.instructor = instructor
        if student_group:
            doc.student_group = student_group
        if room:
            doc.room = room
        if schedule_date:
            doc.schedule_date = schedule_date
        if from_time:
            doc.from_time = from_time
        if to_time:
            doc.to_time = to_time
        doc.save()
        frappe.db.commit()
        return "success"
    except Exception as e:
        frappe.log_error(f"Failed to update course schedule details: {str(e)}")
        return "error"
