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
		self.set_title()
		self.validate_course()
		self.validate_date()
		self.validate_time()
		self.validate_overlap()

	def before_save(self):
		self.set_hex_color()

	def set_title(self):
		"""Set document Title"""
		self.title = (
			self.course
			+ " by "
			+ (self.instructor_name if self.instructor_name else self.instructor)
		)

	def validate_course(self):
		group_based_on, course = frappe.db.get_value(
			"Student Group", self.student_group, ["group_based_on", "course"]
		)
		if group_based_on == "Course":
			self.course = course

	def validate_date(self):
		academic_year, academic_term = frappe.db.get_value(
			"Student Group", self.student_group, ["academic_year", "academic_term"]
		)
		self.schedule_date = frappe.utils.getdate(self.schedule_date)

		if academic_term:
			start_date, end_date = frappe.db.get_value(
				"Academic Term", academic_term, ["term_start_date", "term_end_date"]
			)
			if (
				start_date
				and end_date
				and (self.schedule_date < start_date or self.schedule_date > end_date)
			):
				frappe.throw(
					_(
						"Schedule date selected does not lie within the Academic Term of the Student Group {0}."
					).format(self.student_group)
				)

		elif academic_year:
			start_date, end_date = frappe.db.get_value(
				"Academic Year", academic_year, ["year_start_date", "year_end_date"]
			)
			if self.schedule_date < start_date or self.schedule_date > end_date:
				frappe.throw(
					_(
						"Schedule date selected does not lie within the Academic Year of the Student Group {0}."
					).format(self.student_group)
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
		"""Validates overlap for Student Group, Instructor, Room"""

		from education.education.utils import validate_overlap_for

		# Validate overlapping course schedules.
		if self.student_group:
			validate_overlap_for(self, "Course Schedule", "student_group")

		validate_overlap_for(self, "Course Schedule", "instructor")
		validate_overlap_for(self, "Course Schedule", "room")

		# validate overlapping assessment schedules.
		if self.student_group:
			validate_overlap_for(self, "Assessment Plan", "student_group")

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
