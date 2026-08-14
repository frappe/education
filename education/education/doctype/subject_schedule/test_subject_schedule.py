# Copyright (c) 2015, Frappe Technologies and Contributors
# See license.txt

import datetime

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import to_timedelta, today
from frappe.utils.data import add_to_date

from education.education.test_utils import (
	create_academic_term,
	create_academic_year,
	create_course,
	create_faculty,
	create_program,
	create_room,
	create_student,
	create_student_batch,
	create_subject,
)
from education.education.utils import OverlapError


class TestSubjectSchedule(FrappeTestCase):
	def setUp(self):
		create_academic_year()
		create_academic_term(
			term_name="Term 1", term_start_date="2023-04-01", term_end_date="2023-09-30"
		)
		create_program("Class 1")
		create_student()
		self.faculty = create_faculty()
		self.faculty_2 = create_faculty(
			first_name="Test", last_name="Faculty 2", email="test.faculty2@example.com"
		)

		create_course()
		create_course("Test Course 2")
		create_subject(course="Test Course")
		create_subject("Test Subject 2", course="Test Course 2")

		create_student_batch(batch_name="Test Batch", course="Test Course")
		create_student_batch(batch_name="Test Batch 2", course="Test Course 2")

		create_room()
		create_room("Test Room 2")

	def tearDown(self):
		frappe.db.rollback()

	def test_student_batch_conflict(self):
		cs1 = make_subject_schedule_test_record(
			simulate=True, schedule_date="2023-08-01", faculty=self.faculty.name
		)
		cs2 = make_subject_schedule_test_record(
			schedule_date=cs1.schedule_date,
			from_time=cs1.from_time,
			to_time=cs1.to_time,
			faculty=self.faculty_2.name,
			room=frappe.get_all("Room")[1].name,
			do_not_save=1,
		)
		self.assertRaises(OverlapError, cs2.save)

	def test_faculty_conflict(self):
		cs1 = make_subject_schedule_test_record(
			simulate=True, schedule_date="2023-08-01", faculty=self.faculty.name
		)

		cs2 = make_subject_schedule_test_record(
			schedule_date=cs1.schedule_date,
			from_time=cs1.from_time,
			to_time=cs1.to_time,
			student_batch="Test Batch 2",
			subject="Test Subject 2",
			room=frappe.get_all("Room")[1].name,
			faculty=self.faculty.name,
			do_not_save=1,
		)
		self.assertRaises(OverlapError, cs2.save)

	def test_room_conflict(self):
		cs1 = make_subject_schedule_test_record(
			simulate=True, schedule_date="2023-08-01", faculty=self.faculty.name
		)

		cs2 = make_subject_schedule_test_record(
			schedule_date=cs1.schedule_date,
			from_time=cs1.from_time,
			to_time=cs1.to_time,
			student_batch="Test Batch 2",
			subject="Test Subject 2",
			faculty=self.faculty_2.name,
			do_not_save=1,
		)
		self.assertRaises(OverlapError, cs2.save)

	def test_no_conflict(self):
		cs1 = make_subject_schedule_test_record(
			simulate=True, schedule_date="2023-08-01", faculty=self.faculty.name
		)

		make_subject_schedule_test_record(
			schedule_date=cs1.schedule_date,
			from_time=cs1.from_time,
			to_time=cs1.to_time,
			student_batch="Test Batch 2",
			subject="Test Subject 2",
			faculty=self.faculty_2.name,
			room=frappe.get_all("Room")[1].name,
		)

	def test_update_schedule_date(self):
		doc = make_subject_schedule_test_record(
			schedule_date=add_to_date("2023-08-01", days=1), faculty=self.faculty.name
		)
		doc.schedule_date = add_to_date(doc.schedule_date, days=1)
		doc.save()

	def test_schedule_outside_batch_dates(self):
		doc = make_subject_schedule_test_record(
			schedule_date="2022-01-01", faculty=self.faculty.name, do_not_save=1
		)
		self.assertRaises(frappe.ValidationError, doc.save)


def make_subject_schedule_test_record(**args):
	args = frappe._dict(args)

	subject_schedule = frappe.new_doc("Subject Schedule")
	subject_schedule.student_batch = args.student_batch or "Test Batch"
	subject_schedule.course = args.course or "Test Course"
	subject_schedule.subject = args.subject or "Test Subject"
	subject_schedule.faculty = args.faculty
	if not subject_schedule.faculty:
		faculty = create_faculty()
		subject_schedule.faculty = faculty.name
	subject_schedule.room = args.room or frappe.get_all("Room")[0].name

	subject_schedule.schedule_date = args.schedule_date or today()
	subject_schedule.from_time = args.from_time or to_timedelta("01:00:00")
	subject_schedule.to_time = (
		args.to_time or subject_schedule.from_time + datetime.timedelta(hours=1)
	)

	if not args.do_not_save:
		if args.simulate:
			while True:
				try:
					subject_schedule.save()
					break
				except OverlapError:
					subject_schedule.from_time = subject_schedule.from_time + datetime.timedelta(
						minutes=10
					)
					subject_schedule.to_time = subject_schedule.from_time + datetime.timedelta(hours=1)
		else:
			subject_schedule.save()

	return subject_schedule
