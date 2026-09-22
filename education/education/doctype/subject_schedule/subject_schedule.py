# -*- coding: utf-8 -*-
# Copyright (c) 2015, Frappe Technologies and contributors
# For license information, please see license.txt


from datetime import datetime

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import formatdate, getdate


class SubjectSchedule(Document):
	def validate(self):
		self.set_faculty_name()
		self.validate_course()
		self.validate_subject()
		self.set_title()
		self.validate_time()
		self.validate_date()
		self.validate_overlap()

	def before_save(self):
		self.set_hex_color()

	def set_faculty_name(self):
		if self.faculty:
			self.faculty_name = frappe.db.get_value("Faculty", self.faculty, "faculty_name")

	def set_title(self):
		"""Set document Title as '{subject} by {faculty}'"""
		faculty = self.faculty_name or self.faculty
		subject = self.subject
		if subject and faculty:
			self.title = f"{subject} by {faculty}"
		else:
			self.title = subject or faculty or self.student_batch

	def validate_course(self):
		"""A batch belongs to a single course, so the course follows the batch."""
		course = frappe.db.get_value("Student Batch Name", self.student_batch, "course")
		if course:
			self.course = course

	def validate_subject(self):
		if not (self.subject and self.course):
			return

		subject_course = frappe.db.get_value("Subject", self.subject, "course")
		if subject_course and subject_course != self.course:
			frappe.throw(
				_("Subject {0} does not belong to Course {1}").format(
					frappe.bold(self.subject), frappe.bold(self.course)
				)
			)

	def validate_date(self):
		start_date, end_date = frappe.db.get_value(
			"Student Batch Name", self.student_batch, ["start_date", "end_date"]
		)
		self.schedule_date = getdate(self.schedule_date)

		if not (start_date and end_date):
			return

		start_date, end_date = getdate(start_date), getdate(end_date)
		if self.schedule_date < start_date or self.schedule_date > end_date:
			frappe.throw(
				_("Schedule date {0} is outside the duration of Batch {1} ({2} to {3}).").format(
					frappe.bold(formatdate(self.schedule_date)),
					frappe.bold(self.student_batch),
					formatdate(start_date),
					formatdate(end_date),
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
		"""Validates overlap for Batch, Faculty, Room"""

		from education.education.utils import validate_overlap_for

		if self.student_batch:
			validate_overlap_for(self, "Subject Schedule", "student_batch")

		validate_overlap_for(self, "Subject Schedule", "faculty")
		validate_overlap_for(self, "Subject Schedule", "room")

		if self.student_batch:
			validate_overlap_for(self, "Assessment Plan", "student_batch")

		validate_overlap_for(self, "Assessment Plan", "room")
		if self.faculty:
			validate_overlap_for(self, "Assessment Plan", "faculty", self.faculty)

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
