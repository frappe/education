# Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.query_builder.functions import Coalesce, Sum
from frappe.utils import add_days, cstr, flt, formatdate, getdate, nowdate, strip_html

from education.education.doctype.campus.campus import apply_campus_to_invoice
from education.education.doctype.hostel_bed.hostel_bed import get_bed_status

OPEN_END = "9999-12-31"


class HostelAllocation(Document):
	"""A student's stay in one bed for an academic year, or one of its terms.

	Rent is billed per academic term: each term the stay covers is invoiced in full once the
	term starts. An academic year without terms is billed once, at the annual rent.

	Check-out dates are exclusive: a stay from the 1st to the 11th covers ten nights, so the
	next student can check in to the same bed on the 11th.

	A stay only ends when the student is checked out. Until then the allocation stays Active
	and holds the bed, even past the planned check-out date.
	"""

	def onload(self):
		self.set_onload("billing_summary", self.get_billing_summary())

	def validate(self):
		self.validate_academic_period()
		self.set_missing_values()
		self.validate_dates()
		self.validate_bed()
		self.validate_gender()
		self.validate_overlap()
		self.validate_billing()
		self.validate_previous_stay_checked_out()
		if self.docstatus == 0:
			self.status = "Draft"

	def before_submit(self):
		self.status = "Active"

	def on_submit(self):
		self.bill_due_periods()
		update_bed_occupancy(self.hostel_bed)

	def on_cancel(self):
		self.ignore_linked_doctypes = ("GL Entry", "Stock Ledger Entry", "Payment Ledger Entry")
		self.cancel_invoices()
		self.db_set("status", "Cancelled")
		update_bed_occupancy(self.hostel_bed)

	def validate_academic_period(self):
		hostel_company = frappe.db.get_value("Hostel", self.hostel, "company")
		year_company = frappe.db.get_value("Academic Year", self.academic_year, "company")
		if year_company and hostel_company and year_company != hostel_company:
			frappe.throw(
				_("Academic Year {0} belongs to Company {1}, but Hostel {2} belongs to {3}.").format(
					frappe.bold(self.academic_year),
					frappe.bold(year_company),
					frappe.bold(self.hostel),
					frappe.bold(hostel_company),
				)
			)

		if self.academic_term:
			term_year = frappe.db.get_value("Academic Term", self.academic_term, "academic_year")
			if term_year != self.academic_year:
				frappe.throw(
					_("Academic Term {0} is not in Academic Year {1}.").format(
						frappe.bold(self.academic_term), frappe.bold(self.academic_year)
					)
				)

	def get_academic_period(self):
		"""Start and end dates (inclusive) of the selected term, or of the year."""
		if self.academic_term:
			return frappe.db.get_value(
				"Academic Term", self.academic_term, ["term_start_date", "term_end_date"]
			)
		return frappe.db.get_value("Academic Year", self.academic_year, ["year_start_date", "year_end_date"])

	def set_missing_values(self):
		hostel = frappe.db.get_value(
			"Hostel", self.hostel, ["company", "campus", "fee_category"], as_dict=True
		)
		self.company = hostel.company
		self.campus = hostel.campus
		self.fee_category = self.fee_category or hostel.fee_category

		period_start, period_end = self.get_academic_period()
		if not self.from_date:
			today = getdate(nowdate())
			in_period = getdate(period_start) <= today <= getdate(period_end)
			self.from_date = today if in_period else period_start
		if not self.to_date:
			self.to_date = period_end

		if self.rent is None:
			self.rent = get_default_rent(
				self.hostel, self.hostel_room, self.academic_year, self.academic_term
			)

	def validate_dates(self):
		if getdate(self.to_date) <= getdate(self.from_date):
			frappe.throw(_("Planned Check-out Date must be after the Check-in Date."))

		# Billing covers only the chosen period, so the stay may not reach outside it. Check-out
		# is exclusive, so a student can leave the morning after the period's last day.
		period_start, period_end = self.get_academic_period()
		latest_check_out = add_days(period_end, 1)
		if not (
			getdate(period_start) <= getdate(self.from_date) <= getdate(period_end)
			and getdate(self.to_date) <= getdate(latest_check_out)
		):
			frappe.throw(
				_("The stay must fall within {0}: check in from {1}, and check out by {2}.").format(
					frappe.bold(self.academic_term or self.academic_year),
					formatdate(period_start),
					formatdate(latest_check_out),
				)
			)

	def validate_bed(self):
		hostel_disabled = frappe.db.get_value("Hostel", self.hostel, "disabled")
		room = frappe.db.get_value("Hostel Room", self.hostel_room, ["hostel", "disabled"], as_dict=True)
		bed = frappe.db.get_value(
			"Hostel Bed",
			self.hostel_bed,
			["hostel_room", "disabled", "under_maintenance"],
			as_dict=True,
		)

		if room.hostel != self.hostel:
			frappe.throw(
				_("Hostel Room {0} is not in Hostel {1}.").format(
					frappe.bold(self.hostel_room), frappe.bold(self.hostel)
				)
			)
		if bed.hostel_room != self.hostel_room:
			frappe.throw(
				_("Bed {0} is not in Hostel Room {1}.").format(
					frappe.bold(self.hostel_bed), frappe.bold(self.hostel_room)
				)
			)

		if hostel_disabled:
			frappe.throw(_("Hostel {0} is disabled.").format(frappe.bold(self.hostel)))
		if room.disabled:
			frappe.throw(_("Hostel Room {0} is disabled.").format(frappe.bold(self.hostel_room)))
		if bed.disabled:
			frappe.throw(_("Bed {0} is disabled.").format(frappe.bold(self.hostel_bed)))
		if bed.under_maintenance:
			frappe.throw(_("Bed {0} is under maintenance.").format(frappe.bold(self.hostel_bed)))

	def validate_gender(self):
		hostel_gender = frappe.db.get_value("Hostel", self.hostel, "gender")
		if not hostel_gender:
			return

		student_gender = frappe.db.get_value("Student", self.student, "gender")
		if student_gender != hostel_gender:
			frappe.throw(
				_("Hostel {0} only takes {1} students. Student {2} has gender {3}.").format(
					frappe.bold(self.hostel),
					frappe.bold(_(hostel_gender)),
					frappe.bold(self.student),
					frappe.bold(_(student_gender) if student_gender else _("not set")),
				)
			)

	def validate_previous_stay_checked_out(self):
		"""A bed takes no new stay, for any dates, until its current student is checked out.

		A student who has started a stay must also be checked out before starting another.
		"""
		if self.docstatus != 1:
			return

		holder = frappe.db.get_value(
			"Hostel Allocation",
			{"hostel_bed": self.hostel_bed, "docstatus": 1, "status": "Active", "name": ("!=", self.name)},
			["name", "student"],
			as_dict=True,
			for_update=True,
		)
		if holder:
			frappe.throw(
				_("Bed {0} is held by {1} in {2} until they are checked out.").format(
					frappe.bold(self.hostel_bed),
					frappe.bold(holder.student),
					frappe.get_desk_link("Hostel Allocation", holder.name),
				)
			)

		if getdate(self.from_date) > getdate(nowdate()):
			return

		earlier = frappe.db.get_value(
			"Hostel Allocation",
			{
				"student": self.student,
				"docstatus": 1,
				"status": "Active",
				"from_date": ("<", self.from_date),
				"name": ("!=", self.name),
			},
			"name",
			for_update=True,
		)
		if earlier:
			frappe.throw(
				_("Student {0} is still checked in under {1}. Check them out first.").format(
					frappe.bold(self.student), frappe.get_desk_link("Hostel Allocation", earlier)
				)
			)

	def validate_overlap(self):
		submitting = self.docstatus == 1
		if submitting:
			self.lock_bed_and_student()

		existing = get_overlapping_allocation(self, "hostel_bed", for_update=submitting)
		if existing:
			frappe.throw(
				_("Bed {0} is already allocated to {1} in {2} for these dates.").format(
					frappe.bold(self.hostel_bed),
					frappe.bold(existing.student),
					frappe.get_desk_link("Hostel Allocation", existing.name),
				)
			)

		existing = get_overlapping_allocation(self, "student", for_update=submitting)
		if existing:
			frappe.throw(
				_("Student {0} already has a hostel bed in {1} for these dates.").format(
					frappe.bold(self.student), frappe.get_desk_link("Hostel Allocation", existing.name)
				)
			)

	def lock_bed_and_student(self):
		"""Serialise submissions for the same bed or student until this one commits.

		Locks are taken in the same order everywhere, bed then student, so two submissions
		cannot deadlock. The checks after it use locking reads, which see rows committed by a
		submission that held the lock, where a plain read would still see the older snapshot.
		"""
		frappe.db.get_value("Hostel Bed", self.hostel_bed, "name", for_update=True)
		frappe.db.get_value("Student", self.student, "name", for_update=True)

	def validate_billing(self):
		if flt(self.rent) <= 0:
			return

		if not self.fee_category:
			frappe.throw(_("Fee Category is required to bill hostel rent."))
		if not frappe.db.get_value("Fee Category", self.fee_category, "item"):
			frappe.throw(
				_("Fee Category {0} does not have a linked Item.").format(frappe.bold(self.fee_category))
			)
		if not frappe.db.get_value("Student", self.student, "customer"):
			frappe.throw(_("Student {0} does not have a linked Customer.").format(frappe.bold(self.student)))

	def get_end_date(self):
		"""The exclusive end of the stay for billing: the planned check-out, or an earlier actual one.

		A late check-out does not extend billing into periods after the planned date.
		"""
		if self.vacated_on:
			return min(getdate(self.vacated_on), getdate(self.to_date))
		return getdate(self.to_date)

	def get_billing_periods(self):
		"""The academic periods the stay covers, in order, as dicts of term, start and end.

		With a term picked, that term alone. Otherwise every term of the year, or the year
		itself when it has no terms.
		"""
		filters = (
			{"name": self.academic_term} if self.academic_term else {"academic_year": self.academic_year}
		)
		periods = [
			frappe._dict(
				academic_term=term.name, start=getdate(term.term_start_date), end=getdate(term.term_end_date)
			)
			for term in frappe.get_all(
				"Academic Term",
				filters=filters,
				fields=["name", "term_start_date", "term_end_date"],
				order_by="term_start_date",
			)
		]
		if not periods:
			start, end = frappe.db.get_value(
				"Academic Year", self.academic_year, ["year_start_date", "year_end_date"]
			)
			periods = [frappe._dict(academic_term=None, start=getdate(start), end=getdate(end))]

		from_date, end_date = getdate(self.from_date), self.get_end_date()
		return [period for period in periods if period.start < end_date and period.end >= from_date]

	def bill_due_periods(self, as_of=None):
		"""Invoice, in full, each period of the stay that has started by `as_of` and is not billed yet.

		A period is due on its start date, or on check-in for a student who arrives mid-period.
		"""
		if flt(self.rent) <= 0:
			return

		as_of = getdate(as_of or nowdate())
		billed = {(row.academic_term or None, getdate(row.period_start)) for row in self.invoices}
		for period in self.get_billing_periods():
			due_date = max(period.start, getdate(self.from_date))
			if due_date > as_of or (period.academic_term, period.start) in billed:
				continue

			invoice = self.make_invoice(period, due_date)
			self.add_invoice_row(period, invoice)

	def lock_for_billing(self):
		"""Lock this allocation and reload what billing depends on, as last committed.

		The daily job and check-out both bill. Locking makes the second wait for the first,
		and the locking reads then see the invoices the first one added.
		"""
		self.status, self.vacated_on = frappe.db.get_value(
			"Hostel Allocation", self.name, ["status", "vacated_on"], for_update=True
		)
		row = frappe.qb.DocType("Hostel Allocation Invoice")
		rows = (
			frappe.qb.from_(row)
			.select(
				row.name,
				row.idx,
				row.academic_term,
				row.period_start,
				row.period_end,
				row.amount,
				row.invoice,
			)
			.where(row.parent == self.name)
			.where(row.parenttype == self.doctype)
			.orderby(row.idx)
			.for_update()
		).run(as_dict=True)
		self.set("invoices", rows)

	def make_invoice(self, period, posting_date):
		invoice = frappe.new_doc("Sales Invoice")
		invoice.customer = frappe.db.get_value("Student", self.student, "customer")
		invoice.student = self.student
		invoice.hostel_allocation = self.name
		invoice.company = self.company
		invoice.set_posting_time = 1
		invoice.posting_date = posting_date
		invoice.due_date = posting_date
		invoice.append(
			"items",
			{
				"item_code": frappe.db.get_value("Fee Category", self.fee_category, "item"),
				"qty": 1,
				"rate": flt(self.rent),
				"description": _("Hostel rent for bed {0}, {1}").format(
					self.hostel_bed, period.academic_term or self.academic_year
				),
			},
		)
		apply_campus_to_invoice(invoice, self.campus)
		invoice.insert(ignore_permissions=True)
		invoice.submit()
		return invoice.name

	def add_invoice_row(self, period, invoice):
		row = self.append(
			"invoices",
			{
				"academic_term": period.academic_term,
				"period_start": period.start,
				"period_end": period.end,
				"amount": flt(self.rent),
				"invoice": invoice,
			},
		)
		row.db_insert()

	@frappe.whitelist()
	def check_out(self, vacated_on: str | None = None, remarks: str | None = None):
		"""End the stay and free the bed. Periods that have started stay billed in full."""
		self.check_permission("write")
		self.lock_for_billing()
		if self.docstatus != 1 or self.status != "Active":
			frappe.throw(_("Only an active allocation can be checked out."))

		vacated_on = getdate(vacated_on or nowdate())
		if getdate(self.from_date) > getdate(nowdate()):
			frappe.throw(_("The student has not checked in yet. Cancel the allocation instead."))
		if vacated_on < getdate(self.from_date):
			frappe.throw(
				_("Check-out cannot be before the Check-in Date {0}.").format(formatdate(self.from_date))
			)
		if vacated_on > getdate(nowdate()):
			frappe.throw(_("Check-out Date cannot be in the future."))

		self.db_set({"vacated_on": vacated_on, "check_out_remarks": remarks})
		self.bill_due_periods(as_of=vacated_on)
		self.db_set("status", "Checked Out")
		update_bed_occupancy(self.hostel_bed)

	def cancel_invoices(self):
		for row in self.invoices:
			if not row.invoice:
				continue
			invoice = frappe.get_doc("Sales Invoice", row.invoice)
			if invoice.docstatus == 1:
				# Cancelling the allocation was authorised; its invoices follow, as they were raised.
				invoice.flags.ignore_permissions = True
				invoice.cancel()

	def get_billing_summary(self):
		if self.docstatus != 1 or not frappe.get_meta("Sales Invoice").has_field("hostel_allocation"):
			return {}

		invoice = frappe.qb.DocType("Sales Invoice")
		billed, outstanding = (
			frappe.qb.from_(invoice)
			.select(Sum(invoice.grand_total), Sum(invoice.outstanding_amount))
			.where(invoice.hostel_allocation == self.name)
			.where(invoice.docstatus == 1)
		).run()[0]
		return {
			"billed": flt(billed),
			"outstanding": flt(outstanding),
			"currency": frappe.get_cached_value("Company", self.company, "default_currency"),
		}


@frappe.whitelist()
def get_default_rent(
	hostel: str,
	hostel_room: str | None = None,
	academic_year: str | None = None,
	academic_term: str | None = None,
):
	"""The room's rent, else the hostel's: per term, or per year for a year without terms."""
	frappe.has_permission("Hostel", "read", hostel, throw=True)
	if hostel_room:
		frappe.has_permission("Hostel Room", "read", hostel_room, throw=True)
		if frappe.db.get_value("Hostel Room", hostel_room, "hostel") != hostel:
			frappe.throw(
				_("Hostel Room {0} is not in Hostel {1}.").format(
					frappe.bold(hostel_room), frappe.bold(hostel)
				)
			)

	per_year = not academic_term and not frappe.db.exists("Academic Term", {"academic_year": academic_year})
	fieldname = "annual_rent" if per_year else "rent"
	room_rent = hostel_room and frappe.db.get_value("Hostel Room", hostel_room, fieldname)
	return flt(room_rent) or flt(frappe.db.get_value("Hostel", hostel, fieldname))


def get_overlapping_allocation(doc, fieldname, for_update=False):
	"""Return a submitted allocation of the same bed or student whose stay overlaps doc's."""
	allocation = frappe.qb.DocType("Hostel Allocation")
	query = (
		frappe.qb.from_(allocation)
		.select(allocation.name, allocation.student)
		.where(allocation[fieldname] == doc.get(fieldname))
		.where(allocation.docstatus == 1)
		.where(allocation.name != (doc.name or ""))
		.where(Coalesce(allocation.vacated_on, allocation.to_date, OPEN_END) > doc.from_date)
		.limit(1)
	)
	end = doc.get_end_date()
	if end:
		query = query.where(allocation.from_date < end)
	if for_update:
		query = query.for_update()

	result = query.run(as_dict=True)
	return result[0] if result else None


def get_bed_allocations(beds=None, on=None):
	"""Map each bed to the allocation holding it on the given date.

	That is the stay under way, or else the next one booked. A stay holds its bed until the
	student is checked out, so the earliest Active stay of a bed is the one that holds it.
	"""
	on = getdate(on or nowdate())
	allocation = frappe.qb.DocType("Hostel Allocation")
	query = (
		frappe.qb.from_(allocation)
		.select(
			allocation.name,
			allocation.hostel_bed,
			allocation.student,
			allocation.student_name,
			allocation.from_date,
		)
		.where(allocation.docstatus == 1)
		.where(allocation.status == "Active")
		.orderby(allocation.from_date)
	)
	if beds:
		query = query.where(allocation.hostel_bed.isin(beds))

	holding = {}
	for row in query.run(as_dict=True):
		row.reserved = getdate(row.from_date) > on
		holding.setdefault(row.hostel_bed, row)
	return holding


def update_bed_occupancy(bed):
	refresh_bed_occupancy([bed])


def refresh_bed_occupancy(beds=None):
	holding = get_bed_allocations(beds)
	filters = {"name": ("in", beds)} if beds else {}
	for bed in frappe.get_all(
		"Hostel Bed",
		filters=filters,
		fields=["name", "status", "current_allocation", "disabled", "under_maintenance"],
	):
		allocation = holding.get(bed.name)
		values = {
			"current_allocation": allocation.name if allocation else None,
			"current_student": allocation.student if allocation else None,
			"student_name": allocation.student_name if allocation else None,
		}
		values["status"] = get_bed_status(
			bed.disabled,
			bed.under_maintenance,
			values["current_allocation"],
			reserved=bool(allocation and allocation.reserved),
		)
		if bed.current_allocation != values["current_allocation"] or bed.status != values["status"]:
			frappe.db.set_value("Hostel Bed", bed.name, values)


def process_hostel_allocations():
	"""Daily: raise due hostel invoices and refresh beds. Stays end only when checked out."""
	for name in frappe.get_all(
		"Hostel Allocation", filters={"docstatus": 1, "status": "Active"}, pluck="name"
	):
		allocation = frappe.get_doc("Hostel Allocation", name)
		allocation.lock_for_billing()
		if allocation.status != "Active":
			continue

		frappe.db.savepoint("hostel_billing")
		try:
			allocation.bill_due_periods()
		except Exception as e:
			frappe.db.rollback(save_point="hostel_billing")
			frappe.log_error(
				title=_("Hostel billing failed"),
				reference_doctype="Hostel Allocation",
				reference_name=name,
			)
			# The exception is the cause; queued messages may only be unrelated warnings.
			frappe.clear_messages()
			allocation.db_set("billing_error", strip_html(cstr(e)) or _("Unknown billing error"))
			continue

		if allocation.billing_error:
			allocation.db_set("billing_error", None)

	refresh_bed_occupancy()
