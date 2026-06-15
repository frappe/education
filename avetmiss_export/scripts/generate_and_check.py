from avetmiss_export.exporter import generate_all
from avetmiss_export.validator import validate

OUT = "/home/brandon/education/avetmiss_export/out"
files = generate_all(collection_year=2019, output_dir=OUT)

print("=== generated NAT set (%s) ===" % OUT)
for k, v in files.items():
	print("  %s: %d records, %d bytes" % (k, v.count("\r\n"), len(v)))

res = validate(files, 2019)
errs = [x for x in res["findings"] if x.ew == "E"]
warns = [x for x in res["findings"] if x.ew == "W"]
print("=== PRE-FLIGHT VALIDATION ===")
print("  errors: %d   warnings: %d" % (len(errs), len(warns)))
for e in errs[:50]:
	print("  E", e)
for w in warns[:20]:
	print("  W", w)
cov = res["coverage"]
print("  coverage: %d/%d in-scope AVS rules enforced" % (cov["enforced_rules"], cov["in_scope_rules"]))
print("RESULT:", "CLEAN" if not errs else "%d ERRORS" % len(errs))
