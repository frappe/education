# Copyright (c) 2015, Frappe Technologies and Contributors
# See license.txt

import datetime
import unittest

import frappe
from frappe.utils import to_timedelta, today
from frappe.utils.data import add_to_date

from education.education.utils import OverlapError

# test_records = frappe.get_test_records('Course Schedule')


class TestSubjectSchedule(unittest.TestCase):
	def test_student_group_conflict(self):
		cs1 = make_subject_schedule_test_record(simulate=True)

		cs2 = make_subject_schedule_test_record(
			schedule_date=cs1.schedule_date,
			from_time=cs1.from_time,
			to_time=cs1.to_time,
			instructor="_Test Instructor 2",
			room=frappe.get_all("Room")[1].name,
			do_not_save=1,
		)
		self.assertRaises(OverlapError, cs2.save)

	def test_instructor_conflict(self):
		cs1 = make_subject_schedule_test_record(simulate=True)

		cs2 = make_subject_schedule_test_record(
			from_time=cs1.from_time,
			to_time=cs1.to_time,
			student_group="Course-TC101-2014-2015 (_Test Academic Term)",
			room=frappe.get_all("Room")[1].name,
			do_not_save=1,
		)
		self.assertRaises(OverlapError, cs2.save)

	def test_room_conflict(self):
		cs1 = make_subject_schedule_test_record(simulate=True)

		cs2 = make_subject_schedule_test_record(
			from_time=cs1.from_time,
			to_time=cs1.to_time,
			student_group="Course-TC101-2014-2015 (_Test Academic Term)",
			instructor="_Test Instructor 2",
			do_not_save=1,
		)
		self.assertRaises(OverlapError, cs2.save)

	def test_no_conflict(self):
		cs1 = make_subject_schedule_test_record(simulate=True)

		make_subject_schedule_test_record(
			from_time=cs1.from_time,
			to_time=cs1.to_time,
			student_group="Course-TC102-2014-2015 (_Test Academic Term)",
			instructor="_Test Instructor 2",
			room=frappe.get_all("Room")[1].name,
		)

	def test_update_schedule_date(self):
		doc = make_subject_schedule_test_record(schedule_date=add_to_date(today(), days=1))
		doc.schedule_date = add_to_date(doc.schedule_date, days=1)
		doc.save()


def make_subject_schedule_test_record(**args):
	args = frappe._dict(args)

	subject_schedule = frappe.new_doc("Course Schedule")
	subject_schedule.student_group = (
		args.student_group or "Course-TC101-2014-2015 (_Test Academic Term)"
	)
	subject_schedule.course = args.course or "TC101"
	subject_schedule.instructor = args.instructor or "_Test Instructor"
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
