import frappe
from frappe import _, scrub
from frappe.utils import comma_or, flt


def get_valid_reference_doctypes(self, method):
	valid_reference_doctypes = ()

	if self.party_type == "Student":
		valid_reference_doctypes = ("Fees", "Journal Entry")

	if not valid_reference_doctypes:
		return

	for d in self.get("references"):
		if not d.allocated_amount:
			continue

		if d.reference_doctype not in valid_reference_doctypes:
			frappe.throw(
				_("Reference Doctype must be one of {0}").format(
					comma_or([_(d) for d in valid_reference_doctypes])
				)
			)

		elif d.reference_name:
			if not frappe.db.exists(d.reference_doctype, d.reference_name):
				frappe.throw(
					_("{0} {1} does not exist").format(d.reference_doctype, d.reference_name)
				)

			ref_doc = frappe.get_doc(d.reference_doctype, d.reference_name)

			if d.reference_doctype != "Journal Entry":
				if self.party != ref_doc.get(scrub(self.party_type)):
					frappe.throw(
						_("{0} {1} is not associated with {2} {3}").format(
							_(d.reference_doctype), d.reference_name, _(self.party_type), self.party
						)
					)
			else:
				self.validate_journal_entry()

			if d.reference_doctype in ("Fees"):
				if self.party_type == "Student":
					ref_party_account = ref_doc.receivable_account

				if ref_party_account != self.party_account:
					frappe.throw(
						_("{0} {1} is associated with {2}, but Party Account is {3}").format(
							_(d.reference_doctype), d.reference_name, ref_party_account, self.party_account
						)
					)

			if ref_doc.docstatus != 1:
				frappe.throw(
					_("{0} {1} must be submitted").format(_(d.reference_doctype), d.reference_name)
				)


def set_outstanding_amount(self, method):
	if self.party_type == "Student":
		for d in self.get("references"):
			if not d.allocated_amount:
				continue

			ref_details = get_reference_details(
				d.reference_doctype,
				d.reference_name,
			)

			for field, value in ref_details.items():
				if d.exchange_gain_loss:
					# for cases where gain/loss is booked into invoice
					# exchange_gain_loss is calculated from invoice & populated
					# and row.exchange_rate is already set to payment entry's exchange rate
					# refer -> `update_reference_in_payment_entry()` in utils.py
					continue

				d.db_set(field, value)


def get_reference_details(reference_doctype, reference_name):
	total_amount = outstanding_amount = exchange_rate = bill_no = None
	ref_doc = frappe.get_doc(reference_doctype, reference_name)

	if reference_doctype == "Fees":
		total_amount = ref_doc.get("grand_total")
		exchange_rate = 1
		outstanding_amount = ref_doc.get("outstanding_amount")

	return frappe._dict(
		{
			"due_date": ref_doc.get("due_date"),
			"total_amount": flt(total_amount),
			"outstanding_amount": flt(outstanding_amount),
			"exchange_rate": flt(exchange_rate),
			"bill_no": bill_no,
		}
	)
