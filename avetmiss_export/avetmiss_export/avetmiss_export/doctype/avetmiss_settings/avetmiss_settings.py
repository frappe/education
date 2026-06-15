# Copyright (c) 2026, AVETMISS prototype and contributors
# For license information, please see license.txt

from frappe.model.document import Document


class AVETMISSSettings(Document):
	"""RTO-level AVETMISS configuration (singleton): identifier + name."""
