# -*- coding: utf-8 -*-
# Copyright (c) 2015, Frappe Technologies and contributors
# For license information, please see license.txt


from datetime import datetime

import frappe
from frappe import _
from frappe.model.document import Document


class CourseSchedule(Document):
	def validate(self):
		self.instructor_name = frappe.db.get_value(
			"Instructor", self.instructor, "instructor_name"
		)
		self.validate_course()
		self.set_title()
		self.validate_date()
		self.validate_time()
		self.validate_overlap()

	def before_save(self):
		self.set_hex_color()

	def set_title(self):
		"""Set document Title"""
		instructor = self.instructor_name or self.instructor
		self.title = (
			f"{self.course} by {instructor}" if instructor else self.course or self.student_batch
		)

	def validate_course(self):
		"""A batch belongs to a single course, so the course follows the batch."""
		course = frappe.db.get_value("Student Batch Name", self.student_batch, "course")
		if course:
			self.course = course

	def validate_date(self):
		start_date, end_date = frappe.db.get_value(
			"Student Batch Name", self.student_batch, ["start_date", "end_date"]
		)
		self.schedule_date = frappe.utils.getdate(self.schedule_date)

		if (
			start_date
			and end_date
			and (
				self.schedule_date < frappe.utils.getdate(start_date)
				or self.schedule_date > frappe.utils.getdate(end_date)
			)
		):
			frappe.throw(
				_("Schedule date selected does not lie within the duration of Batch {0}.").format(
					self.student_batch
				)
			)

	def validate_time(self):
		"""Validates if from_time is greater than to_time"""
		if self.from_time > self.to_time:
			frappe.throw(_("From Time cannot be greater than To Time."))

		"""Handles specicfic case to update schedule date in calendar """
		if isinstance(self.from_time, str):
			try:
				datetime_obj = datetime.strptime(self.from_time, "%Y-%m-%d %H:%M:%S")
				self.schedule_date = datetime_obj
			except ValueError:
				pass

	def validate_overlap(self):
		"""Validates overlap for Batch, Instructor, Room"""

		from education.education.utils import validate_overlap_for

		# Validate overlapping course schedules.
		if self.student_batch:
			validate_overlap_for(self, "Course Schedule", "student_batch")

		validate_overlap_for(self, "Course Schedule", "instructor")
		validate_overlap_for(self, "Course Schedule", "room")

		# validate overlapping assessment schedules.
		if self.student_batch:
			validate_overlap_for(self, "Assessment Plan", "student_batch")

		validate_overlap_for(self, "Assessment Plan", "room")
		validate_overlap_for(self, "Assessment Plan", "supervisor", self.instructor)

	def set_hex_color(self):
		colors = {
			"blue": "#EDF6FD",
			"green": "#E4F5E9",
			"red": "#FFF0F0",
			"orange": "#FFF1E7",
			"yellow": "#FFF7D3",
			"teal": "#E6F7F4",
			"violet": "#F5F2FF",
			"cyan": "#E0F8FF",
			"amber": "#FCF3CF",
			"pink": "#FEEEF8",
			"purple": "#F9F0FF",
		}
		self.color = colors[self.class_schedule_color or "green"]
