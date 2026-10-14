# Copyright (c) 2015, Frappe Technologies and contributors
# For license information, please see license.txt


import frappe
from frappe import _
from frappe.model.document import Document
from frappe.query_builder import Order
from frappe.utils import cint

from education.education.utils import validate_duplicate_student


class StudentGroup(Document):
    def validate(self):
        self.validate_mandatory_fields()
        self.validate_strength()
        self.validate_students()
        self.validate_and_set_child_table_fields()
        validate_duplicate_student(self.students)

    def validate_mandatory_fields(self):
        if self.group_based_on == "Course" and not self.course:
            frappe.throw(_("Please select Course"))
        if self.group_based_on == "Course" and (not self.program and self.batch):
            frappe.throw(_("Please select Program"))
        if self.group_based_on == "Batch" and not self.program:
            frappe.throw(_("Please select Program"))

    def validate_strength(self):
        if cint(self.max_strength) < 0:
            frappe.throw(_("""Max strength cannot be less than zero."""))
        if self.max_strength and len(self.students) > self.max_strength:
            frappe.throw(
                _(
                    """Cannot enroll more than {0} students for this student group."""
                ).format(self.max_strength)
            )

    def validate_students(self):
        program_enrollment = get_program_enrollment(
            self.academic_year,
            self.academic_term,
            self.program,
            self.batch,
            self.student_category,
            self.course,
        )
        students = [d.student for d in program_enrollment] if program_enrollment else []
        for d in self.students:
            if (
                not frappe.db.get_value("Student", d.student, "enabled")
                and d.active
                and not self.disabled
            ):
                frappe.throw(
                    _("{0} - {1} is inactive student").format(
                        d.group_roll_number, d.student_name
                    )
                )

            if (
                (self.group_based_on == "Batch")
                and cint(frappe.defaults.get_defaults().validate_batch)
                and d.student not in students
            ):
                frappe.throw(
                    _("{0} - {1} is not enrolled in the Batch {2}").format(
                        d.group_roll_number, d.student_name, self.batch
                    )
                )

            if (
                (self.group_based_on == "Course")
                and cint(frappe.defaults.get_defaults().validate_course)
                and (d.student not in students)
            ):
                frappe.throw(
                    _("{0} - {1} is not enrolled in the Course {2}").format(
                        d.group_roll_number, d.student_name, self.course
                    )
                )

    def validate_and_set_child_table_fields(self):
        roll_numbers = [
            d.group_roll_number for d in self.students if d.group_roll_number
        ]
        max_roll_no = max(roll_numbers) if roll_numbers else 0
        roll_no_list = []
        for d in self.students:
            if not d.student_name:
                d.student_name = frappe.db.get_value("Student", d.student, "title")
            if not d.group_roll_number:
                max_roll_no += 1
                d.group_roll_number = max_roll_no
            if d.group_roll_number in roll_no_list:
                frappe.throw(
                    _("Duplicate roll number for student {0}").format(d.student_name)
                )
            else:
                roll_no_list.append(d.group_roll_number)


@frappe.whitelist()
def get_students(
    academic_year: str,
    group_based_on: str,
    academic_term: str | None = None,
    program: str | None = None,
    batch: str | None = None,
    student_category: str | None = None,
    course: str | None = None,
):
    enrolled_students = get_program_enrollment(
        academic_year, academic_term, program, batch, student_category, course
    )

    if enrolled_students:
        student_list = []
        for s in enrolled_students:
            if frappe.db.get_value("Student", s.student, "enabled"):
                s.update({"active": 1})
            else:
                s.update({"active": 0})
            student_list.append(s)
        return student_list
    else:
        frappe.msgprint(_("No students found"))
        return []


def get_program_enrollment(
    academic_year,
    academic_term=None,
    program=None,
    batch=None,
    student_category=None,
    course=None,
):

    ProgramEnrollment = frappe.qb.DocType("Program Enrollment")

    query = (
        frappe.qb.from_(ProgramEnrollment)
        .select(ProgramEnrollment.student, ProgramEnrollment.student_name)
        .where(
            (ProgramEnrollment.academic_year == academic_year)
            & (ProgramEnrollment.docstatus == 1)
        )
        .orderby(ProgramEnrollment.student_name)
    )
    if academic_term:
        query = query.where(ProgramEnrollment.academic_term == academic_term)
    if program:
        query = query.where(ProgramEnrollment.program == program)
    if batch:
        query = query.where(ProgramEnrollment.student_batch_name == batch)
    if student_category:
        query = query.where(ProgramEnrollment.student_category == student_category)
    if course:
        ProgramEnrollmentCourse = frappe.qb.DocType("Program Enrollment Course")
        query = (
            query.inner_join(ProgramEnrollmentCourse)
            .on(ProgramEnrollment.name == ProgramEnrollmentCourse.parent)
            .where(ProgramEnrollmentCourse.course == course)
        )

    return query.run(as_dict=True)


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def fetch_students(
    doctype: str, txt: str, searchfield: str, start: int, page_len: int, filters: dict
):
    if filters.get("group_based_on") != "Activity":
        enrolled_students = get_program_enrollment(
            filters.get("academic_year"),
            filters.get("academic_term"),
            filters.get("program"),
            filters.get("batch"),
            filters.get("student_category"),
        )
        student_group_student = frappe.db.sql_list(
            """select student from `tabStudent Group Student` where parent=%s""",
            (filters.get("student_group")),
        )
        students = (
            [
                d.student
                for d in enrolled_students
                if d.student not in student_group_student
            ]
            if enrolled_students
            else [""]
        ) or [""]
    else:
        students = None

    Student = frappe.qb.DocType("Student")
    query = (
        frappe.qb.from_(Student)
        .select(Student.name, Student.student_name)
        .where(
            Student[searchfield].like(f"%{txt}%")
            | Student.student_name.like(f"%{txt}%")
        )
        .orderby(Student.idx, order=Order.desc)
        .orderby(Student.name)
        .limit(page_len)
        .offset(start)
    )
    if students is not None:
        query = query.where(Student.name.isin(students))

    return query.run()
