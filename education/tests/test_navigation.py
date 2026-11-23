"""Navigation exports must use the module-first schema shipped in Frappe v16.5x."""

import json
import unittest
from pathlib import Path


class TestEducationNavigation(unittest.TestCase):
	def test_module_sidebar_is_complete_and_has_unique_destinations(self):
		root = Path(__file__).resolve().parents[1]
		sidebar = json.loads((root / "education/sidebar/education/education.json").read_text())
		self.assertEqual(sidebar["doctype"], "Sidebar")
		self.assertEqual(sidebar["module"], "Education")
		self.assertEqual(sidebar["app"], "education")
		self.assertEqual(sidebar["standard"], 1)
		links = [row for row in sidebar["items"] if row["type"] == "Link"]
		identities = [(row["link_type"], row["link_to"], row.get("filters")) for row in links]
		self.assertEqual(len(identities), len(set(identities)))
		for doctype in ("Faculty", "Course Enrollment", "Subject Registration", "Fee Plan", "Fee Term"):
			self.assertIn(("DocType", doctype, None), identities)
		for row in links:
			if row["link_type"] == "DocType" and row["link_to"] not in ("Sales Invoice", "Sales Order"):
				path = root / "education/doctype" / row["link_to"].lower().replace(" ", "_")
				self.assertTrue(path.is_dir(), row["link_to"])

	def test_desktop_grid_points_to_the_same_native_sidebar(self):
		root = Path(__file__).resolve().parents[1]
		icon = json.loads((root / "desktop_icon/education.json").read_text())
		self.assertEqual(icon["sidebar"], "Education")
