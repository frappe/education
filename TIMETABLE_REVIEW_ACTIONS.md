# Timetable PR: Review Findings and Remediation Plan

Status: **all seven items fixed**, across three commits on `feat/timetable-generation`:

| Commit | Covers |
|---|---|
| `ea333fe` fix(timetable): enforce permissions on whitelisted timetable endpoints | Findings 2, 4, and the generator half of 5 |
| `9b51e7d` fix(timetable): scope school timetable endpoints to the caller | Findings 3, 7, and the page half of 5 |
| `9be58cc` fix(timetable): make timetable replacement atomic | Findings 1 and 6 |

Not pushed. Verified by logic tests only; still needs a run against a real site.

Original triage follows. This records what the automated review flagged, what I independently verified in the code, what it missed, and the order I propose fixing things in.

Review verdict was 0/5, blocking. Having checked each claim against the source, **all three findings are real**, and the authorization problem is wider than the two endpoints the bot named.

## Summary

| # | Issue | Bot found it | Verified | Severity |
|---|---|---|---|---|
| 1 | Timetable replacement is not atomic; a mid-run failure destroys the timetable | yes | yes | Critical (data loss) |
| 2 | `get_timetable_view` returns System-Manager-only data to any logged-in user | yes | yes | High |
| 3 | `get_course_schedule` returns school-wide schedules with no caller scope | yes | yes | High |
| 4 | `generate_timetable` lets any logged-in user wipe and rebuild the timetable | **no** | yes | **Critical** |
| 5 | 11 further whitelisted endpoints have no permission checks at all | partly | yes | Medium/High |
| 6 | A failed `DELETE` is swallowed, so generation duplicates instead of replacing | no | yes | High |
| 7 | `frappe.db.commit()` called inside request handlers | no | yes | Medium |

The root cause behind 2, 3, 4 and 5 is a single omission: **the feature has 15 whitelisted endpoints and not one permission check between them.**

```
grep -rn "has_permission\|check_permission\|frappe.only_for" <the three files>
  -> no matches
```

## Finding 1: Replacement is not atomic (critical, data loss)

**Where:** `timetable_generator.py:1622` (`process_timetable_generation`), `timetable_generator.py:1188` (the commit inside `clear_existing_schedules`).

The run does three things in order:

```python
config = load_configuration(stream_filter=stream_filter)
clear_existing_schedules(...)      # DELETEs, then COMMITs at line 1188
schedule_data = generate_initial_schedule(config)   # can throw
save_and_report_results(config, schedule_data)      # commits only what saved
```

The delete is committed **before** anything is generated. If `generate_initial_schedule` throws (it calls `frappe.throw` on several config problems), the term's schedules are already permanently gone and nothing replaces them. If generation succeeds but some inserts fail validation, `save_schedule` still commits the survivors, leaving a partially rebuilt timetable.

**Fix.** Reorder so nothing is destroyed until the replacement exists, and make the swap a single transaction:

1. Generate the full schedule in memory first (it already is; `generate_initial_schedule` builds a list).
2. Then, in one transaction: delete the old rows, insert the new ones.
3. `frappe.db.rollback()` on any exception, and commit exactly once at the end.
4. Remove the `frappe.db.commit()` from `clear_existing_schedules` and from `save_schedule`; let the orchestrator own the transaction.

Reordering is safe: `_pre_populate_from_db` already excludes the streams being regenerated, so generating before deleting produces the same plan.

Decide explicitly what "some rows failed to insert" should mean. Right now it silently half-applies. Options: roll the whole run back and report Failed, or accept partials but record them loudly. My recommendation is roll back, because a half-written timetable is worse than an unchanged one.

## Finding 2: `get_timetable_view` bypasses permissions (high)

**Where:** `timetable_generation_result.py:18`, loading the doc at line 29.

```python
@frappe.whitelist()
def get_timetable_view(result_name, source=None):
    result = frappe.get_doc("Timetable Generation Result", result_name)
```

Two Frappe behaviours combine here:

- `frappe.get_doc()` does **not** check read permission. Only the REST layer does.
- `frappe.get_all()` does **not** apply permissions either; it is `get_list(ignore_permissions=True)`. The live path uses it at line 108.

Timetable Generation Result grants read to **System Manager only**, but a whitelisted method is callable by any authenticated user. Names are sequential (`TGR-26-0001`), so they are trivially enumerable. A Student or Guardian can walk the series and read every generated timetable: courses, instructors, student groups, rooms.

`get_unscheduled_diagnosis` (`timetable_generator.py:1638`) has the identical pattern and leaks the same data plus teacher workload figures.

**Fix.** In both, after loading the document:

```python
result.check_permission("read")
```

That raises `PermissionError` for anyone without read access on the doctype and respects user permissions.

## Finding 3: `get_course_schedule` has no caller scope (high)

**Where:** `page/school_timetable/timetable.py:5`

```python
if start_date and end_date:
    filters["schedule_date"] = ["between", [start_date, end_date]]
return frappe.get_all("Course Schedule", filters=filters, ..., limit=2000)
```

Two problems:

1. The date filter is applied **only if both dates are present**. Omit either and there is no date constraint at all, returning up to 2000 rows spanning the whole history.
2. `frappe.get_all` bypasses permissions, and there is no restriction to the caller's own student groups.

This matters specifically because **version-15.2 granted `Course Schedule` read access to Student and Guardian** (I confirmed this in the doctype's permissions). So the exposed audience is real, not hypothetical.

**Fix.**

- Require both dates; `frappe.throw` if either is missing, and bound the range (a term, say) so the endpoint cannot be used to dump history.
- Switch `frappe.get_all` to `frappe.get_list` so doctype permissions and user permissions apply.
- Add explicit scoping: if the caller is a Student or Guardian, restrict `student_group` to the groups they belong to. Do not rely on the role check alone.

## Finding 4: anyone can trigger a destructive regeneration (critical, missed by the review)

**Where:** `timetable_generator.py:1807`

```python
@frappe.whitelist()
def generate_timetable(student_groups=None):
    ...
    frappe.enqueue(".. .process_timetable_generation", queue="long", ...)
```

No permission check. Any authenticated user, including a Student or Guardian, can call this and enqueue a job that **deletes and rewrites the entire term's Course Schedule**. Combined with Finding 1, a caller who triggers it against a broken config destroys the timetable outright.

I consider this the most serious item in the set, and the automated review did not report it.

**Fix.** Gate on write permission for the configuration doctype before enqueuing:

```python
frappe.has_permission("Timetable Generator", "write", throw=True)
```

Apply the same to `debug_timetable_generation` (`:1845`), which discloses config internals, and `get_class_prefill` (`:1726`), which reads Course and Subject Stream Assignment data.

## Finding 5: the remaining endpoints (medium)

Every endpoint in `page/school_timetable/timetable.py` is whitelisted with no permission check:

| Line | Endpoint | Exposure |
|---|---|---|
| 39 | `get_course_schedule_details` | returns a full Course Schedule doc via `get_doc`, unchecked |
| 47 | `get_teachers` | full instructor list |
| 58 | `get_streams` | full student group list |
| 69 | `get_academic_terms` | all terms with dates |
| 88 | `get_rooms` | all rooms |
| 95 | `get_courses` | all courses |

These are master-data listings rather than personal data, so severity is lower, but they should still go through `frappe.get_list` so permissions apply.

The three write endpoints (`create_course_schedule:104`, `update_course_schedule:142`, `update_course_schedule_details:165`) are **not** an authorization hole: they call `doc.insert()` and `doc.save()`, which enforce create/write permission themselves. They do have two lesser problems, covered in Finding 7.

## Finding 6: a failed delete is swallowed (high, missed by the review)

**Where:** `timetable_generator.py`, inside `clear_existing_schedules`

```python
try:
    frappe.db.sql("DELETE FROM `tabCourse Schedule` WHERE ...")
    deleted = frappe.db.sql("SELECT ROW_COUNT()")[0][0]
except Exception as col_err:
    frappe.log_error(...)     # swallowed
frappe.db.commit()
...
return True
```

If the DELETE fails the exception is logged and discarded, the function still returns `True`, and generation proceeds to insert a second full set of rows on top of the existing ones. The result is a silently duplicated timetable, which is exactly the failure mode `company` was added to prevent.

**Fix.** Let the exception propagate so the run aborts and rolls back. Never return `True` on a failed delete.

## Finding 7: `frappe.db.commit()` in request handlers (medium)

`timetable.py` lines 134, 157 and 195 call `frappe.db.commit()` inside whitelisted handlers. Frappe commits automatically at the end of a successful request; committing manually defeats the automatic rollback on error and can leave a half-applied write. Remove them and let the framework manage the transaction.

Also, the write endpoints catch every exception and return the string `"error"`, which converts a `PermissionError` into an indistinguishable generic failure. Let framework exceptions propagate so the client sees the real reason.

## Proposed order of work

1. **Finding 4** — one-line permission gate on `generate_timetable`. Highest risk, smallest change.
2. **Findings 2 and 5** — `check_permission` on the result endpoints; `get_all` to `get_list` on the read endpoints.
3. **Finding 3** — require both dates, bound the range, scope Students and Guardians to their own groups.
4. **Findings 1 and 6** — the transaction rework. Largest change and needs real testing; do it last so the quick wins are not blocked behind it.
5. **Finding 7** — remove the manual commits and the exception swallowing.

Items 1 to 3 and 5 are small and low-risk. Item 4 changes the generation flow and must be tested against a real site, including a deliberately failing run to prove the old timetable survives.

## Test plan for the fixes

- As a Student or Guardian user, confirm `get_timetable_view`, `get_unscheduled_diagnosis` and `generate_timetable` all raise `PermissionError`.
- As a Student, confirm `get_course_schedule` returns only their own groups' rows, and that omitting a date is rejected rather than returning everything.
- Generate a timetable, then force a failure mid-run (for example, an invalid config that makes `generate_initial_schedule` throw) and confirm the previous timetable is **still intact**.
- Force an insert failure and confirm the run rolls back rather than half-applying.
- Simulate a failing DELETE and confirm the run aborts instead of duplicating rows.
- Re-run the existing snapshot round-trip and source-toggle checks to confirm no regression.

## Out of scope

Nothing here changes the scheduling algorithm or the snapshot feature. Findings 1 and 6 change *when* writes happen, not what gets scheduled.
