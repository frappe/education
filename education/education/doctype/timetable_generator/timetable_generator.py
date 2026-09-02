from frappe.model.document import Document
import frappe

from datetime import datetime, timedelta, time
import json
import random


class TimetableGenerator(Document):
    def validate(self):
        self._check_duplicate_subjects()
        self._check_teacher_subjects_in_rules()
        self._check_room_subjects_in_rules()
        self._check_streams_belong_to_academic_term()
        self._check_time_slots_and_breaks()

    def _check_duplicate_subjects(self):
        """Each subject may appear only once in the Subject Rules tab."""
        seen = set()
        for row in self.subject_rules:
            if not row.subject:
                continue
            if row.subject in seen:
                frappe.throw(
                    f"Row {row.idx} in Subject Rules: "
                    f"<b>{row.subject}</b> is already listed. "
                    "Each subject can appear only once."
                )
            seen.add(row.subject)

    def _check_teacher_subjects_in_rules(self):
        """Every subject in the Teachers tab must exist in the Subject Rules tab."""
        allowed = {r.subject for r in self.subject_rules if r.subject}
        for row in self.teachers_preference:
            if row.subject and row.subject not in allowed:
                frappe.throw(
                    f"Row {row.idx} in Teachers tab: "
                    f"Subject <b>{row.subject}</b> is not in the Subject Rules tab. "
                    "Add it there first."
                )

    def _check_room_subjects_in_rules(self):
        """Subjects and streams in Teaching Rooms must be configured first."""
        allowed_subjects = {r.subject for r in self.subject_rules if r.subject}
        allowed_streams = {r.stream for r in self.teachers_preference if r.stream}

        for row in self.teaching_rooms:
            if row.subject and row.subject not in allowed_subjects:
                frappe.throw(
                    f"Row {row.idx} in Teaching Rooms: "
                    f"Subject <b>{row.subject}</b> is not in the Subject Rules tab. "
                    "Add it there first."
                )
            if row.stream and row.stream not in allowed_streams:
                frappe.throw(
                    f"Row {row.idx} in Teaching Rooms: "
                    f"Stream <b>{row.stream}</b> has no teacher preference configured. "
                    "Add at least one teacher for this stream first."
                )

    def _check_streams_belong_to_academic_term(self):
        """
        Every stream in the Teachers and Teaching Rooms tabs must be a Student Group
        that belongs to the Academic Term selected on this document.
        """
        if not self.academic_term:
            return

        valid_streams = {
            sg["name"]
            for sg in frappe.get_all(
                "Student Group",
                filters={"academic_term": self.academic_term},
                fields=["name"],
            )
        }

        for row in self.teachers_preference:
            if row.stream and row.stream not in valid_streams:
                frappe.throw(
                    f"Row {row.idx} in Teachers tab: "
                    f"Stream <b>{row.stream}</b> is not linked to Academic Term "
                    f"<b>{self.academic_term}</b>. "
                    "Select a Student Group that belongs to the selected term."
                )

        for row in self.teaching_rooms:
            if row.stream and row.stream not in valid_streams:
                frappe.throw(
                    f"Row {row.idx} in Teaching Rooms: "
                    f"Stream <b>{row.stream}</b> is not linked to Academic Term "
                    f"<b>{self.academic_term}</b>. "
                    "Select a Student Group that belongs to the selected term."
                )

    def _check_time_slots_and_breaks(self):
        """
        Validate the Slot & Breaks configuration:
          1. First time slot must start exactly at Lesson Starts.
          2. Last time slot must end exactly at Lesson Ends.
          3. No time slot may overlap with any configured break.
        """
        if not self.time_slots:
            return

        def to_secs(val):
            """Normalize a Frappe Time value (timedelta, time, or str) to seconds."""
            if val is None:
                return None
            if isinstance(val, timedelta):
                return int(val.total_seconds())
            if isinstance(val, time):
                return val.hour * 3600 + val.minute * 60 + val.second
            if isinstance(val, str):
                try:
                    parts = val.split(":")
                    return (
                        int(parts[0]) * 3600
                        + int(parts[1]) * 60
                        + (int(parts[2]) if len(parts) > 2 else 0)
                    )
                except Exception:
                    return None
            return None

        def hhmm(val):
            """Format a Time value as HH:MM for error messages."""
            secs = to_secs(val)
            if secs is None:
                return "?"
            h, rem = divmod(secs, 3600)
            m, _ = divmod(rem, 60)
            return f"{h:02d}:{m:02d}"

        slots = sorted(self.time_slots, key=lambda r: r.period or 0)

        if self.lesson_starts and slots[0].start_time is not None:
            if to_secs(slots[0].start_time) != to_secs(self.lesson_starts):
                frappe.throw(
                    f"Period {slots[0].period} starts at <b>{hhmm(slots[0].start_time)}</b> "
                    f"but <b>Lesson Starts</b> is set to <b>{hhmm(self.lesson_starts)}</b>. "
                    "The first time slot must start exactly when lessons start."
                )

        if self.lesson_ends and slots[-1].end_time is not None:
            if to_secs(slots[-1].end_time) != to_secs(self.lesson_ends):
                frappe.throw(
                    f"Period {slots[-1].period} ends at <b>{hhmm(slots[-1].end_time)}</b> "
                    f"but <b>Lesson Ends</b> is set to <b>{hhmm(self.lesson_ends)}</b>. "
                    "The last time slot must end exactly when lessons end."
                )

        if not self.breaks:
            return

        for brk in self.breaks:
            br_start = to_secs(brk.start_time)
            br_end = to_secs(brk.end_time)
            if br_start is None or br_end is None:
                continue

            for slot in slots:
                sl_start = to_secs(slot.start_time)
                sl_end = to_secs(slot.end_time)
                if sl_start is None or sl_end is None:
                    continue

                # two intervals [a,b) and [c,d) overlap if and only if a < d and b > c.
                if sl_start < br_end and sl_end > br_start:
                    frappe.throw(
                        f"Period {slot.period} "
                        f"(<b>{hhmm(slot.start_time)} – {hhmm(slot.end_time)}</b>) "
                        f"overlaps with break <b>{brk.break_name or 'unnamed'}</b> "
                        f"(<b>{hhmm(brk.start_time)} – {hhmm(brk.end_time)}</b>). "
                        "Time slots must not overlap with any break."
                    )


def _td_to_dt(val):
    """Normalize a Frappe time value (timedelta, time, or HH:MM:SS string) to a
    comparable datetime anchored on 2000-01-01."""
    if val is None:
        return None
    if isinstance(val, timedelta):
        total = int(val.total_seconds())
        h, rem = divmod(total, 3600)
        m, s = divmod(rem, 60)
        return datetime(2000, 1, 1, h, m, s)
    if isinstance(val, time):
        return datetime(2000, 1, 1, val.hour, val.minute, val.second)
    if isinstance(val, str):
        try:
            t = datetime.strptime(val, "%H:%M:%S")
            return datetime(2000, 1, 1, t.hour, t.minute, t.second)
        except ValueError:
            return None
    return None


def _fmt_time(val):
    """Format a Frappe time value to HH:MM:SS string."""
    if isinstance(val, timedelta):
        total = int(val.total_seconds())
        h, rem = divmod(total, 3600)
        m, s = divmod(rem, 60)
        return f"{h:02d}:{m:02d}:{s:02d}"
    if isinstance(val, time):
        return val.strftime("%H:%M:%S")
    if isinstance(val, str):
        return val
    return ""


def _day_name(day):
    """Return the English weekday name for a date object."""
    return ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"][day.weekday()]


def _overlaps_break(slot_start, slot_end, break_intervals):
    """Return True if a slot overlaps any break interval (both as datetime)."""
    for br_start, br_end in break_intervals:
        if slot_start < br_end and slot_end > br_start:
            return True
    return False


def spread_across_days(count, num_days=5):
    """
    Return `count` day indices spread as evenly as possible across `num_days`.
    Guarantees subjects are distributed through the week, not front-loaded.

    Examples (num_days=5):
      count=5 → [0,1,2,3,4]   one per day
      count=3 → [0,2,4]        Mon, Wed, Fri
      count=2 → [1,3]          Tue, Thu
      count=1 → [2]            Wed (midweek)
    """
    if count <= 0:
        return []
    if count >= num_days:
        return list(range(num_days))
    step = num_days / count
    return sorted(
        set(min(int(i * step + step / 2), num_days - 1) for i in range(count))
    )


def get_student_group_term_bounds(streams):
    """
    Return {student_group: (start_date, end_date)} for each stream.
    """
    bounds = {}
    for sg in streams:
        academic_term_name = frappe.db.get_value("Student Group", sg, "academic_term")
        if not academic_term_name:
            bounds[sg] = None
            continue
        try:
            term = frappe.get_doc("Academic Term", academic_term_name)
            start = term.term_start_date
            end = term.term_end_date
            if isinstance(start, datetime):
                start = start.date()
            if isinstance(end, datetime):
                end = end.date()
            bounds[sg] = (start, end)
        except Exception:
            frappe.log_error(
                title=f"Timetable: Could not read Academic Term for Student Group {sg}",
                message=frappe.get_traceback(),
            )
            bounds[sg] = None
    return bounds


def get_term_weeks(start_date, end_date):
    """Return a list of weeks; each week is a list of school days (Mon-Fri) within the term."""
    if isinstance(start_date, datetime):
        start_date = start_date.date()
    if isinstance(end_date, datetime):
        end_date = end_date.date()

    # Advance to the first Monday >= start_date
    current = start_date
    while current.weekday() != 0:
        current += timedelta(days=1)

    weeks = []
    while current <= end_date:
        week = [
            current + timedelta(days=i)
            for i in range(5)
            if current + timedelta(days=i) <= end_date
        ]
        if week:
            weeks.append(week)
        current += timedelta(weeks=1)

    return weeks


def load_configuration(stream_filter=None):
    """
    Load all settings from the Timetable Generator single document.

    stream_filter — optional list of Student Group names.  When provided, only
                    those streams are included in teacher_preferences, subject_rules,
                    and classrooms.  Pass None (or an empty list) to use all
                    configured streams — the original behaviour.
    """
    try:
        timetable_doc = frappe.get_doc("Timetable Generator")
        academic_term = frappe.get_doc("Academic Term", timetable_doc.academic_term)

        term_start = academic_term.term_start_date
        term_end = academic_term.term_end_date

        if not term_start or not term_end or term_start >= term_end:
            frappe.throw("Invalid Academic Term dates.")

        active_filter = set(stream_filter) if stream_filter else None

        teacher_preferences = [
            {
                "teacher": row.teacher,
                "subject": row.subject,
                "stream": row.stream,
                "max_period_per_day": row.max_period_per_day or 0,
                "max_period_per_week": row.max_period_per_week or 0,
                "preferred_days": row.preferred_days or "",
            }
            for row in timetable_doc.teachers_preference
            if not active_filter or row.stream in active_filter
        ]

        # only retain subjects that at least one in-scope teacher is assigned to.
        all_subject_rules = [
            {
                "subject": row.subject,
                "frequency_per_week": row.frequency_per_week or 1,
                "allow_double": bool(row.allow_double),
                "double_lessons_per_week": row.double_lessons_per_week or 0,
                "max_time": row.max_time,
            }
            for row in timetable_doc.subject_rules
        ]
        taught_subjects = {t["subject"] for t in teacher_preferences}
        subject_rules = [
            s for s in all_subject_rules if s["subject"] in taught_subjects
        ]

        classrooms = [
            {"subject": row.subject, "stream": row.stream, "room": row.room}
            for row in timetable_doc.teaching_rooms
            if not active_filter or row.stream in active_filter
        ]

        # Derive unique streams from the (now-filtered) teacher preference rows
        all_streams = sorted({t["stream"] for t in teacher_preferences if t["stream"]})

        if not teacher_preferences:
            scope_hint = f" (filter: {sorted(active_filter)})" if active_filter else ""
            frappe.throw(
                f"No teacher preferences found{scope_hint}. Check the Teachers tab."
            )
        if not subject_rules:
            frappe.throw(
                "No subject rules found for the selected streams. Check the Subject tab."
            )
        if not classrooms:
            frappe.throw(
                "No teaching rooms found for the selected streams. Check the Teaching Rooms tab."
            )
        if not all_streams:
            frappe.throw("No student groups resolved from teacher preferences.")

        max_per_day = timetable_doc.default_maximum_lessons_per_day or 7
        max_per_week = timetable_doc.default_maximum_lessons_per_week or 35

        sg_term_bounds = get_student_group_term_bounds(all_streams)

        return {
            "term_start_date": term_start,
            "term_end_date": term_end,
            "teacher_preferences": teacher_preferences,
            "subject_rules": subject_rules,
            "classrooms": classrooms,
            "academic_term": timetable_doc.academic_term,
            "all_streams": all_streams,
            "timetable_doc": timetable_doc,
            "school": timetable_doc.company,
            "max_per_day": max_per_day,
            "max_per_week": max_per_week,
            "sg_term_bounds": sg_term_bounds,
        }
    except Exception as e:
        frappe.log_error(
            f"Failed to load configuration: {str(e)}", "Timetable Generator"
        )
        raise


def get_period_slots(timetable_doc):
    """Return teachable period slots, excluding any that overlap with defined breaks."""
    time_slots = frappe.get_all(
        "Time Slots",
        filters={"parent": timetable_doc.name},
        fields=["period", "start_time", "end_time"],
        order_by="period ASC",
    )
    if not time_slots:
        frappe.throw(
            "No time slots defined. Please add time slots in the Slot & Breaks tab."
        )

    break_intervals = []
    for b in frappe.get_all(
        "Breaks",
        filters={"parent": timetable_doc.name},
        fields=["start_time", "end_time"],
    ):
        br_start = _td_to_dt(b.start_time)
        br_end = _td_to_dt(b.end_time)
        if br_start and br_end:
            break_intervals.append((br_start, br_end))

    slots = []
    for slot in time_slots:
        slot_start = _td_to_dt(slot.start_time)
        slot_end = _td_to_dt(slot.end_time)
        if _overlaps_break(slot_start, slot_end, break_intervals):
            continue
        slots.append(
            {
                "period": slot.period,
                "from_time": _fmt_time(slot.start_time),
                "to_time": _fmt_time(slot.end_time),
            }
        )

    if not slots:
        frappe.throw(
            "All time slots overlap with breaks. Please review the Slot & Breaks configuration."
        )

    return slots


def prepare_scheduling_data(teacher_preferences, subject_rules, all_streams):
    """
    Build the flat list of (subject, stream, teachers) instances to schedule per week.

    Randomness is introduced in three ways so that each generation run produces
    a valid but distinct timetable:
      1. Teachers for each subject/stream are shuffled — different teachers are
         tried first when multiple are available.
      2. Target days are rotated by a random offset — a 3×/week subject that
         normally aims for Mon/Wed/Fri might aim for Tue/Thu/Mon next run.
      3. Items within the same frequency bucket are shuffled — subjects of equal
         priority compete for slots in a different order each time.
    """
    scheduling_data = []

    day_rotation = random.randint(0, 4)

    for stream in all_streams:
        for subject in subject_rules:
            subject_name = subject["subject"]
            frequency = subject.get("frequency_per_week", 1)

            capable = [
                t
                for t in teacher_preferences
                if t["subject"] == subject_name and t["stream"] == stream
            ]
            if not capable:
                continue

            # Shuffle teacher order so different teachers get first pick each run
            capable = capable.copy()
            random.shuffle(capable)

            # Rotate the spread so target days shift between runs
            base_days = spread_across_days(frequency)
            target_days = [(d + day_rotation) % 5 for d in base_days]

            for i in range(frequency):
                scheduling_data.append(
                    {
                        "subject": subject_name,
                        "stream": stream,
                        "teachers": capable,
                        "priority": frequency,
                        "allow_double": subject.get("allow_double", False),
                        "instance": i + 1,
                        "target_day": target_days[i] if i < len(target_days) else i % 5,
                    }
                )

    # Sort by priority descending so high-frequency subjects are processed first.
    # Within each priority bucket, shuffle randomly.
    scheduling_data.sort(key=lambda x: -x["priority"])

    # Stable in-place shuffle within each priority group
    start = 0
    while start < len(scheduling_data):
        end = start
        pri = scheduling_data[start]["priority"]
        while end < len(scheduling_data) and scheduling_data[end]["priority"] == pri:
            end += 1
        bucket = scheduling_data[start:end]
        random.shuffle(bucket)
        scheduling_data[start:end] = bucket
        start = end

    return scheduling_data


def setup_room_mapping(classrooms):
    """Build room lookups: (subject, stream) -> rooms, subject -> rooms, all rooms."""
    by_subject_stream = {}
    by_subject = {}
    all_rooms_set = set()

    for c in classrooms:
        subject = c["subject"]
        stream = c.get("stream", "")
        room = c["room"]
        all_rooms_set.add(room)
        if subject and stream:
            by_subject_stream.setdefault((subject, stream), []).append(room)
        if subject:
            by_subject.setdefault(subject, []).append(room)

    return by_subject_stream, by_subject, list(all_rooms_set)


def initialize_teacher_workload(teacher_prefs, school_days):
    """Create a workload tracking dict for the given school days."""
    workload = {}
    for t in teacher_prefs:
        teacher = t["teacher"]
        if teacher not in workload:
            workload[teacher] = {
                "total": 0,
                "daily": {d.strftime("%Y-%m-%d"): 0 for d in school_days},
            }
    return workload


def get_available_room(
    subject,
    stream,
    day_str,
    period_index,
    slot_lookup,
    by_subject_stream,
    by_subject,
    all_rooms,
    relax=False,
):
    """Find an available room, most-specific first. Returns None if nothing is free."""
    for room in by_subject_stream.get((subject, stream), []):
        if (day_str, period_index, "room", room) not in slot_lookup:
            return room
    for room in by_subject.get(subject, []):
        if (day_str, period_index, "room", room) not in slot_lookup:
            return room
    if relax:
        for room in all_rooms:
            if (day_str, period_index, "room", room) not in slot_lookup:
                return room
    return None


def _daily(workload, teacher, day_str):
    return workload.get(teacher, {}).get("daily", {}).get(day_str, 0)


def _total(workload, teacher):
    return workload.get(teacher, {}).get("total", 0)


def add_schedule_entry(
    school,
    day_str,
    period_index,
    period,
    teacher,
    stream,
    subject,
    room,
    slot_lookup,
    subject_stream_daily,
    teacher_workload,
    temp_schedule,
    scheduled_items,
):
    """Append one schedule entry and mark all resources occupied for this slot."""
    temp_schedule.append(
        {
            "doctype": "Course Schedule",
            "company": school,
            "instructor": teacher,
            "student_group": stream,
            "course": subject,
            "from_time": period["from_time"],
            "to_time": period["to_time"],
            "schedule_date": day_str,
            "room": room,
        }
    )
    scheduled_items.append({"subject": subject, "stream": stream, "teacher": teacher})

    slot_lookup[(day_str, period_index, "stream", stream)] = True
    slot_lookup[(day_str, period_index, "teacher", teacher)] = True
    slot_lookup[(day_str, period_index, "room", room)] = True

    subject_stream_daily[(day_str, subject, stream)] = (
        subject_stream_daily.get((day_str, subject, stream), 0) + 1
    )
    teacher_workload[teacher]["total"] += 1
    teacher_workload[teacher]["daily"][day_str] = (
        teacher_workload[teacher]["daily"].get(day_str, 0) + 1
    )


def _stream_load_on_day(day_str, stream, subject_stream_daily):
    """Total distinct subject-slots already scheduled for `stream` on `day_str`."""
    return sum(
        v
        for (d, _, sg), v in subject_stream_daily.items()
        if d == day_str and sg == stream
    )


def _sorted_days_for_item(item, school_days, subject_stream_daily):
    """
    Return day indices ordered so that:
      1. Days where this subject is already scheduled today come last (avoid repeats).
      2. Among remaining days, lighter stream load comes first (even distribution).
      3. Ties broken by distance from the item's pre-assigned target_day.
    """
    subject, stream = item["subject"], item["stream"]
    target = item.get("target_day", 0)

    def day_key(idx):
        day = school_days[idx]
        day_str = day.strftime("%Y-%m-%d")
        has_subject = subject_stream_daily.get((day_str, subject, stream), 0) > 0
        load = _stream_load_on_day(day_str, stream, subject_stream_daily)
        dist = abs(idx - target)
        return (has_subject, load, dist)

    return sorted(range(len(school_days)), key=day_key)


def balanced_pass(
    school,
    remaining_items,
    school_days,
    period_slots,
    by_subject_stream,
    by_subject,
    all_rooms,
    teacher_workload,
    slot_lookup,
    subject_stream_daily,
    temp_schedule,
    scheduled_items,
    max_daily,
    max_weekly,
    relax_room=False,
    relax_preferred_days=False,
):
    """
    Item-first pass: for each item, find the day+period that best distributes
    the load.  Teacher workload limits are always enforced.

    relax_room            — if True, any free room is acceptable (not just
                            the subject/stream-specific one)
    relax_preferred_days  — if True, teacher preferred_days constraint is skipped
    """
    for item in list(remaining_items):
        subject, stream = item["subject"], item["stream"]
        sorted_day_indices = _sorted_days_for_item(
            item, school_days, subject_stream_daily
        )

        scheduled = False
        for day_idx in sorted_day_indices:
            day = school_days[day_idx]
            day_str = day.strftime("%Y-%m-%d")

            if subject_stream_daily.get((day_str, subject, stream), 0) >= 1:
                continue  # already have this subject on this day for this stream

            for period_index, period in enumerate(period_slots):
                if (day_str, period_index, "stream", stream) in slot_lookup:
                    continue

                for td in item["teachers"]:
                    if td["subject"] != subject or td["stream"] != stream:
                        continue

                    teacher = td["teacher"]
                    if (day_str, period_index, "teacher", teacher) in slot_lookup:
                        continue
                    if _daily(teacher_workload, teacher, day_str) >= max_daily:
                        continue
                    if _total(teacher_workload, teacher) >= max_weekly:
                        continue

                    if not relax_preferred_days:
                        preferred = td.get("preferred_days", "")
                        if preferred and _day_name(day) not in preferred:
                            continue

                    room = get_available_room(
                        subject,
                        stream,
                        day_str,
                        period_index,
                        slot_lookup,
                        by_subject_stream,
                        by_subject,
                        all_rooms,
                        relax=relax_room,
                    )
                    if room is None:
                        continue

                    add_schedule_entry(
                        school,
                        day_str,
                        period_index,
                        period,
                        teacher,
                        stream,
                        subject,
                        room,
                        slot_lookup,
                        subject_stream_daily,
                        teacher_workload,
                        temp_schedule,
                        scheduled_items,
                    )
                    remaining_items.remove(item)
                    scheduled = True
                    break

                if scheduled:
                    break
            if scheduled:
                break


def fallback_pass(
    school,
    remaining_items,
    school_days,
    period_slots,
    by_subject_stream,
    by_subject,
    all_rooms,
    teacher_workload,
    slot_lookup,
    subject_stream_daily,
    temp_schedule,
    scheduled_items,
    max_daily,
):
    """
    Last-resort pass: weekly workload cap removed, preferred days ignored,
    any room used, and a room is force-assigned if the pool is fully occupied.
    Still respects the daily cap to avoid unreasonable single-day overloads.
    """
    for item in list(remaining_items):
        subject, stream = item["subject"], item["stream"]
        sorted_day_indices = _sorted_days_for_item(
            item, school_days, subject_stream_daily
        )

        scheduled = False
        for day_idx in sorted_day_indices:
            day = school_days[day_idx]
            day_str = day.strftime("%Y-%m-%d")

            if subject_stream_daily.get((day_str, subject, stream), 0) >= 1:
                continue

            for period_index, period in enumerate(period_slots):
                if (day_str, period_index, "stream", stream) in slot_lookup:
                    continue

                for td in item["teachers"]:
                    teacher = td["teacher"]
                    if (day_str, period_index, "teacher", teacher) in slot_lookup:
                        continue
                    if _daily(teacher_workload, teacher, day_str) >= max_daily:
                        continue

                    room = get_available_room(
                        subject,
                        stream,
                        day_str,
                        period_index,
                        slot_lookup,
                        by_subject_stream,
                        by_subject,
                        all_rooms,
                        relax=True,
                    )
                    if room is None and all_rooms:
                        room = all_rooms[0]  # force-assign last resort
                    if room is None:
                        continue

                    add_schedule_entry(
                        school,
                        day_str,
                        period_index,
                        period,
                        teacher,
                        stream,
                        subject,
                        room,
                        slot_lookup,
                        subject_stream_daily,
                        teacher_workload,
                        temp_schedule,
                        scheduled_items,
                    )
                    remaining_items.remove(item)
                    scheduled = True
                    break

                if scheduled:
                    break
            if scheduled:
                break


def _pre_populate_from_db(
    school_days, period_slots, slot_lookup, teacher_workload, excluded_streams=None
):
    """
    Load existing Course Schedule records for the base week from the database
    and mark their teachers and rooms as occupied in slot_lookup.

    This prevents the generation algorithm from assigning the same room or
    teacher to a new stream when another stream's schedule is already saved in
    the DB (from a previous scoped run).

    excluded_streams — the streams we are about to (re-)generate; their records
                       were just cleared so we deliberately skip them here.
    """
    if not school_days:
        return

    start = school_days[0]
    end = school_days[-1]
    if isinstance(start, datetime):
        start = start.date()
    if isinstance(end, datetime):
        end = end.date()

    filters = {
        "schedule_date": [
            "between",
            [
                start.strftime("%Y-%m-%d"),
                end.strftime("%Y-%m-%d"),
            ],
        ],
    }
    if excluded_streams:
        filters["student_group"] = ["not in", excluded_streams]

    try:
        existing = frappe.get_all(
            "Course Schedule",
            filters=filters,
            fields=["instructor", "room", "from_time", "to_time", "schedule_date"],
        )
    except Exception:
        frappe.log_error(
            title="Timetable: could not pre-load existing schedules into slot_lookup",
            message=frappe.get_traceback(),
        )
        return

    # Build a (from_time, to_time) → period_index lookup once
    time_to_idx = {
        (slot["from_time"], slot["to_time"]): idx
        for idx, slot in enumerate(period_slots)
    }

    loaded = 0
    for rec in existing:
        from_t = _fmt_time(rec.from_time)
        to_t = _fmt_time(rec.to_time)
        period_idx = time_to_idx.get((from_t, to_t))
        if period_idx is None:
            continue  # time slot not in our current config — skip

        day_str = (
            rec.schedule_date
            if isinstance(rec.schedule_date, str)
            else rec.schedule_date.strftime("%Y-%m-%d")
        )

        # Mark teacher and room as occupied for this slot.
        # We do NOT mark student_group — parallel classes in different rooms are fine.
        if rec.instructor:
            slot_lookup[(day_str, period_idx, "teacher", rec.instructor)] = True
        if rec.room:
            slot_lookup[(day_str, period_idx, "room", rec.room)] = True

        # Keep teacher workload counters accurate
        if rec.instructor and rec.instructor in teacher_workload:
            teacher_workload[rec.instructor]["total"] += 1
            teacher_workload[rec.instructor]["daily"][day_str] = (
                teacher_workload[rec.instructor]["daily"].get(day_str, 0) + 1
            )
        loaded += 1

    if loaded:
        frappe.log(
            f"Timetable: pre-loaded {loaded} Course Schedule slot(s) from DB "
            f"(excluding {excluded_streams}) to avoid cross-stream conflicts."
        )

    # Also block periods where a teacher is already a supervisor on an Assessment Plan.
    try:
        assessment_plans = frappe.get_all(
            "Assessment Plan",
            filters={
                "schedule_date": [
                    "between",
                    [
                        start.strftime("%Y-%m-%d"),
                        end.strftime("%Y-%m-%d"),
                    ],
                ],
            },
            fields=["supervisor", "from_time", "to_time", "schedule_date"],
        )

        ap_blocked = 0
        for ap in assessment_plans:
            if not ap.supervisor:
                continue

            ap_start = _td_to_dt(ap.from_time)
            ap_end = _td_to_dt(ap.to_time)
            if not ap_start or not ap_end:
                continue

            ap_day = (
                ap.schedule_date
                if isinstance(ap.schedule_date, str)
                else ap.schedule_date.strftime("%Y-%m-%d")
            )

            # Block every period slot that overlaps with the assessment's time range.
            # This covers assessments that span multiple period slots or are offset
            # from the period boundaries.
            for period_idx, slot in enumerate(period_slots):
                slot_start = _td_to_dt(slot["from_time"])
                slot_end = _td_to_dt(slot["to_time"])
                if (
                    slot_start
                    and slot_end
                    and slot_start < ap_end
                    and slot_end > ap_start
                ):
                    slot_lookup[(ap_day, period_idx, "teacher", ap.supervisor)] = True
                    ap_blocked += 1

        if ap_blocked:
            frappe.log(
                f"Timetable: blocked {ap_blocked} slot(s) for Assessment Plan "
                "supervisors to prevent OverlapError on save."
            )

    except Exception:
        frappe.log_error(
            title="Timetable: could not pre-load Assessment Plans",
            message=frappe.get_traceback(),
        )


def create_full_schedule(
    scheduling_data,
    teacher_prefs,
    classrooms,
    school_days,
    period_slots,
    school,
    max_daily,
    max_weekly,
    excluded_streams=None,
):
    temp_schedule = []
    scheduled_items = []
    remaining_items = scheduling_data.copy()

    by_subject_stream, by_subject, all_rooms = setup_room_mapping(classrooms)
    teacher_workload = initialize_teacher_workload(teacher_prefs, school_days)
    slot_lookup = {}
    subject_stream_daily = {}

    # Seed slot_lookup with already-saved schedules from other streams so the
    # algorithm never double-books a teacher or room that is already in the DB.
    _pre_populate_from_db(
        school_days,
        period_slots,
        slot_lookup,
        teacher_workload,
        excluded_streams=excluded_streams,
    )

    shared = dict(
        school=school,
        period_slots=period_slots,
        by_subject_stream=by_subject_stream,
        by_subject=by_subject,
        all_rooms=all_rooms,
        teacher_workload=teacher_workload,
        slot_lookup=slot_lookup,
        subject_stream_daily=subject_stream_daily,
        temp_schedule=temp_schedule,
        scheduled_items=scheduled_items,
    )

    # Pass 1 — strict: subject-specific rooms, preferred days respected
    balanced_pass(
        remaining_items=remaining_items,
        school_days=school_days,
        max_daily=max_daily,
        max_weekly=max_weekly,
        relax_room=False,
        relax_preferred_days=False,
        **shared,
    )

    # Pass 2 — relaxed: any free room, preferred days ignored
    if remaining_items:
        balanced_pass(
            remaining_items=remaining_items,
            school_days=school_days,
            max_daily=max_daily,
            max_weekly=max_weekly,
            relax_room=True,
            relax_preferred_days=True,
            **shared,
        )

    # Pass 3 — fallback: no weekly cap, force-assign room if needed
    if remaining_items:
        fallback_pass(
            remaining_items=remaining_items,
            school_days=school_days,
            max_daily=max_daily,
            **shared,
        )

    return temp_schedule, scheduled_items, remaining_items


def _is_overlap_error(err_msg):
    """
    Return True if the exception came from Frappe Education's validate_overlap()
    """
    low = err_msg.lower()
    return "conflicts with" in low and any(
        kw in low for kw in ("supervisor", "instructor", "overlap")
    )


def save_schedule(schedule, batch_size=50):
    """
    Insert Course Schedule records in batches.

    Returns (successful, failed, overlap_skipped, error_summary):
      successful      — entries saved without error
      failed          — hard save errors (DB constraint, missing field, etc.)
      overlap_skipped — entries skipped because the instructor already has an
                        Assessment Plan / external commitment at that slot
      error_summary   — dict of hard-error message → count
    """
    successful = 0
    failed = 0
    overlap_skipped = 0
    error_summary = {}

    for i in range(0, len(schedule), batch_size):
        for entry in schedule[i : i + batch_size]:
            try:
                frappe.get_doc(entry).insert(ignore_permissions=True)
                successful += 1
            except Exception as e:
                err_msg = str(e)

                if _is_overlap_error(err_msg):
                    # Instructor is a supervisor on an Assessment Plan or has
                    # another external commitment, log clearly but do NOT
                    # count as a hard failure.
                    overlap_skipped += 1
                    frappe.log_error(
                        title="Timetable: entry skipped — Assessment Plan / supervisor conflict",
                        message=(
                            f"Course:        {entry.get('course', 'N/A')}\n"
                            f"Student Group: {entry.get('student_group', 'N/A')}\n"
                            f"Instructor:    {entry.get('instructor', 'N/A')}\n"
                            f"Date:          {entry.get('schedule_date', 'N/A')}\n"
                            f"Time:          {entry.get('from_time', 'N/A')} → {entry.get('to_time', 'N/A')}\n"
                            f"Room:          {entry.get('room', 'N/A')}\n"
                            f"\nConflict: {err_msg}\n\n"
                            "The instructor has an existing Assessment Plan or other commitment "
                            "at this time.\n"
                            "The pre-generation check may have missed it if the assessment "
                            "time does not align exactly with a configured period slot.\n"
                            "Consider running the timetable generation AFTER the assessment "
                            "schedule is finalized, or adjust the assessment dates."
                        ),
                    )
                else:
                    # Hard failure — a genuine save error
                    failed += 1
                    error_summary[err_msg] = error_summary.get(err_msg, 0) + 1
                    frappe.log_error(
                        title="Timetable: Course Schedule save failed",
                        message=(
                            f"Course:        {entry.get('course', 'N/A')}\n"
                            f"Student Group: {entry.get('student_group', 'N/A')}\n"
                            f"Instructor:    {entry.get('instructor', 'N/A')}\n"
                            f"Date:          {entry.get('schedule_date', 'N/A')}\n"
                            f"Time:          {entry.get('from_time', 'N/A')} → {entry.get('to_time', 'N/A')}\n"
                            f"Room:          {entry.get('room', 'N/A')}\n"
                            f"Company:       {entry.get('company', 'N/A')}\n"
                            f"\nError: {err_msg}\n"
                            f"\nTraceback:\n{frappe.get_traceback()}"
                        ),
                    )

    # Consolidated summary for hard failures
    if error_summary:
        summary_lines = [
            f"Total attempted: {len(schedule)}",
            f"Successful:      {successful}",
            f"Failed (hard):   {failed}",
            f"Overlap skipped: {overlap_skipped}",
            "",
            "Hard-error breakdown (most frequent first):",
        ]
        for msg, count in sorted(error_summary.items(), key=lambda x: -x[1]):
            summary_lines.append(f"  [{count:>4}x]  {msg}")
        frappe.log_error(
            title=f"Timetable Generation: {failed} hard failure(s) + {overlap_skipped} overlap skip(s)",
            message="\n".join(summary_lines),
        )

    if overlap_skipped:
        frappe.log(
            f"Timetable: {overlap_skipped} entry/entries skipped due to "
            "Assessment Plan / supervisor overlap — see Error Log for details."
        )

    frappe.db.commit()
    return successful, failed, overlap_skipped, error_summary


def clear_existing_schedules(academic_term, school, streams=None):
    """
    Delete Course Schedule records for the given term.
    """
    try:
        term = frappe.get_doc("Academic Term", academic_term)
        start = term.term_start_date
        end = term.term_end_date

        scope_label = f"{len(streams)} stream(s)" if streams else "all streams"

        if streams:
            placeholders = ", ".join(["%s"] * len(streams))
            base_where = (
                f"schedule_date BETWEEN %s AND %s AND student_group IN ({placeholders})"
            )
            base_params = [start, end] + list(streams)
        else:
            base_where = "schedule_date BETWEEN %s AND %s"
            base_params = [start, end]

        deleted = 0
        try:
            frappe.db.sql(
                f"DELETE FROM `tabCourse Schedule` WHERE {base_where} AND company = %s",
                base_params + [school],
            )
            deleted = frappe.db.sql("SELECT ROW_COUNT()")[0][0]
        except Exception as col_err:
            frappe.log_error(
                title="Timetable: clear existing schedules failed",
                message=(
                    f"School: {school}\nTerm: {academic_term}\n"
                    f"Error: {str(col_err)}\n\n{frappe.get_traceback()}"
                ),
            )

        frappe.db.commit()
        frappe.log(
            f"Timetable: cleared {deleted} Course Schedule records "
            f"for term {academic_term} ({start} – {end}), scope: {scope_label}"
        )
        return True

    except Exception as e:
        frappe.log_error(
            title="Timetable: Failed to clear existing schedules",
            message=(
                f"Academic Term: {academic_term}\nSchool: {school}\n"
                f"Streams: {streams}\nError: {str(e)}\n\n{frappe.get_traceback()}"
            ),
        )
        return False


def diagnose_unscheduled(unscheduled_items, config, scheduled_items):
    """
    For each (subject, stream) group that could not be scheduled, identify
    the most likely reason and produce actionable hints.

    Checks (in order):
      1. Teacher assignment   — is any teacher linked to this subject+stream?
      2. Teacher workload     — did the teacher(s) exceed their weekly/daily cap?
      3. Room configuration   — is any room mapped to this subject?
      4. Resource contention  — fallback when config looks correct but slots ran out.
    """
    teacher_prefs = config["teacher_preferences"]
    classrooms = config["classrooms"]
    subject_rules = {s["subject"]: s for s in config["subject_rules"]}
    global_max_week = config["max_per_week"]
    global_max_day = config["max_per_day"]

    # Count base-week periods each teacher was actually scheduled
    teacher_load = {}
    subject_stream_got = {}
    for item in scheduled_items:
        t = item.get("teacher")
        if t:
            teacher_load[t] = teacher_load.get(t, 0) + 1
        key = (item.get("subject"), item.get("stream"))
        subject_stream_got[key] = subject_stream_got.get(key, 0) + 1

    # Group unscheduled by (subject, stream) and count missed instances
    groups = {}
    for item in unscheduled_items:
        key = (item["subject"], item["stream"])
        groups[key] = groups.get(key, 0) + 1

    diagnosed = []
    for (subject, stream), missed in groups.items():
        reasons = []
        hints = []

        # ---- 1. Teacher assignment ----------------------------------------
        capable = [
            t
            for t in teacher_prefs
            if t["subject"] == subject and t["stream"] == stream
        ]
        if not capable:
            reasons.append(
                f"No teacher is assigned to '{subject}' for stream '{stream}'."
            )
            hints.append(
                "Open the Teachers tab and add a row: "
                f"Teacher → Subject='{subject}' → Stream='{stream}'."
            )
        else:
            # ---- 2. Workload limits ----------------------------------------
            for td in capable:
                teacher = td["teacher"]
                actual = teacher_load.get(teacher, 0)
                lim_week = td.get("max_period_per_week") or global_max_week
                lim_day = td.get("max_period_per_day") or global_max_day

                if actual >= lim_week:
                    reasons.append(
                        f"Teacher '{teacher}' hit their weekly limit: "
                        f"{actual} periods scheduled (limit: {lim_week}). "
                        "They have no remaining capacity for this subject."
                    )
                    hints.append(
                        f"Increase max_period_per_week for '{teacher}' "
                        f"(currently {lim_week}) or assign a second teacher to this subject."
                    )
                elif actual >= lim_day * 5:
                    reasons.append(
                        f"Teacher '{teacher}' is likely hitting their daily limit "
                        f"({lim_day} periods/day) on most days, "
                        f"leaving no room for this subject ({actual} total this week)."
                    )
                    hints.append(
                        f"Increase max_period_per_day for '{teacher}' "
                        f"or reduce the frequency of other subjects they teach."
                    )

        # ---- 3. Room configuration ----------------------------------------
        stream_rooms = [
            c["room"]
            for c in classrooms
            if c["subject"] == subject and c.get("stream") == stream
        ]
        subject_rooms = [c["room"] for c in classrooms if c["subject"] == subject]
        if not subject_rooms:
            reasons.append(f"No room is configured for subject '{subject}'.")
            hints.append(
                "Open the Teaching Rooms tab and add a row: "
                f"Subject='{subject}' → Stream='{stream}' → Room."
            )
        elif not stream_rooms:
            hints.append(
                f"No stream-specific room found for '{subject}'/'{stream}'. "
                f"Algorithm used generic rooms: {subject_rooms[:4]}. "
                "If those were all occupied by other classes, no slot was available."
            )

        # ---- 4. General contention (when config looks fine) ----------------
        if not reasons:
            reasons.append(
                "All 3 scheduling passes failed. The algorithm could not find a "
                "conflict-free slot: teacher, room, and stream were simultaneously "
                "occupied in every remaining period."
            )
            hints.append(
                "Possible fixes: add more time-slot periods, increase teacher workload "
                "limits, add a second room for this subject, "
                "or reduce the frequency of competing subjects."
            )

        rule = subject_rules.get(subject, {})
        freq = rule.get("frequency_per_week", 1)
        got = subject_stream_got.get((subject, stream), 0)

        diagnosed.append(
            {
                "subject": subject,
                "stream": stream,
                "frequency_per_week": freq,
                "scheduled_this_week": got,
                "unscheduled_count": missed,
                "capable_teachers": [t["teacher"] for t in capable],
                "teacher_loads": {
                    t["teacher"]: {
                        "periods_scheduled": teacher_load.get(t["teacher"], 0),
                        "max_per_week": t.get("max_period_per_week") or global_max_week,
                        "max_per_day": t.get("max_period_per_day") or global_max_day,
                    }
                    for t in capable
                },
                "configured_rooms": stream_rooms or subject_rooms,
                "reasons": reasons,
                "hints": hints,
            }
        )

    return diagnosed


def build_timetable_snapshot(base_schedule, timetable_doc):
    """
    Freeze the base week this run produced into a plain dict.

    The timetable viewer only ever renders one week, so storing the base week
    (before it is replicated across the term) is enough to reproduce the grid
    exactly as generated. Room display names and the slot/break layout are
    resolved now rather than at view time, so a later rename or config change
    does not rewrite history.

    Note this is what the algorithm produced, not what survived saving — save
    failures and overlap skips are reported separately in the result counters.
    """
    from education.education.doctype.timetable_generation_result.timetable_generation_result import (
        _build_slot_columns,
    )

    room_ids = {e.get("room") for e in base_schedule if e.get("room")}
    room_names = {}
    if room_ids:
        for r in frappe.get_all(
            "Room", filters={"name": ["in", list(room_ids)]}, fields=["name", "room_name"]
        ):
            room_names[r.name] = r.room_name or r.name

    entries = []
    week_start = None
    for e in base_schedule:
        day = datetime.strptime(e["schedule_date"], "%Y-%m-%d").date()
        if day.weekday() >= 5:
            continue
        if week_start is None or day < week_start:
            week_start = day
        entries.append(
            {
                "day": _day_name(day),
                "from": _fmt_time(e["from_time"])[:5],
                "to": _fmt_time(e["to_time"])[:5],
                "course": e.get("course"),
                "instructor": e.get("instructor"),
                "student_group": e.get("student_group"),
                "room": e.get("room"),
                "room_name": room_names.get(e.get("room"), e.get("room")),
            }
        )

    return {
        "generated_on": frappe.utils.now(),
        "week_start": week_start.strftime("%Y-%m-%d") if week_start else None,
        "columns": _build_slot_columns(timetable_doc.name),
        "entries": entries,
    }


def create_result_document(
    academic_term,
    total_items,
    scheduled,
    unscheduled,
    successful,
    failed,
    unscheduled_items=None,
    error_summary=None,
    diagnosed=None,
    overlap_skipped=0,
    timetable_snapshot=None,
):
    if successful == 0 and failed > 0:
        status = "Failed"
    elif failed > 0 or unscheduled > 0 or overlap_skipped > 0:
        status = "Partial"
    else:
        status = "Complete"

    result_doc = frappe.get_doc(
        {
            "doctype": "Timetable Generation Result",
            "academic_term": academic_term,
            "posting_date": datetime.now().date(),
            "total_subjects": total_items,
            "scheduled_count": scheduled,
            "unscheduled_count": unscheduled,
            "saved_count": successful,
            "failed_count": failed,
            "status": status,
        }
    )

    notes = {}
    if unscheduled_items:
        notes["unscheduled"] = [
            {"subject": item["subject"], "stream": item["stream"]}
            for item in unscheduled_items
        ]
    if diagnosed:
        notes["diagnosis"] = diagnosed
    if error_summary:
        notes["save_errors"] = {msg: count for msg, count in error_summary.items()}
    if overlap_skipped:
        notes["overlap_skipped"] = {
            "count": overlap_skipped,
            "reason": (
                "These entries were not saved because the instructor already has an "
                "Assessment Plan or other external commitment at that time slot. "
                "See Error Log entries titled 'Assessment Plan / supervisor conflict' "
                "for the full list of affected classes."
            ),
        }

    if notes:
        result_doc.unscheduled_subjects = json.dumps(notes, indent=2)

    if timetable_snapshot:
        result_doc.timetable_snapshot = json.dumps(timetable_snapshot)

    result_doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return result_doc


def generate_initial_schedule(config):
    """Generate a base week schedule then replicate it across the full academic term."""
    all_weeks = get_term_weeks(config["term_start_date"], config["term_end_date"])
    if not all_weeks:
        frappe.throw("No school weeks found in the academic term.")

    first_week = all_weeks[0]
    period_slots = get_period_slots(config["timetable_doc"])

    scheduling_data = prepare_scheduling_data(
        config["teacher_preferences"], config["subject_rules"], config["all_streams"]
    )
    if not scheduling_data:
        frappe.throw(
            "No scheduleable items found. Verify that teachers are assigned to subjects and streams."
        )

    base_schedule, scheduled_items, unscheduled_items = create_full_schedule(
        scheduling_data,
        config["teacher_preferences"],
        config["classrooms"],
        first_week,
        period_slots,
        config["school"],
        config["max_per_day"],
        config["max_per_week"],
        excluded_streams=config["all_streams"],
    )

    # Replicate base week across every week in the term
    first_monday = first_week[0]
    if isinstance(first_monday, datetime):
        first_monday = first_monday.date()

    term_end = config["term_end_date"]
    if isinstance(term_end, datetime):
        term_end = term_end.date()

    # Per-student-group date bounds from their own Academic Term.
    sg_term_bounds = config.get("sg_term_bounds", {})

    final_schedule = []
    term_filtered = 0

    for week in all_weeks:
        week_monday = week[0]
        if isinstance(week_monday, datetime):
            week_monday = week_monday.date()

        offset = (week_monday - first_monday).days
        for entry in base_schedule:
            base_date = datetime.strptime(entry["schedule_date"], "%Y-%m-%d").date()
            new_date = base_date + timedelta(days=offset)

            if new_date > term_end:
                continue

            # Check the Student Group's own term bounds
            sg = entry.get("student_group")
            sg_bounds = sg_term_bounds.get(sg) if sg else None
            if sg_bounds:
                sg_start, sg_end = sg_bounds
                if new_date < sg_start or new_date > sg_end:
                    term_filtered += 1
                    continue

            new_entry = entry.copy()
            new_entry["schedule_date"] = new_date.strftime("%Y-%m-%d")
            final_schedule.append(new_entry)

    if term_filtered:
        frappe.log(
            f"Timetable: {term_filtered} replicated entries skipped — "
            "dates fell outside individual Student Group Academic Term bounds."
        )

    return {
        "total_items": len(scheduling_data),
        "final_schedule": final_schedule,
        "base_schedule": base_schedule,
        "scheduled_items": scheduled_items,
        "unscheduled_items": unscheduled_items,
        "total_weeks": len(all_weeks),
    }


def save_and_report_results(config, schedule_data):
    successful, failed, overlap_skipped, error_summary = save_schedule(
        schedule_data["final_schedule"]
    )
    total_scheduled = len(schedule_data["scheduled_items"])
    total_unscheduled = len(schedule_data["unscheduled_items"])

    diagnosed = []
    if schedule_data["unscheduled_items"]:
        try:
            diagnosed = diagnose_unscheduled(
                schedule_data["unscheduled_items"],
                config,
                schedule_data["scheduled_items"],
            )
        except Exception:
            frappe.log_error(
                title="Timetable: diagnosis step failed (non-critical)",
                message=frappe.get_traceback(),
            )

    snapshot = None
    try:
        snapshot = build_timetable_snapshot(
            schedule_data["base_schedule"], config["timetable_doc"]
        )
    except Exception:
        frappe.log_error(
            title="Timetable: snapshot step failed (non-critical)",
            message=frappe.get_traceback(),
        )

    create_result_document(
        config["academic_term"],
        schedule_data["total_items"],
        total_scheduled,
        total_unscheduled,
        successful,
        failed,
        schedule_data["unscheduled_items"],
        error_summary,
        diagnosed,
        overlap_skipped=overlap_skipped,
        timetable_snapshot=snapshot,
    )

    overlap_note = (
        f" {overlap_skipped} entries skipped (Assessment Plan conflicts)."
        if overlap_skipped
        else ""
    )
    return {
        "success": failed == 0 and total_unscheduled == 0,
        "message": (
            f"Timetable generation complete. "
            f"{successful} entries saved across {schedule_data['total_weeks']} weeks. "
            f"{failed} saves failed. "
            f"{total_unscheduled} items could not be scheduled."
            f"{overlap_note}"
        ),
        "stats": {
            "total_items": schedule_data["total_items"],
            "total_weeks": schedule_data["total_weeks"],
            "scheduled": total_scheduled,
            "unscheduled": total_unscheduled,
            "save_success": successful,
            "save_failed": failed,
            "overlap_skipped": overlap_skipped,
        },
    }


def process_timetable_generation(stream_filter=None):
    """
    Background job entry point.
    """
    config = load_configuration(stream_filter=stream_filter)
    # Only wipe the streams being (re-)generated — leaves every other class untouched
    clear_existing_schedules(
        config["academic_term"],
        config["school"],
        streams=config["all_streams"],
    )
    schedule_data = generate_initial_schedule(config)
    save_and_report_results(config, schedule_data)


@frappe.whitelist()
def get_unscheduled_diagnosis(result_name):
    """
    Return a detailed diagnosis for the unscheduled items stored in a
    Timetable Generation Result document.

    If the result already contains a stored diagnosis (from when it was
    generated) that is returned immediately.  Otherwise the current
    Timetable Generator config is used to produce a fresh diagnosis against
    the Course Schedule records that are currently in the database.
    """
    result = frappe.get_doc("Timetable Generation Result", result_name)

    if not result.unscheduled_subjects:
        return {
            "success": True,
            "diagnosed": [],
            "message": "No unscheduled items recorded.",
        }

    try:
        notes = json.loads(result.unscheduled_subjects)
    except Exception:
        return {
            "success": False,
            "error": "Could not parse the unscheduled_subjects field.",
        }

    unscheduled = notes.get("unscheduled", [])
    if not unscheduled:
        return {
            "success": True,
            "diagnosed": [],
            "message": "No unscheduled items found.",
        }

    if notes.get("diagnosis"):
        return {
            "success": True,
            "diagnosed": notes["diagnosis"],
            "source": "stored",
        }

    # Otherwise build a fresh diagnosis from the current config + DB records
    try:
        config = load_configuration()
    except Exception as e:
        return {
            "success": False,
            "error": f"Could not load Timetable Generator config: {str(e)}",
        }

    try:
        term = frappe.get_doc("Academic Term", result.academic_term)
        base_start = term.term_start_date
        if isinstance(base_start, datetime):
            base_start = base_start.date()
        while base_start.weekday() != 0:
            base_start += timedelta(days=1)
        base_end = base_start + timedelta(days=4)

        base_records = frappe.get_all(
            "Course Schedule",
            filters={
                "schedule_date": [
                    "between",
                    [
                        base_start.strftime("%Y-%m-%d"),
                        base_end.strftime("%Y-%m-%d"),
                    ],
                ],
            },
            fields=["course", "student_group", "instructor"],
        )
        scheduled_items = [
            {"subject": r.course, "stream": r.student_group, "teacher": r.instructor}
            for r in base_records
        ]
    except Exception as e:
        return {
            "success": False,
            "error": f"Could not load base-week schedules: {str(e)}",
        }

    diagnosed = diagnose_unscheduled(unscheduled, config, scheduled_items)
    return {"success": True, "diagnosed": diagnosed, "source": "live"}


@frappe.whitelist()
def get_class_prefill(class_program, academic_term=None):
    """
    Build prefill rows for the Subject, Teachers and Teaching Rooms tabs from a
    selected Class (Program).

    - subject_rules        — every Course whose custom_class == class_program.
    - teachers_preference  — each Course's Subject Stream Assignment rows
                             (stream + teacher) scoped to academic_term.
    - teaching_rooms       — (subject, stream) using the stream's
                             custom_default_room.

    Returns candidate rows only. Nothing is written: the client dedups against
    the current grid rows and lets the user review before saving.
    """
    if not class_program:
        frappe.throw("Select a Class first.")

    courses = frappe.get_all(
        "Course",
        filters={"custom_class": class_program},
        pluck="name",
        order_by="name asc",
    )
    if not courses:
        frappe.throw(f"No subjects (Courses) found for class {class_program}.")

    subject_rules = [{"subject": c} for c in courses]
    teachers_preference = []
    teaching_rooms = []

    if academic_term:
        assignments = frappe.get_all(
            "Subject Stream Assignment",
            filters={
                "parenttype": "Course",
                "parentfield": "custom_assignments",
                "parent": ["in", courses],
                "academic_term": academic_term,
            },
            fields=["parent as subject", "stream", "teacher"],
        )

        # Default room per stream, fetched in one query.
        streams = list({a.stream for a in assignments if a.stream})
        room_map = {}
        if streams:
            for sg in frappe.get_all(
                "Student Group",
                filters={"name": ["in", streams]},
                fields=["name", "custom_default_room"],
            ):
                room_map[sg.name] = sg.custom_default_room

        seen_teacher = set()
        seen_room = set()
        for a in assignments:
            if not a.stream:
                continue

            key = (a.subject, a.stream)
            if a.teacher and key not in seen_teacher:
                seen_teacher.add(key)
                teachers_preference.append(
                    {"subject": a.subject, "stream": a.stream, "teacher": a.teacher}
                )

            room = room_map.get(a.stream)
            if room and key not in seen_room:
                seen_room.add(key)
                teaching_rooms.append(
                    {"subject": a.subject, "stream": a.stream, "room": room}
                )

    return {
        "subject_rules": subject_rules,
        "teachers_preference": teachers_preference,
        "teaching_rooms": teaching_rooms,
        "course_count": len(courses),
        "has_term": bool(academic_term),
    }


@frappe.whitelist()
def generate_timetable(student_groups=None):
    """
    Validate config then queue a scoped background generation job.
    """
    try:
        stream_filter = None
        if student_groups:
            parsed = (
                json.loads(student_groups)
                if isinstance(student_groups, str)
                else student_groups
            )
            stream_filter = [s for s in parsed if s] or None

        config = load_configuration(stream_filter=stream_filter)

        streams_label = ", ".join(config["all_streams"])
        frappe.enqueue(
            "education.education.doctype.timetable_generator"
            ".timetable_generator.process_timetable_generation",
            queue="long",
            timeout=3600,
            job_name=f"Timetable Generation – {streams_label[:60]}",
            stream_filter=stream_filter,
        )

        return {
            "success": True,
            "streams": config["all_streams"],
            "message": (
                f"Generation started for {len(config['all_streams'])} stream(s): "
                f"{streams_label}. Check Timetable Generation Result for the outcome."
            ),
        }
    except Exception as e:
        frappe.log_error(
            f"Timetable generation failed: {str(e)}", "Timetable Generator"
        )
        return {"success": False, "error": str(e), "message": str(e)}


@frappe.whitelist()
def debug_timetable_generation(student_groups=None):
    """Return diagnostic information without generating anything."""
    try:
        stream_filter = None
        if student_groups:
            parsed = (
                json.loads(student_groups)
                if isinstance(student_groups, str)
                else student_groups
            )
            stream_filter = [s for s in parsed if s] or None
        config = load_configuration(stream_filter=stream_filter)
        all_weeks = get_term_weeks(config["term_start_date"], config["term_end_date"])
        period_slots = get_period_slots(config["timetable_doc"])
        scheduling_data = prepare_scheduling_data(
            config["teacher_preferences"],
            config["subject_rules"],
            config["all_streams"],
        )

        subjects_per_stream = {}
        for item in scheduling_data:
            subjects_per_stream.setdefault(item["stream"], set()).add(item["subject"])

        return {
            "success": True,
            "debug_info": {
                "term_range": f"{config['term_start_date']} to {config['term_end_date']}",
                "total_weeks": len(all_weeks),
                "total_school_days": sum(len(w) for w in all_weeks),
                "period_slots": period_slots,
                "max_per_day": config["max_per_day"],
                "max_per_week": config["max_per_week"],
                "teacher_count": len(
                    {t["teacher"] for t in config["teacher_preferences"]}
                ),
                "subject_count": len(config["subject_rules"]),
                "classroom_count": len(config["classrooms"]),
                "stream_count": len(config["all_streams"]),
                "scheduling_items_per_week": len(scheduling_data),
                "scheduling_items_total": len(scheduling_data) * len(all_weeks),
                "subjects": [
                    {
                        "subject": s["subject"],
                        "frequency_per_week": s.get("frequency_per_week", 1),
                        "allow_double": s.get("allow_double", False),
                    }
                    for s in config["subject_rules"]
                ],
                "streams": [
                    {"stream": stream, "subject_count": len(subjects)}
                    for stream, subjects in subjects_per_stream.items()
                ],
            },
        }
    except Exception as e:
        return {"success": False, "error": str(e)}
