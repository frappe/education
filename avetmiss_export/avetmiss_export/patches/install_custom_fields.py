# Copyright (c) 2026, AVETMISS prototype and contributors
# For license information, please see license.txt
"""Create/refresh the AVETMISS custom fields on migrate (existing installs)."""

from avetmiss_export.setup.install import ensure_custom_fields


def execute():
	ensure_custom_fields()
