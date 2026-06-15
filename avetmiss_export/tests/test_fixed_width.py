# Copyright (c) 2026, AVETMISS prototype and contributors
# For license information, please see license.txt
"""Unit tests for the fixed-width formatters — exercises the paths the golden
round-trip tests cannot (date objects, numeric zero-vs-blank, truncation,
width assertion). Closes the coverage gap the auditors flagged.
"""

import datetime
import sys

from avetmiss_export.natfiles.fixed_width import a, blank, d, n, pack


def test_a():
	assert a("AB", 5) == "AB   "          # left-justify, space-pad
	assert a("ABCDEF", 3) == "ABC"        # truncate on overflow
	assert a(None, 3) == "   "            # None -> spaces
	assert a(90855, 10) == "90855     "   # non-str coerced


def test_n():
	assert n(400, 4) == "0400"            # valued -> zero-fill
	assert n(0, 4) == "0000"              # zero is a value
	assert n("", 4) == "    "             # blank -> spaces
	assert n(None, 4) == "    "
	assert n("60", 4) == "0060"           # numeric string
	try:
		n(12345, 4)
		raise AssertionError("expected overflow ValueError")
	except ValueError:
		pass


def test_d():
	assert d(datetime.date(2019, 3, 31)) == "31032019"   # date object
	assert d(datetime.datetime(2019, 3, 31, 9, 0)) == "31032019"
	assert d("2019-03-31") == "31032019"                 # ISO string
	assert d("31032019") == "31032019"                   # already DDMMYYYY
	assert d("") == "        "                            # blank -> spaces
	assert d(None) == "        "


def test_blank():
	assert blank(5) == "     "


def test_pack():
	assert pack([a("x", 2), n(5, 2)], 4) == "x 05"
	try:
		pack([a("x", 2)], 3)
		raise AssertionError("expected width ValueError")
	except ValueError:
		pass


if __name__ == "__main__":
	tests = [test_a, test_n, test_d, test_blank, test_pack]
	for fn in tests:
		fn()
		print("PASS %s" % fn.__name__)
	print("ALL %d fixed_width unit tests pass" % len(tests))
