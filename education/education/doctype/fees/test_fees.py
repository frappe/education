# Copyright (c) 2015, Frappe Technologies and Contributors
# See license.txt


import frappe
from frappe.utils import nowdate
from frappe.utils.make_random import get_random
from frappe.tests.utils import FrappeTestCase

from education.education.doctype.program.test_program import (
	make_program_and_linked_courses,
)


class TestFees(FrappeTestCase):
	# deprecated
	pass
