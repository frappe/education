# avetmiss_export

Companion Frappe app that generates **AVETMISS 8.0** National VET Provider
Collection NAT files from the Frappe **Education** data model, and validates
them against the NCVER AVS rule set before submission.

It extends Education purely through **custom fields** and its **own doctypes** —
it never edits core Education doctypes or controllers, so Education stays
mergeable with upstream.

See [COVERAGE_LEDGER.md](COVERAGE_LEDGER.md) for the field-by-field AVETMISS →
Education mapping this app implements.

Status: prototype. Proves schema + export against the NCVER sample collection;
not a production reporting tool.
