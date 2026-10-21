// Copyright (c) 2025, Navari and contributors
// For license information, please see license.txt

function addSecondsToTime(timeStr, seconds) {
  if (!timeStr) return null;
  const parts = String(timeStr).split(":");
  const h = parseInt(parts[0]) || 0;
  const m = parseInt(parts[1]) || 0;
  const s = parseInt(parts[2]) || 0;
  const total = h * 3600 + m * 60 + s + (parseInt(seconds) || 0);
  const nh = Math.floor(total / 3600);
  const nm = Math.floor((total % 3600) / 60);
  const ns = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}:${String(ns).padStart(2, "0")}`;
}

function addMinutesToTime(timeStr, minutes) {
  return addSecondsToTime(timeStr, (parseInt(minutes) || 0) * 60);
}

// prevent duplicate subjects
frappe.ui.form.on("Subject Rules", {
  subject(frm, cdt, cdn) {
    const row = locals[cdt][cdn];
    if (!row.subject) return;
    const dup = (frm.doc.subject_rules || []).find(
      (r) => r.subject === row.subject && r.name !== cdn,
    );
    if (dup) {
      const subject = row.subject;
      frappe.model.set_value(cdt, cdn, "subject", null);
      frappe.msgprint({
        title: __("Duplicate Subject"),
        message: __(
          `"${subject}" is already in the Subject Rules table. Each subject can appear only once.`,
        ),
        indicator: "orange",
      });
    }
  },
});

// auto end_time and default duration
function recalculateSlotEndTime(frm, cdt, cdn) {
  const row = locals[cdt][cdn];
  if (!row.start_time) return;
  const dur = row.duration || frm.doc.default_time_slot || 40;
  const end = addMinutesToTime(row.start_time, dur);
  if (end) frappe.model.set_value(cdt, cdn, "end_time", end);
}

frappe.ui.form.on("Time Slots", {
  time_slots_add(frm, cdt, cdn) {
    if (frm.doc.default_time_slot) {
      frappe.model.set_value(cdt, cdn, "duration", frm.doc.default_time_slot);
    }
  },
  start_time(frm, cdt, cdn) {
    recalculateSlotEndTime(frm, cdt, cdn);
  },
  duration(frm, cdt, cdn) {
    recalculateSlotEndTime(frm, cdt, cdn);
  },
});

//  duration calculated as end_time − start_time
frappe.ui.form.on("Breaks", {
  break_name(frm, cdt, cdn) {
    const row = locals[cdt][cdn];
    if (!row.start_time || !row.end_time) return;
    const toSec = (t) => {
      if (!t) return 0;
      const p = String(t).split(":");
      return (
        (parseInt(p[0]) || 0) * 3600 +
        (parseInt(p[1]) || 0) * 60 +
        (parseInt(p[2]) || 0)
      );
    };
    const dur = toSec(row.end_time) - toSec(row.start_time);
    if (dur > 0) frappe.model.set_value(cdt, cdn, "duration", dur);
  },
});

// Scope-selection dialog helpers
function getConfiguredStreams(frm) {
  const seen = new Set();
  return (frm.doc.teachers_preference || [])
    .map((r) => r.stream)
    .filter((s) => s && !seen.has(s) && seen.add(s))
    .sort();
}

function groupByGrade(streams) {
  const groups = {};
  streams.forEach((s) => {
    const m = s.match(/^((?:GRADE|CLASS|FORM|YEAR)\s*\d+)/i);
    const grade = m ? m[1].toUpperCase() : "Other";
    (groups[grade] = groups[grade] || []).push(s);
  });
  return groups;
}

function showGenerateDialog(frm) {
  const allStreams = getConfiguredStreams(frm);

  if (!allStreams.length) {
    frappe.msgprint({
      title: __("No Streams Configured"),
      message: __(
        "Add teacher preferences first so the system knows which streams to generate for.",
      ),
      indicator: "orange",
    });
    return;
  }

  const gradeGroups = groupByGrade(allStreams);
  const gradeNames = Object.keys(gradeGroups).sort();

  const fields = [
    {
      fieldtype: "HTML",
      options: `<div class="alert alert-warning">
        ${__("Select at least one student group. Only the selected streams will have their existing schedules cleared and replaced.")}
      </div>`,
    },
    {
      label: __("Select All"),
      fieldname: "_select_all",
      fieldtype: "Check",
      default: 0,
    },
    { fieldtype: "Section Break" },
  ];

  gradeNames.forEach((grade) => {
    fields.push({
      fieldtype: "Section Break",
      label: grade,
      collapsible: gradeNames.length > 3 ? 1 : 0,
    });
    gradeGroups[grade].forEach((stream) => {
      fields.push({
        label: stream,
        fieldname: `_sg_${stream.replace(/[^a-zA-Z0-9]/g, "_")}`,
        fieldtype: "Check",
        default: 0,
      });
    });
  });

  const dialog = new frappe.ui.Dialog({
    title: __("Generate Timetable"),
    size: "large",
    fields,
    primary_action_label: __("Generate"),
    primary_action(values) {
      const selectAll = values["_select_all"];
      const selected = selectAll
        ? allStreams
        : allStreams.filter(
            (s) => values[`_sg_${s.replace(/[^a-zA-Z0-9]/g, "_")}`],
          );

      if (!selected.length) {
        frappe.msgprint({
          title: __("No Stream Selected"),
          message: __(
            "Please select at least one student group, or check <b>Select All</b>.",
          ),
          indicator: "orange",
        });
        return;
      }

      dialog.hide();
      runGeneration(frm, selected);
    },
  });

  dialog.fields_dict["_select_all"].$input.on("change", function () {
    const checked = $(this).is(":checked");
    allStreams.forEach((s) => {
      const key = `_sg_${s.replace(/[^a-zA-Z0-9]/g, "_")}`;
      if (dialog.fields_dict[key])
        dialog.fields_dict[key].set_value(checked ? 1 : 0);
    });
  });

  dialog.show();
}

// Prefill the Subject, Teachers and Teaching Rooms tabs from a Class (Program).
function showPrefillDialog(frm) {
  if (!frm.doc.academic_term) {
    frappe.msgprint({
      title: __("Academic Term Required"),
      message: __(
        "Set the Academic Term first — it scopes which streams and teachers are pulled from each subject.",
      ),
      indicator: "orange",
    });
    return;
  }

  const dialog = new frappe.ui.Dialog({
    title: __("Prefill from Class"),
    fields: [
      {
        label: __("Class"),
        fieldname: "class_program",
        fieldtype: "Link",
        options: "Program",
        reqd: 1,
        description: __(
          "All subjects under this class are loaded, then their per-term streams, teachers and default rooms.",
        ),
      },
    ],
    primary_action_label: __("Prefill"),
    primary_action(values) {
      dialog.hide();
      runPrefill(frm, values.class_program);
    },
  });
  dialog.show();
}

function runPrefill(frm, class_program) {
  frappe.call({
    method:
      "education.education.doctype.timetable_generator.timetable_generator.get_class_prefill",
    args: { class_program, academic_term: frm.doc.academic_term },
    freeze: true,
    freeze_message: __("Loading class configuration..."),
    callback(r) {
      if (!r.message) return;
      const data = r.message;

      const addRows = (parentfield, candidates, keyFn, onCreate) => {
        const existing = new Set((frm.doc[parentfield] || []).map(keyFn));
        let added = 0;
        (candidates || []).forEach((c) => {
          const key = keyFn(c);
          if (existing.has(key)) return;
          existing.add(key);
          const row = frm.add_child(parentfield, c);
          if (onCreate) onCreate(row, c);
          added += 1;
        });
        frm.refresh_field(parentfield);
        return added;
      };

      const subjKey = (r) => r.subject;
      const pairKey = (r) => `${r.subject}||${r.stream}`;

      const nSubjects = addRows(
        "subject_rules",
        data.subject_rules,
        subjKey,
        (row) => {
          if (!row.frequency_per_week) row.frequency_per_week = 1;
        },
      );

      // Fixed teacher-row defaults.
      (data.teachers_preference || []).forEach((c) => {
        c.max_period_per_day = 1;
        c.max_period_per_week = 5;
      });
      const nTeachers = addRows(
        "teachers_preference",
        data.teachers_preference,
        pairKey,
      );
      const nRooms = addRows("teaching_rooms", data.teaching_rooms, pairKey);

      frm.dirty();
      frappe.show_alert(
        {
          message: __(
            `Added ${nSubjects} subject(s), ${nTeachers} teacher row(s), ${nRooms} room row(s). Review and save.`,
          ),
          indicator: "green",
        },
        7,
      );
    },
  });
}

function runGeneration(frm, selected) {
  frappe.call({
    method:
      "education.education.doctype.timetable_generator.timetable_generator.generate_timetable",
    args: { student_groups: JSON.stringify(selected) },
    freeze: true,
    freeze_message: __(
      `Starting generation for ${selected.length} stream(s)...`,
    ),
    callback(r) {
      if (!r.message) return;
      if (r.message.success) {
        frappe.msgprint({
          title: __("Generation Started"),
          message: __(r.message.message),
          indicator: "green",
        });
        frm.reload_doc();
      } else {
        frappe.msgprint({
          title: __("Generation Failed"),
          message: __(
            r.message.message ||
              r.message.error ||
              __("An unknown error occurred."),
          ),
          indicator: "red",
        });
      }
    },
  });
}

frappe.ui.form.on("Timetable Generator", {
  refresh(frm) {
    //  only subjects already in Subject Rules
    frm.fields_dict["teachers_preference"].grid.get_field("subject").get_query =
      function (doc) {
        const subjects = (doc.subject_rules || [])
          .map((r) => r.subject)
          .filter(Boolean);
        return subjects.length
          ? { filters: [["name", "in", subjects]] }
          : { filters: [["name", "in", ["__none__"]]] };
      };

    //  only Student Groups that belong to the selected Academic Term.
    frm.fields_dict["teachers_preference"].grid.get_field("stream").get_query =
      function (doc) {
        if (!doc.academic_term) {
          return { filters: [["name", "in", ["__none__"]]] };
        }
        if (!doc.school) {
          return { filters: [["academic_term", "=", doc.academic_term]] };
        }
        return { filters: [["academic_term", "=", doc.academic_term], ["school", "=", doc.school]] };
      };

    //  only subjects from Subject Rules
    frm.fields_dict["teaching_rooms"].grid.get_field("subject").get_query =
      function (doc) {
        const subjects = (doc.subject_rules || [])
          .map((r) => r.subject)
          .filter(Boolean);
        return subjects.length
          ? { filters: [["name", "in", subjects]] }
          : { filters: [["name", "in", ["__none__"]]] };
      };

    //   intersection of Academic Term streams AND those in Teachers tab
    frm.fields_dict["teaching_rooms"].grid.get_field("stream").get_query =
      function (doc) {
        const fromTeachers = [
          ...new Set(
            (doc.teachers_preference || [])
              .map((r) => r.stream)
              .filter(Boolean),
          ),
        ];
        if (!doc.academic_term && !fromTeachers.length)
          return { filters: [["name", "in", ["__none__"]]] };

        const f = [];
        if (doc.academic_term)
          f.push(["academic_term", "=", doc.academic_term]);
        if (fromTeachers.length) f.push(["name", "in", fromTeachers]);
        return { filters: f };
      };

    frm.add_custom_button(__("Prefill from Class"), () =>
      showPrefillDialog(frm),
    );

    frm
      .add_custom_button(__("Generate Timetable"), () =>
        showGenerateDialog(frm),
      )
      .addClass("btn-primary");

    frm
      .add_custom_button(__("Debug Info"), function () {
        frappe.call({
          method:
            "education.education.doctype.timetable_generator.timetable_generator.debug_timetable_generation",
          args: {},
          freeze: true,
          freeze_message: __("Loading debug information..."),
          callback(r) {
            if (!r.message) return;
            if (r.message.success) {
              const d = r.message.debug_info;
              const subjects_html = (d.subjects || [])
                .map(
                  (s) =>
                    `<tr><td>${s.subject}</td><td class="text-center">${s.frequency_per_week}</td><td class="text-center">${s.allow_double ? __("Yes") : __("No")}</td></tr>`,
                )
                .join("");
              const streams_html = (d.streams || [])
                .map(
                  (s) =>
                    `<tr><td>${s.stream}</td><td class="text-center">${s.subject_count}</td></tr>`,
                )
                .join("");
              frappe.msgprint({
                title: __("Timetable Debug Info"),
                message: `
                <h5>${__("Term Overview")}</h5>
                <table class="table table-bordered table-sm">
                  <tr><th>${__("Term Range")}</th><td>${d.term_range}</td></tr>
                  <tr><th>${__("Total Weeks")}</th><td>${d.total_weeks}</td></tr>
                  <tr><th>${__("Total School Days")}</th><td>${d.total_school_days}</td></tr>
                  <tr><th>${__("Period Slots per Day")}</th><td>${(d.period_slots || []).length}</td></tr>
                  <tr><th>${__("Max Lessons / Day")}</th><td>${d.max_per_day}</td></tr>
                  <tr><th>${__("Max Lessons / Week")}</th><td>${d.max_per_week}</td></tr>
                </table>
                <h5>${__("Resources")}</h5>
                <table class="table table-bordered table-sm">
                  <tr><th>${__("Teachers")}</th><td>${d.teacher_count}</td></tr>
                  <tr><th>${__("Subjects")}</th><td>${d.subject_count}</td></tr>
                  <tr><th>${__("Classrooms")}</th><td>${d.classroom_count}</td></tr>
                  <tr><th>${__("Student Groups")}</th><td>${d.stream_count}</td></tr>
                  <tr><th>${__("Items to Schedule / Week")}</th><td>${d.scheduling_items_per_week}</td></tr>
                  <tr><th>${__("Items to Schedule / Term")}</th><td>${d.scheduling_items_total}</td></tr>
                </table>
                <h5>${__("Subjects")}</h5>
                <table class="table table-bordered table-sm">
                  <thead><tr><th>${__("Subject")}</th><th>${__("Freq / Week")}</th><th>${__("Allow Double")}</th></tr></thead>
                  <tbody>${subjects_html}</tbody>
                </table>
                <h5>${__("Student Groups")}</h5>
                <table class="table table-bordered table-sm">
                  <thead><tr><th>${__("Stream")}</th><th>${__("Subjects Assigned")}</th></tr></thead>
                  <tbody>${streams_html}</tbody>
                </table>`,
                indicator: "blue",
                wide: true,
              });
            } else {
              frappe.msgprint({
                title: __("Debug Failed"),
                message: __(
                  r.message.error || __("An unknown error occurred."),
                ),
                indicator: "red",
              });
            }
          },
        });
      })
      .addClass("btn-default");
  },
});
