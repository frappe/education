import frappe
from library.utils import create_media_copies


@frappe.whitelist()
def create_copies(media, count=1, force=0):
	try:
		force = int(force or 0)

		result = create_media_copies(media=media, count=int(count or 1), force=bool(force))

		return result

	except Exception as e:
		frappe.log_error(frappe.get_traceback(), "Create Copies API Error")
		frappe.throw(str(e))
