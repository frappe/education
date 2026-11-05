"""Regressions for report consumers after letter grades moved to Grade Book."""

import json
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch

import frappe

from education.education.doctype.student_report_generation_tool import (
	student_report_generation_tool as report_card,
)
from education.education.report.course_wise_assessment_report import (
	course_wise_assessment_report as course_report,
)
from education.education.report.final_assessment_grades import final_assessment_grades as final_report


class TestAssessmentReporting(unittest.TestCase):
	def test_report_card_query_uses_current_assessment_schema(self):
		root = Path(__file__).resolve().parents[1]
		schema = json.loads((root / "education/doctype/assessment_result/assessment_result.json").read_text())
		available = {field["fieldname"] for field in schema["fields"]} | {"name"}
		row = frappe._dict(student="STU-1", course="COURSE-1", assessment_plan="PLAN-1", percentage=82)
		args = frappe._dict(academic_year="2026", assessment_group="Monthly", students=["STU-1"])
		with (
			patch.object(course_report, "get_child_assessment_groups", return_value=["Monthly"]),
			patch.object(frappe, "get_all", return_value=[row]) as query,
			patch.object(frappe, "db", SimpleNamespace(get_value=Mock(return_value="English"))),
		):
			values = course_report.get_formatted_result(args, get_course=True)
		self.assertTrue(set(query.call_args.args[2]) <= available)
		self.assertEqual(query.call_args.args[1]["student"], ["in", ["STU-1"]])
		self.assertEqual(values["courses"], ["COURSE-1"])
		self.assertEqual(values["assessment_result"][0].subject, "English")

	def test_course_report_exposes_percentage_without_obsolete_grade(self):
		with patch.object(course_report, "_", side_effect=lambda text: text):
			fields = {column["fieldname"] for column in course_report.get_column()}
		self.assertIn("percentage", fields)
		self.assertNotIn("grade", fields)

	def test_final_report_preserves_marks_and_percentage_for_each_course(self):
		rows = [
			frappe._dict(
				student="STU-1",
				student_name="Student",
				assessment_group="Monthly",
				course="English 1",
				score=82,
				percentage=82,
			),
			frappe._dict(
				student="STU-1",
				student_name="Student",
				assessment_group="Monthly",
				course="English 2",
				score=45,
				percentage=90,
			),
		]
		with (
			patch.object(frappe, "get_all", return_value=["STU-1"]),
			patch.object(
				final_report,
				"get_formatted_result",
				return_value={"assessment_result": rows, "courses": ["English 1", "English 2"]},
			),
		):
			data, _ = final_report.get_data([], {"academic_year": "2026", "student_batch": "Batch"})
		self.assertEqual(len(data), 1)
		self.assertEqual(data[0].percentage_english_1, 82)
		self.assertEqual(data[0].percentage_english_2, 90)
		self.assertEqual(data[0].score_english_2, 45)

	def test_report_card_counts_attendance_in_selected_term_with_native_aggregate(self):
		lookup = Mock(return_value=("2026-01-01", "2026-06-30"))
		with (
			patch.object(frappe, "db", SimpleNamespace(get_value=lookup)),
			patch.object(
				frappe,
				"get_all",
				return_value=[
					frappe._dict(status="Present", attendance_count=8),
					frappe._dict(status="Absent", attendance_count=2),
				],
			) as query,
		):
			attendance = report_card.get_attendance_count("STU-1", "2026", "First term")
		self.assertEqual(lookup.call_args.args[:2], ("Academic Term", "First term"))
		self.assertEqual(query.call_args.args[1]["date"], ["between", ("2026-01-01", "2026-06-30")])
		self.assertFalse(isinstance(query.call_args.args[2][1], str))
		self.assertEqual((attendance.present, attendance.absent, attendance.total), (8, 2, 10))
