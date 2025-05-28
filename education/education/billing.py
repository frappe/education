import frappe
from frappe import _
from frappe.utils import validate_phone_number, cint, nowdate
import razorpay
from erpnext.accounts.doctype.journal_entry.journal_entry import (
	get_payment_entry_against_invoice,
)
from erpnext.accounts.doctype.payment_entry.test_payment_entry import get_payment_entry


def get_details(docname):
	details = frappe.db.get_value(
		"Sales Invoice", docname, ["name", "currency", "outstanding_amount"], as_dict=1
	)
	return details


def get_client():
	settings = frappe.get_single("Education Settings")
	razorpay_key = settings.razorpay_key
	razorpay_secret = settings.get_password("razorpay_secret", raise_exception=True)
	if not razorpay_key and not razorpay_secret:
		frappe.throw(
			_(
				"There is a problem with the payment gateway. Please contact the Administrator to proceed."
			)
		)
	return razorpay.Client(auth=(razorpay_key, razorpay_secret))


def create_order(client, amount, currency):
	try:
		return client.order.create(
			{
				"amount": cint(amount) * 100,
				"currency": currency,
			}
		)
	except Exception as e:
		frappe.throw(
			_(
				"Error during payment: {0} Please contact the Administrator. Amount {1} Currency {2} Formatted {3}"
			).format(e, amount, currency, cint(amount))
		)


@frappe.whitelist()
def get_payment_options(doctype, docname, phone, currency=None):
	if not frappe.db.exists(doctype, docname):
		frappe.throw(_("Invalid document provided."))
	validate_phone_number(phone_number=phone, throw=True)
	details = get_details(docname)
	client = get_client()
	order = create_order(client, details.outstanding_amount, details.currency)
	options = {
		"key_id": frappe.db.get_single_value("Education Settings", "razorpay_key"),
		"name": frappe.db.get_single_value("Website Settings", "app_name"),
		"description": _("Payment for {0} course").format(details["outstanding_amount"]),
		"order_id": order["id"],
		"amount": cint(order["amount"]) * 100,
		"currency": order["currency"],
		"prefill": {
			"name": frappe.db.get_value("User", frappe.session.user, "full_name"),
			"email": frappe.session.user,
			"contact": phone,
		},
	}
	return options


def create_razorpay_payment_record(args, status):
	payment_record = frappe.new_doc("Payment Record")
	payment_record.order_id = args.get("razorpay_order_id", "")
	payment_record.payment_id = args.get("razorpay_payment_id", "")
	payment_record.signature = args.get("razorpay_signature", "")
	payment_record.against_invoice = args.get("name", "")
	payment_record.status = status
	payment_record.amount = args.get("outstanding_amount", "")
	if status == "Captured":
		payment_record.student = args.get("id", "")
		payment_record.mobile = args.get("mobile_number", "")
		payment_record.email = args.get("email", "")
		payment_record.address_line_1 = args.get("address_line_1", "")
		payment_record.currency = args.get("currency", "")
		payment_record.address_line_2 = args.get("address_line_2", "")
		payment_record.city = args.get("city", "")
		payment_record.state = args.get("state", "")
		payment_record.country = args.get("country", "")
		payment_record.pincode = args.get("pincode", "")
	if status == "Failed":
		payment_record.failure_description = args.get("description", "")
	payment_record.save(ignore_permissions=True)
	return payment_record


@frappe.whitelist()
def handle_payment_success(response, against_invoice, billing_details):
	if frappe.db.exists(
		"Payment Record",
		{
			"order_id": response["razorpay_order_id"],
			"payment_id": response["razorpay_payment_id"],
			"status": "Captured",
		},
	):
		return

	client = get_client()
	client.utility.verify_payment_signature(response)
	payment_details = get_details(against_invoice)

	payment_record = create_razorpay_payment_record(
		{**response, **billing_details, **payment_details}, "Captured"
	)

	try:
		frappe.flags.ignore_account_permission = True
		pe = get_payment_entry("Sales Invoice", against_invoice)
		pe.reference_no = response["razorpay_order_id"]
		pe.reference_date = nowdate()
		pe.posting_date = nowdate()
		pe.save(ignore_permissions=True)
		pe.submit()

	except Exception as e:
		frappe.throw(_("Error during payment: {0}").format(e))


@frappe.whitelist()
def handle_payment_failure(response, against_invoice, billing_details):

	response = response["error"]
	razorpay_date = {
		"description": response.get("description"),
		"razorpay_order_id": response["metadata"].get("order_id"),
		"razorpay_payment_id": response["metadata"].get("payment_id"),
	}
	client = get_client()

	payment_details = get_details(against_invoice)

	payment_record = create_razorpay_payment_record(
		{**razorpay_date, **billing_details, **payment_details}, "Failed"
	)
