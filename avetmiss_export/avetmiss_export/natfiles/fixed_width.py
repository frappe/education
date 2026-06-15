# Copyright (c) 2026, AVETMISS prototype and contributors
# For license information, please see license.txt
"""Fixed-width field formatting for AVETMISS NAT files.

Field types (collection spec 8.0; see the `nat-field-positions` memory and
COVERAGE_LEDGER.md):
  A  alphanumeric — left-justified, space-filled to length, truncated if longer.
  N  numeric      — right-justified, zero-filled to length.
  D  date         — DDMMYYYY (8 chars).

Global rule: every record is terminated by CRLF (\\r\\n).

These are pure functions — no Frappe import — so the writers and their
golden-file tests run without a bench.
"""

import datetime

CRLF = "\r\n"


def a(value, length):
	"""Type A: left-justified, space-padded; truncated to `length` if longer."""
	s = "" if value is None else str(value)
	return s[:length].ljust(length)


def n(value, length):
	"""Type N: integer, right-justified, zero-filled when a value is present.

	Blank/None -> spaces. AVETMISS treats an absent numeric as not-provided
	(space-filled); a present value (including 0) is zero-filled. Confirmed
	against fixtures: NAT00030 nominal hours '0400' (valued) vs NAT00060
	nominal hours '    ' (blank).
	"""
	if value is None or value == "":
		return " " * length
	s = str(int(value))
	if len(s) > length:
		raise ValueError("numeric value %r exceeds %d digits" % (value, length))
	return s.rjust(length, "0")


def d(value, length=8):
	"""Type D: date as DDMMYYYY. Accepts date/datetime/'YYYY-MM-DD'/'DDMMYYYY'.

	Blank/None -> spaces (an absent optional date). Mandatory-date enforcement is
	the validator's job, not the formatter's.
	"""
	if value is None or value == "":
		return " " * length
	if isinstance(value, (datetime.date, datetime.datetime)):
		return value.strftime("%d%m%Y")
	s = str(value)
	if len(s) == 10 and s[4] == "-" and s[7] == "-":  # ISO yyyy-mm-dd
		return "%s%s%s" % (s[8:10], s[5:7], s[0:4])
	if len(s) == 8 and s.isdigit():  # already DDMMYYYY
		return s
	raise ValueError("unparseable date %r" % (value,))


def blank(length):
	"""`length` spaces — for const-blank / not-collected-nationally fields."""
	return " " * length


def pack(parts, expected_len):
	"""Concatenate `parts`, assert the total width, return the line (no CRLF)."""
	line = "".join(parts)
	if len(line) != expected_len:
		raise ValueError("record length %d != expected %d" % (len(line), expected_len))
	return line


def file_bytes(lines):
	"""Join record lines, CRLF-terminating each (so the file ends with CRLF)."""
	return "".join(line + CRLF for line in lines)
