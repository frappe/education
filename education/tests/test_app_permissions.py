"""App visibility follows native read permissions without allowing guests."""

import unittest
from types import SimpleNamespace
from unittest.mock import patch

import frappe

from education.api.permissions import has_app_permission


class TestEducationAppPermission(unittest.TestCase):
	def test_guest_cannot_open_the_app(self):
		with (
			patch.object(frappe, "session", SimpleNamespace(user="Guest")),
			patch.object(frappe, "has_permission", return_value=True),
		):
			self.assertFalse(has_app_permission())

	def test_document_reader_can_open_the_app(self):
		with (
			patch.object(frappe, "session", SimpleNamespace(user="teacher@example.com")),
			patch.object(
				frappe,
				"has_permission",
				side_effect=lambda doctype, action: doctype == "Faculty" and action == "read",
			),
		):
			self.assertTrue(has_app_permission())

	def test_user_without_read_permission_cannot_open_the_app(self):
		with (
			patch.object(frappe, "session", SimpleNamespace(user="reader@example.com")),
			patch.object(frappe, "has_permission", return_value=False),
		):
			self.assertFalse(has_app_permission())
