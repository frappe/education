# Copyright (c) 2025, Navari and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from datetime import datetime, timedelta


class TimetableGenerationResult(Document):
    pass


@frappe.whitelist()
def get_timetable_view(result_name):
    """
    Return the full weekly schedule grid for the academic term linked to result_name.
    """
    result = frappe.get_doc("Timetable Generation Result", result_name)
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
        columns = [
            {"from": f, "to": t, "type": "lesson"}
            for f, t in sorted(slot_set.keys())
        ]

    # Build the grid only for teaching slots: slot_key → day_name → [entry, ...]
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    grid = {
        f"{c['from']}-{c['to']}": {day: [] for day in days}
        for c in columns
        if c["type"] == "lesson"
    }

    for s in raw:
        date_val = (
            _to_date(s.schedule_date)
            if not isinstance(s.schedule_date, str)
            else datetime.strptime(s.schedule_date, "%Y-%m-%d").date()
        )
        day_idx = date_val.weekday()
        if day_idx >= 5:
            continue
        day_name = days[day_idx]
        slot_key = f"{_fmt_time(s.from_time)}-{_fmt_time(s.to_time)}"
        if slot_key in grid:
            grid[slot_key][day_name].append(
                {
                    "name": s.name,
                    "course": s.course,
                    "instructor": s.instructor,
                    "student_group": s.student_group,
                    "room": s.room,
                    "room_name": room_names.get(s.room, s.room),
                }
            )

    return {
        "time_slots": columns,
        "days": days,
        "grid": grid,
        # Metadata for filter dropdowns — sorted, de-duplicated
        "student_groups": sorted({s.student_group for s in raw if s.student_group}),
        "instructors": sorted({s.instructor for s in raw if s.instructor}),
        "subjects": sorted({s.course for s in raw if s.course}),
    }


def _build_slot_columns():
    """
    Ordered column layout for the timetable view: every configured teaching
    Time Slot plus every Break, sorted by start time. Breaks are marked so the
    viewer can render them distinctly.
    """
    doc_name = "Timetable Generator"
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
