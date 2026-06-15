# Copyright (c) 2026, AVETMISS prototype and contributors
# For license information, please see license.txt
"""The pre-flight validator must report the NCVER sample fixtures CLEAN (they are
known-valid), and must catch an injected error. Proves no false positives.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from golden import read_fixture  # noqa: E402

from avetmiss_export.validator import validate  # noqa: E402

FILES = ["NAT00010", "NAT00020", "NAT00030", "NAT00060", "NAT00080",
		 "NAT00085", "NAT00090", "NAT00100", "NAT00120", "NAT00130"]


def load_all():
	return {f: read_fixture(f.lower() + ".txt").decode("ascii") for f in FILES}


def test_fixtures_clean():
	res = validate(load_all(), collection_year=2019)
	errs = [x for x in res["findings"] if x.ew == "E"]
	assert not errs, "unexpected ERRORS on valid fixtures:\n" + "\n".join(repr(e) for e in errs[:40])
	return res


def test_detects_injected_error():
	files = load_all()
	lines = files["NAT00080"].split("\r\n")
	lines[0] = lines[0][:72] + "Z" + lines[0][73:]  # gender (col 73) -> invalid 'Z'
	files["NAT00080"] = "\r\n".join(lines)
	res = validate(files, 2019)
	hit = [x for x in res["findings"] if x.field == "gender" and x.rec == 0 and x.ew == "E"]
	assert hit, "expected a gender error to be detected"
	return hit


if __name__ == "__main__":
	res = test_fixtures_clean()
	print("PASS fixtures clean: 0 errors, %d warning(s)" % res["warnings"])
	for w in [x for x in res["findings"] if x.ew == "W"][:12]:
		print("   W ", w)
	cov = res["coverage"]
	print("coverage: %d/%d in-scope AVS rules mechanically enforced (%.1f%%)"
		  % (cov["enforced_rules"], cov["in_scope_rules"], cov["enforced_pct"]))
	hit = test_detects_injected_error()
	print("PASS injected error detected -> %r" % hit[0])
