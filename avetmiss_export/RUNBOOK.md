# avetmiss_export — runbook

Companion app that generates AVETMISS 8.0 National VET Provider Collection NAT
files from the Frappe Education data model, with a pre-flight AVS-rules validator.

All commands run in the dev bench container:
```
cd /home/brandon/avetmiss-bench/frappe_docker
DC="docker compose -f .devcontainer/docker-compose.yml exec -T frappe bash -lc"
```

## Run the golden-file + validator + unit tests
```
$DC 'cd /workspace/development/frappe-bench && for f in nat00010 nat00020 nat00030 nat00060 nat00080 nat00085 nat00090 nat00100 nat00120 nat00130 fixed_width validator; do ./env/bin/python apps/avetmiss_export/tests/test_$f.py; done'
```
Each `test_natNNNNN` regenerates the matching NCVER sample and asserts byte-identical
output. `test_validator` asserts the validator reports the NCVER fixtures clean and
catches an injected error.

## Seed the synthetic cohort
```
$DC 'cd /workspace/development/frappe-bench && bench --site mysite.localhost execute avetmiss_export.demo.seed.seed'
```
Creates 6 clients exercising: multiple outcomes (20/30/40/60/85), a completion, a
withdrawal, a disability + prior-education client, an apprentice, a credit transfer.

## Generate the NAT set + pre-flight validate
```
$DC "cd /workspace/development/frappe-bench && echo 'exec(open(\"/home/brandon/education/avetmiss_export/scripts/generate_and_check.py\").read())' | bench --site mysite.localhost console"
```
Writes the 10 NAT files to `avetmiss_export/out/` and prints the validation report
(expected: 0 errors, 0 warnings).

Programmatically: `from avetmiss_export.exporter import generate_all` →
`generate_all(collection_year=2019, output_dir="...")` returns `{file: text}`.

## Submit to AVS (manual — your step)
Upload `avetmiss_export/out/*.txt` to NCVER AVS (https://avs.ncver.edu.au) for the
2019 collection. **Expected:** clean apart from **error 4704** (RTO-identifier
mismatch against the AVS sample account) — the RTO id is the synthetic placeholder
`90052`. To make 4704 disappear, set the real RTO id in **AVETMISS Settings** and
regenerate.

## Architecture
- `natfiles/` — pure fixed-width writers (one per file) + `fixed_width.py`. No Frappe.
- `validator/` — AVS-rules pre-flight (codesets, layouts, engine). No Frappe.
- `exporter.py` — Frappe DB -> record dicts -> writers (the extraction layer).
- `demo/seed.py` — synthetic cohort.
- Custom fields live in `setup/install.py` (created via patch/after_install); the 4
  companion doctypes under `avetmiss_export/doctype/`. Core Education is never edited.
- `COVERAGE_LEDGER.md` — the AVETMISS -> Education field map this app implements.
