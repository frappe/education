# CLAUDE.md

Operating rules for Claude Code in this repo. This file auto-loads every session.
The imports below pull project context into context; the reference docs in
`/reference` are authoritative over your own knowledge.

@.claude/memory/project-overview.md
@.claude/memory/architecture.md
@.claude/memory/references.md
@.claude/memory/definition-of-done.md

## What we're building (the short version)

A prototype that generates AVETMISS 8.0 NAT files from the Frappe Education data
model and validates them error-free in NCVER's AVS against the 2019 Jan–Mar
sample period. Done = AVS clean, bar error 4704 (expected RTO-ID mismatch on the
sample account). National files only. Not SA state. Not VDS. This proves schema
and export against clean sample data; it does not produce correct numbers for
real enrolments, and you never claim production readiness.

## Hard rules

1. **Cite the spec, never your memory.** Every field position, length, type, and
   code value comes from `/reference` (collection spec 8.0, data element
   definitions 2.3, AVS Rules CSV). If a rule isn't in those docs, STOP and flag
   it. Do not implement a field from training knowledge. A plausible-looking code
   value that you can't point to in the definitions doc is a defect, not a guess
   to keep.

2. **No stubs.** No `TODO`, `pass`, `NotImplementedError`, placeholder constants,
   or hardcoded sentinels standing in for real logic. If you can't implement it
   from the spec, stop and say so.

3. **Golden-file TDD.** Write the failing test first, byte-diffing generated
   output against the matching NCVER sample file in `/tests/fixtures`. Fixed-width
   means one character off is a failure. Make the real file match the fixture.

4. **One NAT file at a time.** Build, validate, and get the file green against its
   fixture before starting the next. Do not generate several files and declare
   done. Build order: NAT00010 → 00020 → 00030 → 00060 → 00080/00085/00090/00100
   → 00120 → 00130. NAT00120 is the controlling file; it drives what appears in
   the others, so it comes after its dependencies are solid.

5. **Show, don't tell.** Don't report that something passes. Run the test and the
   validator and paste the actual output. "It validates" means nothing until the
   byte-diff and the AVS-rules check are green on screen.

6. **Run the auditor after generator changes.** Invoke the `avetmiss-auditor`
   subagent on any NAT-file generator change before considering it done. Treat its
   FAIL as blocking.

## Architecture rule

Extend via custom fields and a companion app. Do not edit core Education DocTypes
or controllers. We stay mergeable with upstream `frappe/education`. If a