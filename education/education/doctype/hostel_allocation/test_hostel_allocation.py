# Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and Contributors
# See license.txt

import erpnext
import frappe
from frappe.tests.classes.context_managers import freeze_time
from frappe.tests.utils import FrappeTestCase
from frappe.utils import add_days, flt, getdate, nowdate

from education.education.doctype.hostel_allocation.hostel_allocation import (
	get_default_rent,
	process_hostel_allocations,
)
from education.education.report.hostel_occupancy.hostel_occupancy import execute as hostel_occupancy
from education.education.test_utils import create_fee_category

TERM_RENT = 3000
ANNUAL_RENT = 8000
YEAR = "_Test Hostel Year"
YEAR_WITHOUT_TERMS = "_Test Hostel Year Without Terms"


def get_test_company():
	return erpnext.get_default_company() or frappe.get_all("Company", pluck="name")[0]


def get_test_campus(company):
	"""An enabled campus of the company, if it has any. Campus is then required on new records."""
	return frappe.db.get_value("Campus", {"company": company, "disabled": 0})


def days(offset):
	return getdate(add_days(nowdate(), offset))


def make_academic_year(name, start, end, terms=()):
	"""An academic year around today, with terms given as (name, start offset, end offset)."""
	company = get_test_company()
	frappe.get_doc(
		{
			"doctype": "Academic Year",
			"academic_year_name": name,
			"company": company,
			"year_start_date": days(start),
			"year_end_date": days(end),
		}
	).insert()
	for term_name, term_start, term_end in terms:
		frappe.get_doc(
			{
				"doctype": "Academic Term",
				"academic_year": name,
				"term_name": term_name,
				"company": company,
				"term_start_date": days(term_start),
				"term_end_date": days(term_end),
			}
		).insert()


def make_campus(name, company=None):
	company = company or get_test_company()
	if frappe.db.exists("Campus", name):
		return frappe.get_doc("Campus", name)
	return frappe.get_doc(
		{"doctype": "Campus", "campus_name": name, "campus_code": name[-3:].upper(), "company": company}
	).insert()


def make_user(email, roles, campus=None):
	"""A user with only the given roles, optionally restricted to one campus."""
	frappe.get_doc(
		{
			"doctype": "User",
			"email": email,
			"first_name": "Hostel Staff",
			"send_welcome_email": 0,
			"roles": [{"role": role} for role in roles],
		}
	).insert(ignore_permissions=True)
	if campus:
		frappe.get_doc(
			{"doctype": "User Permission", "user": email, "allow": "Campus", "for_value": campus}
		).insert(ignore_permissions=True)
	return email


def make_hostel(name="_Test Hostel", gender="Male", campus=None):
	company = get_test_company()
	return frappe.get_doc(
		{
			"doctype": "Hostel",
			"hostel_name": name,
			"gender": gender,
			"company": company,
			"campus": campus or get_test_campus(company),
			"fee_category": create_fee_category("_Test Hostel Rent").name,
			"rent": TERM_RENT,
			"annual_rent": ANNUAL_RENT,
		}
	).insert()


def make_hostel_room(hostel, room_number="101", capacity=2):
	return frappe.get_doc(
		{"doctype": "Hostel Room", "hostel": hostel, "room_number": room_number, "capacity": capacity}
	).insert()


def make_student(email, gender="Male"):
	frappe.db.set_single_value("Education Settings", "user_creation_skip", 1)
	return frappe.get_doc(
		{
			"doctype": "Student",
			"first_name": "Hostel",
			"last_name": email.split("@")[0],
			"email_address": email,
			"gender": gender,
		}
	).insert()


def make_allocation(
	student, room, academic_year=YEAR, academic_term=None, bed_number=1, submit=True, **kwargs
):
	allocation = frappe.get_doc(
		{
			"doctype": "Hostel Allocation",
			"student": student,
			"academic_year": academic_year,
			"academic_term": academic_term,
			"hostel": room.hostel,
			"hostel_room": room.name,
			"hostel_bed": f"{room.name}-B{bed_number}",
			**kwargs,
		}
	).insert()
	if submit:
		allocation.submit()
	return allocation


class TestHostelAllocation(FrappeTestCase):
	def setUp(self):
		self.addCleanup(frappe.db.rollback)
		# Today falls in Term 1; Terms 2 and 3 are still to come.
		make_academic_year(YEAR, -60, 300, [("Term 1", -60, 29), ("Term 2", 30, 150), ("Term 3", 151, 300)])
		make_academic_year(YEAR_WITHOUT_TERMS, -30, 300)
		self.term_2 = f"{YEAR} (Term 2)"
		self.hostel = make_hostel()
		self.room = make_hostel_room(self.hostel.name)
		self.student = make_student("hostel.one@example.com").name

	def get_invoices(self, allocation):
		return frappe.get_all(
			"Sales Invoice",
			filters={"hostel_allocation": allocation.name, "docstatus": 1},
			fields=["name", "grand_total", "posting_date"],
			order_by="posting_date, creation",
		)

	def test_room_keeps_one_bed_per_place(self):
		beds = frappe.get_all("Hostel Bed", filters={"hostel_room": self.room.name}, pluck="name")
		self.assertEqual(sorted(beds), [f"{self.room.name}-B1", f"{self.room.name}-B2"])

		self.room.capacity = 3
		self.room.save()
		self.assertTrue(frappe.db.exists("Hostel Bed", f"{self.room.name}-B3"))

		# An unused bed above the new count is removed.
		self.room.capacity = 2
		self.room.save()
		self.assertFalse(frappe.db.exists("Hostel Bed", f"{self.room.name}-B3"))

		# An allocated bed blocks the reduction.
		make_allocation(self.student, self.room, bed_number=2)
		self.room.capacity = 1
		self.assertRaises(frappe.ValidationError, self.room.save)

	def test_hostel_gender_is_enforced(self):
		student = make_student("hostel.two@example.com", gender="Female").name
		self.assertRaises(frappe.ValidationError, make_allocation, student, self.room)

	def test_bed_and_student_cannot_be_double_booked(self):
		allocation = make_allocation(self.student, self.room, academic_term=f"{YEAR} (Term 1)")
		self.assertEqual(frappe.db.get_value("Hostel Bed", allocation.hostel_bed, "status"), "Occupied")

		other = make_student("hostel.three@example.com").name
		self.assertRaises(frappe.ValidationError, make_allocation, other, self.room)
		self.assertRaises(frappe.ValidationError, make_allocation, self.student, self.room, bed_number=2)

		# Not even for a later term while the student is still checked in.
		self.assertRaises(
			frappe.ValidationError, make_allocation, other, self.room, academic_term=self.term_2
		)

		allocation.reload().check_out(nowdate())
		make_allocation(other, self.room, academic_term=self.term_2)
		self.assertEqual(frappe.db.get_value("Hostel Bed", allocation.hostel_bed, "status"), "Reserved")

	def test_stay_defaults_to_the_academic_period(self):
		allocation = make_allocation(self.student, self.room, submit=False)
		self.assertEqual(getdate(allocation.from_date), days(0))
		self.assertEqual(getdate(allocation.to_date), days(300))
		self.assertEqual(flt(allocation.rent), TERM_RENT)

		allocation = make_allocation(
			self.student, self.room, academic_year=YEAR_WITHOUT_TERMS, bed_number=2, submit=False
		)
		self.assertEqual(flt(allocation.rent), ANNUAL_RENT)

	def test_stay_must_fall_within_the_academic_period(self):
		self.assertRaises(
			frappe.ValidationError,
			make_allocation,
			self.student,
			self.room,
			academic_term=self.term_2,
			from_date=days(-10),
			to_date=days(5),
		)
		self.assertRaises(
			frappe.ValidationError,
			make_allocation,
			self.student,
			self.room,
			academic_year=YEAR_WITHOUT_TERMS,
			academic_term=self.term_2,
		)

	def test_year_stay_bills_each_term_in_full_as_it_starts(self):
		allocation = make_allocation(self.student, self.room)

		# Checking in partway through Term 1 still bills the whole term, on the check-in day.
		invoices = self.get_invoices(allocation)
		self.assertEqual([flt(invoice.grand_total) for invoice in invoices], [TERM_RENT])
		self.assertEqual(invoices[0].posting_date, days(0))

		with freeze_time(days(30), tick=True):
			process_hostel_allocations()
		with freeze_time(days(31), tick=True):
			process_hostel_allocations()
		self.assertEqual(len(self.get_invoices(allocation)), 2)
		self.assertEqual(allocation.reload().invoices[1].academic_term, self.term_2)

		with freeze_time(days(151), tick=True):
			process_hostel_allocations()
		with freeze_time(days(305), tick=True):
			process_hostel_allocations()
			# Past the planned check-out, the student still holds the bed until checked out.
			self.assertEqual(allocation.reload().status, "Active")
			self.assertEqual(frappe.db.get_value("Hostel Bed", allocation.hostel_bed, "status"), "Occupied")

			allocation.check_out(nowdate(), remarks="Keys returned")
			self.assertEqual(frappe.db.get_value("Hostel Bed", allocation.hostel_bed, "status"), "Vacant")
		allocation.reload()
		self.assertEqual((allocation.status, allocation.check_out_remarks), ("Checked Out", "Keys returned"))
		self.assertEqual(len(self.get_invoices(allocation)), 3)

	def test_term_stay_bills_only_that_term(self):
		allocation = make_allocation(self.student, self.room, academic_term=self.term_2)
		self.assertFalse(self.get_invoices(allocation))
		bed = allocation.hostel_bed
		self.assertEqual(
			frappe.db.get_value("Hostel Bed", bed, ["status", "current_allocation"]),
			("Reserved", allocation.name),
		)

		with freeze_time(days(30), tick=True):
			process_hostel_allocations()
			self.assertEqual(frappe.db.get_value("Hostel Bed", bed, "status"), "Occupied")
		with freeze_time(days(151), tick=True):
			process_hostel_allocations()

		invoices = self.get_invoices(allocation)
		self.assertEqual([flt(invoice.grand_total) for invoice in invoices], [TERM_RENT])
		self.assertEqual(invoices[0].posting_date, days(30))
		self.assertEqual(allocation.reload().status, "Active")

	def test_year_without_terms_is_billed_once(self):
		allocation = make_allocation(self.student, self.room, academic_year=YEAR_WITHOUT_TERMS)
		with freeze_time(days(200), tick=True):
			process_hostel_allocations()

		invoices = self.get_invoices(allocation)
		self.assertEqual([flt(invoice.grand_total) for invoice in invoices], [ANNUAL_RENT])
		self.assertFalse(allocation.reload().invoices[0].academic_term)

	def test_early_check_out_keeps_the_term_fee_and_stops_later_terms(self):
		allocation = make_allocation(self.student, self.room)
		allocation.check_out(nowdate())

		with freeze_time(days(30), tick=True):
			process_hostel_allocations()

		invoices = self.get_invoices(allocation)
		self.assertEqual([flt(invoice.grand_total) for invoice in invoices], [TERM_RENT])
		self.assertEqual(allocation.reload().status, "Checked Out")
		self.assertEqual(frappe.db.get_value("Hostel Bed", allocation.hostel_bed, "status"), "Vacant")

	def test_next_stay_waits_for_check_out(self):
		allocation = make_allocation(self.student, self.room, academic_term=f"{YEAR} (Term 1)")
		other = make_student("hostel.five@example.com").name

		with freeze_time(days(35), tick=True):
			process_hostel_allocations()
			self.assertEqual(
				frappe.db.get_value("Hostel Bed", allocation.hostel_bed, "current_student"), self.student
			)

			# Term 1 is over, but its student has not been checked out yet.
			self.assertRaises(
				frappe.ValidationError, make_allocation, other, self.room, academic_term=self.term_2
			)
			self.assertRaises(
				frappe.ValidationError,
				make_allocation,
				self.student,
				self.room,
				academic_term=self.term_2,
				bed_number=2,
			)

			allocation.reload().check_out(nowdate())
			make_allocation(other, self.room, academic_term=self.term_2)
			self.assertEqual(
				frappe.db.get_value("Hostel Bed", allocation.hostel_bed, "current_student"), other
			)

	def test_late_check_out_does_not_bill_past_the_planned_date(self):
		allocation = make_allocation(self.student, self.room, to_date=days(29))
		with freeze_time(days(40), tick=True):
			process_hostel_allocations()
			allocation.reload().check_out(nowdate())

		self.assertEqual([flt(invoice.grand_total) for invoice in self.get_invoices(allocation)], [TERM_RENT])

	def test_stay_not_started_cannot_be_checked_out(self):
		allocation = make_allocation(self.student, self.room, academic_term=self.term_2)
		self.assertRaises(frappe.ValidationError, allocation.check_out)

	def test_cancel_reverses_invoices_and_frees_the_bed(self):
		allocation = make_allocation(self.student, self.room)
		allocation.reload()
		allocation.cancel()

		self.assertFalse(self.get_invoices(allocation))
		self.assertEqual(allocation.reload().status, "Cancelled")
		self.assertEqual(frappe.db.get_value("Hostel Bed", allocation.hostel_bed, "status"), "Vacant")

	def test_daily_job_records_billing_errors(self):
		allocation = make_allocation(self.student, self.room)
		frappe.db.set_value("Fee Category", allocation.fee_category, "item", None)

		with freeze_time(days(30), tick=True):
			process_hostel_allocations()
		self.assertTrue(allocation.reload().billing_error)
		self.assertEqual(len(self.get_invoices(allocation)), 1)

	def test_bed_under_maintenance_cannot_be_allocated(self):
		bed = frappe.get_doc("Hostel Bed", f"{self.room.name}-B1")
		bed.under_maintenance = 1
		bed.save()
		self.assertEqual(bed.status, "Under Maintenance")
		self.assertRaises(frappe.ValidationError, make_allocation, self.student, self.room)

	def test_stay_must_stay_inside_the_chosen_term(self):
		# Running on into Term 3 would hold the bed without billing Term 3.
		self.assertRaises(
			frappe.ValidationError,
			make_allocation,
			self.student,
			self.room,
			academic_term=self.term_2,
			from_date=days(30),
			to_date=days(200),
		)
		self.assertRaises(
			frappe.ValidationError,
			make_allocation,
			self.student,
			self.room,
			academic_term=self.term_2,
			from_date=days(20),
			to_date=days(100),
		)
		# Checking out the morning after the term's last day is fine.
		make_allocation(self.student, self.room, academic_term=self.term_2, to_date=days(151))

	def test_staff_can_cancel_a_billed_stay(self):
		allocation = make_allocation(self.student, self.room)
		self.assertTrue(self.get_invoices(allocation))

		make_user("hostel.staff@example.com", ["Academics User"])
		frappe.set_user("hostel.staff@example.com")
		self.addCleanup(frappe.set_user, "Administrator")
		frappe.get_doc("Hostel Allocation", allocation.name).cancel()

		frappe.set_user("Administrator")
		self.assertFalse(self.get_invoices(allocation))

	def test_rent_lookup_rejects_a_room_from_another_hostel(self):
		other = make_hostel_room(make_hostel("_Test Other Hostel").name, room_number="900")
		self.assertRaises(frappe.ValidationError, get_default_rent, self.hostel.name, other.name, YEAR)

	def test_company_move_waits_for_active_stays(self):
		make_allocation(self.student, self.room)
		other_company = frappe.db.get_value("Company", {"name": ("!=", self.hostel.company)})
		if not other_company:
			self.skipTest("Needs a second company")

		self.hostel.company = other_company
		self.hostel.campus = None
		self.assertRaises(frappe.ValidationError, self.hostel.save)

	def test_campus_move_carries_active_stays(self):
		allocation = make_allocation(self.student, self.room)
		new_campus = make_campus("_Test Hostel North", self.hostel.company)

		self.hostel.campus = new_campus.name
		self.hostel.save()
		self.assertEqual(frappe.db.get_value("Hostel Allocation", allocation.name, "campus"), new_campus.name)

	def test_occupancy_report_respects_campus_restrictions(self):
		make_allocation(self.student, self.room)
		other_campus = make_campus("_Test Hostel South", self.hostel.company)
		make_user("hostel.south@example.com", ["Academics User"], campus=other_campus.name)

		frappe.set_user("hostel.south@example.com")
		self.addCleanup(frappe.set_user, "Administrator")
		_columns, data, *_ = hostel_occupancy({})
		self.assertFalse([row for row in data if row.hostel == self.hostel.name])

	def test_hostel_occupancy_report(self):
		make_allocation(self.student, self.room)
		other = make_student("hostel.four@example.com").name
		make_allocation(other, self.room, academic_term=self.term_2, bed_number=2)
		_columns, data, _message, _chart, summary = hostel_occupancy({"hostel": self.hostel.name})

		row = next(row for row in data if row.hostel_room == self.room.name)
		self.assertEqual((row.beds, row.occupied, row.reserved, row.vacant), (2, 1, 1, 0))
		self.assertEqual(row.occupancy, 50)
		self.assertEqual(summary[1]["value"], 1)
