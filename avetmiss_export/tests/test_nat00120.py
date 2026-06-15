# Copyright (c) 2026, AVETMISS prototype and contributors
# For license information, please see license.txt
"""Golden-file test: NAT00120 (training activity — the controller)."""

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from golden import roundtrip  # noqa: E402

from avetmiss_export.natfiles import nat00120  # noqa: E402


def parse(ln):
	return {
		"rto_identifier": ln[0:10].rstrip(),
		"delivery_location": ln[10:20].rstrip(),
		"client_identifier": ln[20:30].rstrip(),
		"subject_identifier": ln[30:42].rstrip(),
		"program_identifier": ln[42:52].rstrip(),
		"activity_start_date": ln[52:60].rstrip(),
		"activity_end_date": ln[60:68].rstrip(),
		"delivery_mode": ln[68:71].rstrip(),
		"outcome_national": ln[71:73].rstrip(),
		"funding_source_national": ln[73:75].rstrip(),
		"commencing_program": ln[75:76].rstrip(),
		"training_contract_id": ln[76:86].rstrip(),
		"apprentice_client_id": ln[86:96].rstrip(),
		"study_reason": ln[96:98].rstrip(),
		"vet_in_schools": ln[98:99].rstrip(),
		"specific_funding_id": ln[99:109].rstrip(),
		"school_type": ln[109:111].rstrip(),
	}


def test_nat00120_byte_identical():
	return roundtrip("nat00120.txt", nat00120.generate, parse)


if __name__ == "__main__":
	try:
		nr, nb = test_nat00120_byte_identical()
		print("PASS nat00120 (%d records, %d bytes)" % (nr, nb))
	except AssertionError as e:
		print("FAIL nat00120\n%s" % e)
		sys.exit(1)
