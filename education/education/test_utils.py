import frappe


def create_academic_year(name, start_date, end_date):
	academic_year = frappe.new_doc("Academic Year")
	academic_year.academic_year_name = name
	academic_year.year_start_date = start_date
	academic_year.year_end_date = end_date
	academic_year.save()


def create_academic_term(year, name, start_date, end_date):
	# create 2 terms inside the academic year
	academic_term = frappe.new_doc("Academic Term")
	academic_term.academic_year = year
	academic_term.term_name = name
	academic_term.term_start_date = start_date
	academic_term.term_end_date = end_date
	academic_term.save()


def create_fee_category(category_name):
	fee_category = frappe.new_doc("Fee Category")
	fee_category.category_name = category_name
	fee_category.save()


def create_program(name):
	program = frappe.new_doc("Program")
	program.program_name = name
	program.save()


def create_fee_structure(args):
	fee_structure = frappe.new_doc("Fee Structure")
	fee_structure.academic_year = args.get("academic_year")
	fee_structure.academic_term = args.get("academic_term")
	fee_structure.program = args.get("program")
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
	if args.get("submit_fee_structure"):
		fee_structure.submit()
	return fee_structure


def create_student(args):
	"""
	args first_name,last_name, student_email_id
	"""
	student = frappe.new_doc("Student")
	student.first_name = args.get("first_name", "_Test ")
	student.last_name = args.get("last_name", "Student")
	student.student_email_id = args.get("student_email_id", "test@gmail.com")
	student.save()
	return student


def create_program_enrollment(args):
	"""
	args have program, student ID(student.name), academic_year, academic_term, enrollment_date
	"""
	program_enrollment = frappe.new_doc("Program Enrollment")
	program_enrollment.program = args.get("program")
	program_enrollment.student = args.get("student_name")
	program_enrollment.academic_year = args.get("academic_year")
	program_enrollment.academic_term = args.get("academic_term")
	program_enrollment.enrollment_date = args.get("enrollment_date")
	program_enrollment.save()
	if args.get("submit"):
		program_enrollment.submit()
	return program_enrollment


def create_student_group(args):
	"""
	args have academic_year, academic_term, group_based_on, program, student_group_name
	"""
	student_group = frappe.new_doc("Student Group")
	student_group.academic_year = args.get("academic_year")
	student_group.academic_term = args.get("academic_term")
	student_group.group_based_on = args.get("group_based_on")
	student_group.program = args.get("program")
	student_group.student_group_name = args.get("student_group_name")
	# import get_students from education.education.doctype.student_group.student_group
	from education.education.doctype.student_group.student_group import get_students

	students_in_group = get_students(
		args.get("academic_year"),
		args.get("group_based_on"),
		args.get("academic_term"),
		args.get("program"),
	)
	print(students_in_group)

	for student in students_in_group:
		student_group.append("students", {"student": student.get("student")})
	student_group.save()

	return student_group

	# then show what it returns
