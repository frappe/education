import frappe
from education.education.doctype.fee_schedule.fee_schedule import get_fee_structure
from education.education.doctype.student_group.student_group import get_students


DEFAULT_PROGRAM_NAME = "Class 1"
DEFAULT_ACADEMIC_YEAR = "2023-2024"
DEFAULT_ACADEMIC_TERM = "2023-2024 (Term 1)"
DEFAULT_STUDENT_GROUP = "Test Student Group"
DEFAULT_GROUP_BASED_ON = "Batch"
DEFAULT_FEES_CATEGORY = "Tuition Fee"


def create_academic_year(**args):
	academic_year = frappe.new_doc("Academic Year")
	academic_year.academic_year_name = args.get(
		"academic_year_name", DEFAULT_ACADEMIC_YEAR
	)
	academic_year.year_start_date = args.get("year_start_date", "2023-04-01")
	academic_year.year_end_date = args.get("year_end_date", "2024-03-31")
	academic_year.save()


def create_academic_term(**args):
	# create 2 terms inside the academic year
	academic_term = frappe.new_doc("Academic Term")
	academic_term.academic_year = args.get("academic_year", DEFAULT_ACADEMIC_YEAR)
	academic_term.term_name = args.get("term_name", "Term 1")
	academic_term.term_start_date = args.get("term_start_date")
	academic_term.term_end_date = args.get("term_end_date")
	academic_term.save()


def create_fee_category(category_name=DEFAULT_FEES_CATEGORY):
	if frappe.db.exists("Fee Category", {"category_name": category_name}):
		return frappe.get_doc("Fee Category", {"category_name": category_name})
	fee_category = frappe.new_doc("Fee Category")
	fee_category.category_name = category_name
	fee_category.save()


def create_program(name=DEFAULT_PROGRAM_NAME):
	program = frappe.new_doc("Program")
	program.program_name = name
	program.save()


def create_fee_structure(**args):
	fee_structure = frappe.new_doc("Fee Structure")
	fee_structure.academic_year = args.get("academic_year", DEFAULT_ACADEMIC_YEAR)
	fee_structure.academic_term = args.get("academic_term", DEFAULT_ACADEMIC_TERM)
	fee_structure.program = args.get("program", DEFAULT_PROGRAM_NAME)
	for i in args.get("components"):
		fee_structure.append(
			"components",
			{
				"fees_category": i.get("fees_category"),
				"amount": i.get("amount"),
				"discount": i.get("discount"),
				"total": i.get("total"),
			},
		)
	fee_structure.save()
	if args.get("submit"):
		fee_structure.submit()
	return fee_structure


def create_student(**args):
	"""
	args first_name,last_name, student_email_id
	"""

	if frappe.db.exists(
		"Student", {"student_email_id": args.get("student_email_id", "test@gmail.com")}
	):
		return frappe.get_doc(
			"Student", {"student_email_id": args.get("student_email_id", "test@gmail.com")}
		)

	student = frappe.new_doc("Student")
	student.first_name = args.get("first_name", "Test")
	student.last_name = args.get("last_name", "Student")
	student.student_email_id = args.get("student_email_id", "test@gmail.com")
	student.save()
	return student


def create_program_enrollment(**args):
	"""
	args program, student ID(student.name), academic_year, academic_term, enrollment_date
	"""
	program_enrollment = frappe.new_doc("Program Enrollment")
	program_enrollment.student = args.get("student_name")
	program_enrollment.program = args.get("program", DEFAULT_PROGRAM_NAME)
	program_enrollment.academic_year = args.get("academic_year", DEFAULT_ACADEMIC_YEAR)
	program_enrollment.academic_term = args.get("academic_term", DEFAULT_ACADEMIC_TERM)
	program_enrollment.enrollment_date = args.get("enrollment_date", "2023-04-01")
	program_enrollment.save()
	if args.get("submit"):
		program_enrollment.submit()
	return program_enrollment


def create_student_group(**args):
	"""
	args have academic_year, academic_term, group_based_on, program, student_group_name
	"""
	student_group = frappe.new_doc("Student Group")
	student_group.student_group_name = args.get(
		"student_group_name", DEFAULT_STUDENT_GROUP
	)
	student_group.academic_year = args.get("academic_year", DEFAULT_ACADEMIC_YEAR)
	student_group.academic_term = args.get("academic_term", DEFAULT_ACADEMIC_TERM)
	student_group.group_based_on = args.get("group_based_on", DEFAULT_GROUP_BASED_ON)
	student_group.program = args.get("program", DEFAULT_PROGRAM_NAME)

	students_in_group = get_students(
		args.get("academic_year", DEFAULT_ACADEMIC_YEAR),
		args.get("group_based_on", DEFAULT_GROUP_BASED_ON),
		args.get("academic_term", DEFAULT_ACADEMIC_TERM),
		args.get("program", DEFAULT_PROGRAM_NAME),
	)

	for student in students_in_group:
		student_group.append("students", {"student": student.get("student")})
	student_group.save()

	return student_group


def create_fee_schedule(**args):
	"""
	args: fee_structure,
	"""
	fee_structure = frappe.db.get_value(
		"Fee Structure",
		{"academic_year": args.get("academic_year", DEFAULT_ACADEMIC_YEAR)},
		"name",
	)

	fee_schedule = frappe.new_doc("Fee Schedule")
	fee_schedule.fee_structure = fee_structure
	fee_schedule = get_fee_structure(fee_schedule)
	fee_schedule.due_date = args.get("due_date", "2023-04-01")

	student_groups = frappe.db.get_list(
		"Student Group",
		{
			"academic_year": DEFAULT_ACADEMIC_YEAR,
			"academic_term": DEFAULT_ACADEMIC_TERM,
			"student_group_name": DEFAULT_STUDENT_GROUP,
		},
		"name",
	)
	for group in student_groups:
		fee_schedule.append("student_groups", {"student_group": group.get("name")})

	fee_schedule.save()
	if args.get("submit"):
		fee_schedule.submit()

	return fee_schedule


def create_instructor(instructor_name="Test Instructor"):
	instructor = frappe.new_doc("Instructor")
	instructor.instructor_name = instructor_name
	instructor.save()


def create_course(course_name="Test Course"):
	course = frappe.new_doc("Course")
	course.course_name = course_name
	course.save()


def create_room(room_name="Test Room"):
	room = frappe.new_doc("Room")
	room.room_name = room_name
	room.save()
