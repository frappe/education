import frappe
import re
import qrcode
import barcode
from barcode.writer import ImageWriter
import io
import base64


def create_media_copies(media_name, count=1, force=False):

	if count <= 0:
		return

	existing = frappe.db.count("Media Copy", {"media": media_name})

	if existing > 0 and not force:
		return

	for i in range(count):
		frappe.get_doc(
			{
				"doctype": "Media Copy",
				"media": media_name,
				"status": "Available",
				"edition_number": existing + i + 1,
			}
		).insert(ignore_permissions=True)


def validate_isbn10(isbn):
	if not re.match(r"^\d{9}[\dX]$", isbn):
		return False

	total = 0
	for i, char in enumerate(isbn[:9]):
		total += (i + 1) * int(char)

	check = total % 11
	last = isbn[-1]

	return (last == "X" and check == 10) or (last.isdigit() and check == int(last))


def validate_isbn13(isbn):
	if not isbn.isdigit():
		return False

	total = 0
	for i, digit in enumerate(isbn[:12]):
		if i % 2 == 0:
			total += int(digit)
		else:
			total += int(digit) * 3

	check = (10 - (total % 10)) % 10
	return check == int(isbn[-1])


def update_copy_counts(media):
	total = frappe.db.count("Media Copy", {"media": media})

	available = frappe.db.count("Media Copy", {"media": media, "status": "Available"})

	frappe.db.set_value(
		"Library Media", media, {"total_copies": total, "available_copies": available}
	)


def generate_qr_base64(data: str):
	qr = qrcode.QRCode(version=1, box_size=10, border=4)
	qr.add_data(data)
	qr.make(fit=True)

	img = qr.make_image(fill="black", back_color="white")

	buffer = io.BytesIO()
	img.save(buffer, format="PNG")
	buffer.seek(0)

	return base64.b64encode(buffer.read()).decode()


def generate_barcode_base64(data: str):
	CODE128 = barcode.get_barcode_class("code128")
	writer = ImageWriter()
	writer.set_options(
		{
			"module_width": 0.2,
			"module_height": 12.0,
			"quiet_zone": 1.0,
			"font_size": 7,
			"text_distance": 1.5,
			"dpi": 300,
		}
	)
	code = CODE128(data, writer=writer)

	buffer = io.BytesIO()
	code.write(buffer)
	buffer.seek(0)

	return base64.b64encode(buffer.read()).decode()


def save_file(doc, base64_data, filename):
	file_doc = frappe.get_doc(
		{
			"doctype": "File",
			"file_name": filename,
			"is_private": 0,
			"content": base64_data,
			"decode": True,
			"attached_to_doctype": doc.doctype,
			"attached_to_name": doc.name,
		}
	)
	file_doc.insert(ignore_permissions=True)
	return file_doc.file_url
