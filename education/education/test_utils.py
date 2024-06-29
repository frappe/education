import frappe
from education.education.doctype.fee_schedule.fee_schedule import get_fee_structure
from education.education.doctype.student_group.student_group import get_students
from erpnext.setup.utils import enable_all_roles_and_domains
from frappe.utils import now_datetime, add_years, nowdate


DEFAULT_PROGRAM_NAME = "Class 1"
DEFAULT_ACADEMIC_YEAR = "2023-2024"
DEFAULT_ACADEMIC_TERM = "2023-2024 (Term 1)"
DEFAULT_STUDENT_GROUP = "Test Student Group"
DEFAULT_GROUP_BASED_ON = "Batch"
DEFAULT_FEES_CATEGORY = "Tuition Fee"
DEFAULT_STUDENT_EMAIL_ID = "test@example.com"


def before_tests():
	frappe.clear_cache()
	from frappe.desk.page.setup_wizard.setup_wizard import setup_complete

	year = now_datetime().year
	if not frappe.get_list("Company"):
		setup_complete(
			{
				"currency": "INR",
				"full_name": "Test User",
				"company_name": "_Test Company",
				"timezone": "Asia/Kolkata",
				"company_abbr": "_TC",
				"industry": "Manufacturing",
				"country": "India",
				"fy_start_date": f"{year}-01-01",
				"fy_end_date": f"{year}-12-31",
				"language": "english",
				"company_tagline": "Testing",
				"email": "test@erpnext.com",
				"password": "test",
				"chart_of_accounts": "Standard",
			}
		)

	frappe.db.set_value(
		"Stock Settings", None, "auto_insert_price_list_rate_if_missing", 0
	)
	enable_all_roles_and_domains()
	make_holiday_list()
	frappe.db.commit()


def make_holiday_list(holiday_list_name="Test Holiday List"):
	if not frappe.db.get_value("Holiday List", holiday_list_name):
		holiday_list = frappe.get_doc(
			{
				"doctype": "Holiday List",
				"holiday_list_name": holiday_list_name,
				"from_date": nowdate(),
				"to_date": add_years(nowdate(), 1),
				"weekly_off": "Sunday",
			}
		).insert()
		holiday_list.get_weekly_off_dates()
		holiday_list.save()


def create_academic_year(
	academic_year_name=DEFAULT_ACADEMIC_YEAR, year_start_date=None, year_end_date=None
):
	if frappe.db.exists("Academic Year", {"academic_year_name": DEFAULT_ACADEMIC_YEAR}):
		return

	academic_year = frappe.new_doc("Academic Year")
	academic_year.academic_year_name = academic_year_name
	academic_year.year_start_date = year_start_date or "2023-04-01"
	academic_year.year_end_date = year_end_date or "2024-03-31"
	academic_year.save()


def create_academic_term(
	term_start_date, term_end_date, academic_year=DEFAULT_ACADEMIC_YEAR, term_name="Term 1"
):
	if frappe.db.exists("Academic Term", {"term_name": "Term 1"}):
		return

	academic_term = frappe.new_doc("Academic Term")
	academic_term.academic_year = academic_year
	academic_term.term_name = term_name
	academic_term.term_start_date = term_start_date
	academic_term.term_end_date = term_end_date
	academic_term.save()


def create_fee_category(category_name=DEFAULT_FEES_CATEGORY):
	if frappe.db.exists("Fee Category", {"category_name": category_name}):
		return frappe.get_doc("Fee Category", {"category_name": category_name})
	fee_category = frappe.new_doc("Fee Category")
	fee_category.category_name = category_name
	fee_category.save()
	return fee_category


def create_program(name=DEFAULT_PROGRAM_NAME):
	if frappe.db.exists("Program", {"program_name": name}):
		return
	program = frappe.new_doc("Program")
	program.program_name = name
	program.save()


def create_fee_structure(
	academic_year=DEFAULT_ACADEMIC_YEAR,
	academic_term=DEFAULT_ACADEMIC_TERM,
	program=DEFAULT_PROGRAM_NAME,
	components=None,
	submit=False,
):
	fee_structure = frappe.new_doc("Fee Structure")
	fee_structure.academic_year = academic_year or DEFAULT_ACADEMIC_YEAR
	fee_structure.academic_term = academic_term or DEFAULT_ACADEMIC_TERM
	fee_structure.program = program or DEFAULT_PROGRAM_NAME
	for c in components:
		fee_structure.append(
			"components",
			{
				"fees_category": c.get("fees_category"),
				"amount": c.get("amount"),
				"discount": c.get("discount"),
				"total": c.get("total"),
			},
		)
	fee_structure.save()
	if submit:
		fee_structure.submit()
	return fee_structure


def create_student(
	first_name="Test", last_name="Student", student_email_id=DEFAULT_STUDENT_EMAIL_ID
):

	if frappe.db.exists("Student", {"student_email_id": student_email_id}):
		return frappe.get_doc("Student", {"student_email_id": student_email_id})

	student = frappe.new_doc("Student")
	student.first_name = first_name
	student.last_name = last_name
	student.student_email_id = student_email_id
	student.save()
	return student


def create_program_enrollment(
	student_name,
	program=DEFAULT_PROGRAM_NAME,
	academic_year=DEFAULT_ACADEMIC_YEAR,
	academic_term=DEFAULT_ACADEMIC_TERM,
	enrollment_date="2023-04-01",
	submit=False,
):
	program_enrollment = frappe.new_doc("Program Enrollment")
	program_enrollment.student = student_name
	program_enrollment.program = program
	program_enrollment.academic_year = academic_year
	program_enrollment.academic_term = academic_term
	program_enrollment.enrollment_date = enrollment_date
	program_enrollment.save()
	if submit:
		program_enrollment.submit()
	return program_enrollment


def create_student_group(
	student_group_name=DEFAULT_STUDENT_GROUP,
	academic_year=DEFAULT_ACADEMIC_YEAR,
	academic_term=DEFAULT_ACADEMIC_TERM,
	group_based_on=DEFAULT_GROUP_BASED_ON,
	program=DEFAULT_PROGRAM_NAME,
):
	if frappe.db.exists("Student Group", {"student_group_name": student_group_name}):
		return frappe.get_doc("Student Group", {"student_group_name": student_group_name})
	student_group = frappe.new_doc("Student Group")
	student_group.student_group_name = student_group_name
	student_group.academic_year = academic_year
	student_group.academic_term = academic_term
	student_group.group_based_on = group_based_on
	student_group.program = program

	students_in_group = get_students(academic_year, group_based_on, academic_term, program)

	for student in students_in_group:
		student_group.append("students", {"student": student.get("student")})
	student_group.save()

	return student_group


def create_fee_schedule(
	academic_year=DEFAULT_ACADEMIC_YEAR, submit=False, fee_structure=None
):
	due_date = frappe.utils.add_days(frappe.utils.nowdate(), 2)
	fee_structure_name = fee_structure or frappe.db.get_value(
		"Fee Structure", {"academic_year": academic_year}, "name"
	)
	fee_schedule = frappe.new_doc("Fee Schedule")
	fee_schedule.fee_structure = fee_structure_name
	fee_schedule = get_fee_structure(fee_structure_name)
	fee_schedule.due_date = due_date

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
	if submit:
		fee_schedule.submit()

	return fee_schedule


def create_instructor(instructor_name="Test Instructor"):
	if not frappe.db.exists("Instructor", {"instructor_name": instructor_name}):
		instructor = frappe.new_doc("Instructor")
		instructor.instructor_name = instructor_name
		instructor.save()


def create_course(course_name="Test Course"):
	if not frappe.db.exists("Course", {"course_name": course_name}):
		course = frappe.new_doc("Course")
		course.course_name = course_name
		course.save()


def create_room(room_name="Test Room"):
	if not frappe.db.exists("Room", {"room_name": room_name}):
		room = frappe.new_doc("Room")
		room.room_name = room_name
		room.save()


def create_grading_scale(grading_scale_name="_Test Grading Scale"):
	if frappe.db.exists("Grading Scale", grading_scale_name):
		return

	grading_scale = frappe.new_doc("Grading Scale")
	grading_scale.grading_scale_name = grading_scale_name
	grades = {"A": 80, "B": 70, "C": 60, "D": 50, "F": 0}
	for grade, threshold in grades.items():
		grading_scale.append("intervals", {"grade_code": grade, "threshold": threshold})

	grading_scale.save()
	grading_scale.submit()


def create_company(company_name):
	company = frappe.get_doc(
		{"doctype": "Company", "company_name": company_name, "default_currency": "INR"}
	)
	company.insert(ignore_if_duplicate=True)


def get_defaults(company_name="_Test Company"):
	defaults = frappe.get_all(
		"Company",
		filters={"name": company_name},
		fields=["default_income_account", "cost_center"],
		limit=1,
	)[0]
	return defaults
