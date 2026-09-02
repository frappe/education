# Copyright (c) 2025, Navari and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from datetime import datetime, timedelta
import json


DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]


class TimetableGenerationResult(Document):
	pass


@frappe.whitelist()
def get_timetable_view(result_name, source=None):
	"""
	Return the weekly schedule grid for a generation result.

	source — "snapshot" reads the base week frozen when this run generated,
	         so the grid shows what this run actually produced.
	         "live" reads Course Schedule as it stands now, which reflects the
	         most recent generation plus any manual edits since.
	         Defaults to the snapshot when the result has one; results created
	         before snapshots existed only have the live view.
	"""
	result = frappe.get_doc("Timetable Generation Result", result_name)

	snapshot = _load_snapshot(result)
	snapshot_available = bool(snapshot and snapshot.get("entries"))

	if source not in ("snapshot", "live"):
		source = "snapshot" if snapshot_available else "live"
	if source == "snapshot" and not snapshot_available:
		source = "live"

	if source == "snapshot":
		data = _view_from_snapshot(snapshot)
	else:
		data = _view_from_live(result)

	data["source"] = source
	data["snapshot_available"] = snapshot_available
	data["generated_on"] = snapshot.get("generated_on") if snapshot_available else None
	return data


def _load_snapshot(result):
	"""Parse the stored snapshot JSON, tolerating results that have none."""
	raw = result.get("timetable_snapshot")
	if not raw:
		return None
	try:
		return json.loads(raw)
	except Exception:
		frappe.log_error(
			title=f"Timetable: unreadable snapshot on {result.name}",
			message=frappe.get_traceback(),
		)
		return None


def _view_from_snapshot(snapshot):
	"""Build the grid from the base week frozen at generation time."""
	entries = snapshot.get("entries") or []
	columns = snapshot.get("columns") or []

	# Older or partial snapshots may carry no column layout — derive it from
	# the entries themselves so the grid still renders.
	if not columns:
		pairs = sorted({(e.get("from"), e.get("to")) for e in entries})
		columns = [{"from": f, "to": t, "type": "lesson"} for f, t in pairs]

	rows = [
		{
			"day": e.get("day"),
			"slot_key": f"{e.get('from')}-{e.get('to')}",
			"entry": {
				"name": None,
				"course": e.get("course"),
				"instructor": e.get("instructor"),
				"student_group": e.get("student_group"),
				"room": e.get("room"),
				"room_name": e.get("room_name") or e.get("room"),
			},
		}
		for e in entries
	]
	return _assemble(columns, rows)


def _view_from_live(result):
	"""Build the grid from the Course Schedule records currently in the database."""
	if not result.academic_term:
		frappe.throw("This result has no Academic Term linked.")

	term = frappe.get_doc("Academic Term", result.academic_term)
	start = _to_date(term.term_start_date)

	# Advance to the first Monday on or after term start
	while start.weekday() != 0:
		start += timedelta(days=1)

	week_dates = [start + timedelta(days=i) for i in range(5)]  # Mon – Fri

	raw = frappe.get_all(
		"Course Schedule",
		filters={
			"schedule_date": [
				"between",
				[
					week_dates[0].strftime("%Y-%m-%d"),
					week_dates[4].strftime("%Y-%m-%d"),
				],
			],
		},
		fields=[
			"name",
			"course",
			"instructor",
			"student_group",
			"room",
			"from_time",
			"to_time",
			"schedule_date",
		],
		order_by="from_time ASC, schedule_date ASC",
	)

	# Map each Room id (autoname like HTL-ROOM-2026-00001) to its display name.
	room_ids = {s.room for s in raw if s.room}
	room_names = {}
	if room_ids:
		for r in frappe.get_all(
			"Room",
			filters={"name": ["in", list(room_ids)]},
			fields=["name", "room_name"],
		):
			room_names[r.name] = r.room_name or r.name

	# Columns come from the generator's configured Time Slots + Breaks so the
	# full school day is shown (with breaks), not just the periods that happen
	# to have a saved schedule. Fall back to the schedules themselves if the
	# generator has no slots configured.
	columns = _build_slot_columns()
	if not columns:
		slot_set = {}
		for s in raw:
			slot_set[(_fmt_time(s.from_time), _fmt_time(s.to_time))] = True
		columns = [{"from": f, "to": t, "type": "lesson"} for f, t in sorted(slot_set.keys())]

	rows = []
	for s in raw:
		date_val = (
			_to_date(s.schedule_date)
			if not isinstance(s.schedule_date, str)
			else datetime.strptime(s.schedule_date, "%Y-%m-%d").date()
		)
		day_idx = date_val.weekday()
		if day_idx >= 5:
			continue
		rows.append(
			{
				"day": DAYS[day_idx],
				"slot_key": f"{_fmt_time(s.from_time)}-{_fmt_time(s.to_time)}",
				"entry": {
					"name": s.name,
					"course": s.course,
					"instructor": s.instructor,
					"student_group": s.student_group,
					"room": s.room,
					"room_name": room_names.get(s.room, s.room),
				},
			}
		)

	return _assemble(columns, rows)


def _assemble(columns, rows):
	"""
	Place rows into the grid and derive the filter dropdown metadata.
	Shared by the snapshot and live paths so both return an identical shape.
	"""
	# Build the grid only for teaching slots: slot_key → day_name → [entry, ...]
	grid = {
		f"{c['from']}-{c['to']}": {day: [] for day in DAYS}
		for c in columns
		if c.get("type") == "lesson"
	}

	for r in rows:
		cell = grid.get(r["slot_key"])
		if cell is None or r["day"] not in cell:
			continue
		cell[r["day"]].append(r["entry"])

	entries = [r["entry"] for r in rows]
	return {
		"time_slots": columns,
		"days": DAYS,
		"grid": grid,
		# Metadata for filter dropdowns — sorted, de-duplicated
		"student_groups": sorted(
			{e["student_group"] for e in entries if e.get("student_group")}
		),
		"instructors": sorted({e["instructor"] for e in entries if e.get("instructor")}),
		"subjects": sorted({e["course"] for e in entries if e.get("course")}),
	}


def _build_slot_columns(doc_name="Timetable Generator"):
	"""
	Ordered column layout for the timetable view: every configured teaching
	Time Slot plus every Break, sorted by start time. Breaks are marked so the
	viewer can render them distinctly.
	"""
	columns = []

	for s in frappe.get_all(
		"Time Slots",
		filters={"parent": doc_name},
		fields=["period", "start_time", "end_time"],
	):
		columns.append(
			{
				"from": _fmt_time(s.start_time),
				"to": _fmt_time(s.end_time),
				"type": "lesson",
				"period": s.period,
			}
		)

	for b in frappe.get_all(
		"Breaks",
		filters={"parent": doc_name},
		fields=["break_name", "start_time", "end_time"],
	):
		columns.append(
			{
				"from": _fmt_time(b.start_time),
				"to": _fmt_time(b.end_time),
				"type": "break",
				"label": b.break_name or "Break",
			}
		)

	columns.sort(key=lambda c: (c["from"], c["to"]))
	return columns


def _fmt_time(val):
	"""Convert a Frappe time value (timedelta, str) to HH:MM display string."""
	if isinstance(val, timedelta):
		total = int(val.total_seconds())
		h, rem = divmod(total, 3600)
		m, _ = divmod(rem, 60)
		return f"{h:02d}:{m:02d}"
	if isinstance(val, str):
		return val[:5]
	return str(val)[:5]


def _to_date(val):
	"""Normalize a date field value to a datetime.date object."""
	if isinstance(val, datetime):
		return val.date()
	return val
