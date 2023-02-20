# Copyright (c) 2015, Frappe Technologies and contributors
# For license information, please see license.txt


import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import getdate


class AcademicTerm(Document):
	def autoname(self):
		self.name = (
			self.academic_year + " ({})".format(self.term_name) if self.term_name else ""
		)

	def validate(self):
		self.set_title()
		self.validate_duplication()
		self.validate_dates()
		self.validate_term_against_year()

	def set_title(self):
		self.title = (
			self.academic_year + " ({})".format(self.term_name) if self.term_name else ""
		)

	def validate_duplication(self):
		# Check if entry with same academic_year and the term_name already exists
		term = frappe.db.sql(
			"""select name from `tabAcademic Term` where academic_year= %s and term_name= %s
		and docstatus<2 and name != %s""",
			(self.academic_year, self.term_name, self.name),
		)
		if term:
			frappe.throw(
				_(
					"An academic term with this 'Academic Year' {0} and 'Term Name' {1} already exists. Please modify these entries and try again."
				).format(self.academic_year, self.term_name)
			)

	def validate_dates(self):
		# Check that start of academic year is earlier than end of academic year
		if (
			self.term_start_date
			and self.term_end_date
			and getdate(self.term_start_date) > getdate(self.term_end_date)
		):
			frappe.throw(
				_(
					"The Term End Date cannot be before the Term Start Date. Please correct the dates and try again."
				)
			)

	def validate_term_against_year(self):
		# Check that the start of the term is not before the start of the academic year
		# and end of term is not after the end of the academic year"""

		year = frappe.db.get_value(
			"Academic Year", self.academic_year, ["year_start_date", "year_end_date"], as_dict=1
		)

		if (
			self.term_start_date
			and getdate(year.year_start_date)
			and (getdate(self.term_start_date) < getdate(year.year_start_date))
		):
			frappe.throw(
				_("The Term cannot start before the Academic Year {0}").format(
					frappe.bold(self.academic_year)
				)
			)

		if (
			self.term_end_date
			and getdate(year.year_end_date)
			and (getdate(self.term_end_date) > getdate(year.year_end_date))
		):
			frappe.throw(
				_("The Term cannot end after the Academic Year {0}").format(
					frappe.bold(self.academic_year)
				)
			)
