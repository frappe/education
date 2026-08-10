# Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt


import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt


class GradingScale(Document):
	def validate(self):
		self.validate_intervals()

	def validate_intervals(self):
		percentages = []
		intervals = []
		has_zero_minimum = False

		for d in self.intervals:
			if d.minimum_percentage is None or d.maximum_percentage is None:
				frappe.throw(
					_("Minimum Percentage and Maximum Percentage are required for grade {0}").format(
						d.grade_code or d.idx
					)
				)

			min_pct = flt(d.minimum_percentage)
			max_pct = flt(d.maximum_percentage)

			if min_pct == 0:
				has_zero_minimum = True

			if min_pct >= max_pct:
				frappe.throw(
					_("Minimum Percentage must be lower than Maximum Percentage for grade {0}").format(
						d.grade_code or d.idx
					)
				)

			for pct, label in ((min_pct, _("Minimum")), (max_pct, _("Maximum"))):
				if pct in percentages:
					frappe.throw(_("{0} Percentage {1}% appears more than once").format(label, pct))
				percentages.append(pct)

			intervals.append((min_pct, max_pct, d.grade_code or d.idx))

		if not has_zero_minimum:
			frappe.throw(_("Please define a grade scale interval with Minimum Percentage of 0%"))

		intervals.sort(key=lambda x: x[0])
		for i in range(len(intervals) - 1):
			__, curr_max, curr_grade = intervals[i]
			next_min, __, next_grade = intervals[i + 1]
			if curr_max > next_min:
				frappe.throw(
					_("Percentage intervals for grades {0} and {1} overlap").format(
						curr_grade, next_grade
					)
				)
