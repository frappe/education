# Copyright (c) 2015, Frappe Technologies and Contributors
# See license.txt

import datetime


import frappe
from frappe.utils import to_timedelta, today
from frappe.utils.data import add_to_date
from frappe.tests.utils import FrappeTestCase
from education.education.utils import OverlapError
from education.education.test_utils import (
	create_academic_year,
	create_academic_term,
	create_program,
	create_student,
	create_program_enrollment,
	create_student_group,
	create_instructor,
	create_course,
	create_room,
)


class TestCourseSchedule(FrappeTestCase):
	def setUp(self):
		create_academic_year()
		create_academic_term(
			term_name="Term 1", term_start_date="2023-04-01", term_end_date="2023-09-30"
		)
		create_program("Class 1")
		student = create_student()
		create_program_enrollment(student_name=student.name, submit=1)
		create_student_group(student_group_name="Test Student Group")
		create_student_group(student_group_name="Test Student Group 2")

		create_instructor()
		create_instructor("Test Instructor 2")

		create_course()
		create_course("Test Course 2")

		create_room()
		create_room("Test Room 2")

	def tearDown(self):
		frappe.db.rollback()

	def test_student_group_conflict(self):
		cs1 = make_course_schedule_test_record(simulate=True, schedule_date="2023-08-01")
		cs2 = make_course_schedule_test_record(
			schedule_date=cs1.schedule_date,
			from_time=cs1.from_time,
			to_time=cs1.to_time,
			instructor="Test Instructor 2",
			room=frappe.get_all("Room")[1].name,
			do_not_save=1,
		)
		self.assertRaises(OverlapError, cs2.save)

	def test_instructor_conflict(self):
		cs1 = make_course_schedule_test_record(simulate=True, schedule_date="2023-08-01")

		cs2 = make_course_schedule_test_record(
			schedule_date=cs1.schedule_date,
			from_time=cs1.from_time,
			to_time=cs1.to_time,
			student_group="Test Student Group 2",
			room=frappe.get_all("Room")[1].name,
			do_not_save=1,
		)
		self.assertRaises(OverlapError, cs2.save)

	def test_room_conflict(self):
		cs1 = make_course_schedule_test_record(simulate=True, schedule_date="2023-08-01")

		cs2 = make_course_schedule_test_record(
			schedule_date=cs1.schedule_date,
			from_time=cs1.from_time,
			to_time=cs1.to_time,
			student_group="Test Student Group 2",
			instructor="Test Instructor 2",
			do_not_save=1,
		)
		self.assertRaises(OverlapError, cs2.save)

	def test_no_conflict(self):
		cs1 = make_course_schedule_test_record(simulate=True, schedule_date="2023-08-01")

		make_course_schedule_test_record(
			schedule_date=cs1.schedule_date,
			from_time=cs1.from_time,
			to_time=cs1.to_time,
			student_group="Test Student Group 2",
			instructor="Test Instructor 2",
			room=frappe.get_all("Room")[1].name,
		)

	def test_update_schedule_date(self):
		doc = make_course_schedule_test_record(
			schedule_date=add_to_date("2023-08-01", days=1)
		)
		doc.schedule_date = add_to_date(doc.schedule_date, days=1)
		doc.save()


def make_course_schedule_test_record(**args):
	args = frappe._dict(args)

	course_schedule = frappe.new_doc("Course Schedule")
	course_schedule.student_group = args.student_group or "Test Student Group"
	course_schedule.course = args.course or "Test Course"
	course_schedule.instructor = args.instructor or "Test Instructor"
	course_schedule.room = args.room or frappe.get_all("Room")[0].name

	course_schedule.schedule_date = args.schedule_date or today()
	course_schedule.from_time = args.from_time or to_timedelta("01:00:00")
	course_schedule.to_time = (
		args.to_time or course_schedule.from_time + datetime.timedelta(hours=1)
	)

	if not args.do_not_save:
		if args.simulate:
			while True:
				try:
					course_schedule.save()
					break
				except OverlapError:
					course_schedule.from_time = course_schedule.from_time + datetime.timedelta(
						minutes=10
					)
					course_schedule.to_time = course_schedule.from_time + datetime.timedelta(hours=1)
		else:
			course_schedule.save()

	return course_schedule
