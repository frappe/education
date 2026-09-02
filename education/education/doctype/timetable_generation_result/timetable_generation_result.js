// Copyright (c) 2025, Navari and contributors
// For license information, please see license.txt

// Colour palette
const TT_COLORS = [
  "#4e79a7",
  "#e15759",
  "#59a14f",
  "#f28e2b",
  "#76b7b2",
  "#b07aa1",
  "#ff9da7",
  "#9c755f",
  "#edc948",
  "#d37295",
  "#a0cbe8",
  "#fabfd2",
  "#8cd17d",
  "#b6992d",
  "#86bcb6",
];

function pickColor(key, map) {
  if (!map[key])
    map[key] = TT_COLORS[Object.keys(map).length % TT_COLORS.length];
  return map[key];
}

// Subject / teacher abbreviations (standard print)
function abbrevSubject(name) {
  if (!name) return "-";
  const base = name.split(/\s*[-]\s*GRADE\s*\d+/i)[0].trim();
  const words = base.split(/[\s&]+/).filter(Boolean);
  return words.length === 1
    ? words[0].substring(0, 4)
    : words
        .map((w) => w[0])
        .join("")
        .substring(0, 4);
}

function abbrevTeacher(name) {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  return (parts[parts.length - 1] || "").substring(0, 2);
}

function buildCell(entries, viewMode, colorMap) {
  if (!entries.length)
    return `<td style="border:1px solid var(--border-color); padding:4px; min-width:100px;"></td>`;

  const bySubject = viewMode !== "teacher";

  const blocks = entries
    .map((e) => {
      const colorKey = bySubject ? e.course : e.student_group;
      const color = pickColor(colorKey, colorMap);

      const roomDisp = e.room_name || e.room;
      let primary, meta;
      if (viewMode === "teacher") {
        primary = e.student_group || "-";
        meta = [e.course, roomDisp].filter(Boolean);
      } else if (viewMode === "subject") {
        primary = e.student_group || "-";
        meta = [e.instructor, roomDisp].filter(Boolean);
      } else {
        primary = e.course || "-";
        meta = [e.instructor, roomDisp].filter(Boolean);
        if (viewMode === "school" && e.student_group)
          meta.push(e.student_group);
      }

      const metaHtml = meta
        .map((m, i) => {
          if (viewMode === "school" && i === meta.length - 1) {
            return `<span style="display:inline-block; margin-top:2px; font-size:10px;
            background:${color}22; border:1px solid ${color}44;
            padding:0 5px; border-radius:3px; color:${color};">${m}</span>`;
          }
          return `<span>${m}</span>`;
        })
        .join("<br>");

      return `<div style="border-left:3px solid ${color}; background:${color}12;
      padding:4px 7px; margin-bottom:3px;">
      <div style="font-weight:600; font-size:11px; color:var(--text-color);">${primary}</div>
      <div style="font-size:10px; color:var(--text-muted); line-height:1.5;">${metaHtml}</div>
    </div>`;
    })
    .join("");

  return `<td style="border:1px solid var(--border-color); padding:4px; vertical-align:top; min-width:100px;">${blocks}</td>`;
}

function renderTimetable(data, viewMode, filterValue, colorMap) {
  const { time_slots, days, grid } = data;

  const slotHeaders = time_slots
    .map((slot) => {
      if (slot.type === "break") {
        return `<th style="text-align:center; padding:6px 8px; background:#6b7280;
        color:#fff; border:1px solid #1f2937; font-size:10px; white-space:nowrap;">
        ${slot.label || __("Break")}<br>
        <span style="font-weight:400; opacity:.8;">${slot.from} – ${slot.to}</span>
      </th>`;
      }
      return `<th style="text-align:center; padding:6px 8px; background:#374151;
      color:#fff; border:1px solid #1f2937; font-size:11px; white-space:nowrap;">
      ${slot.from} – ${slot.to}
    </th>`;
    })
    .join("");

  const thead = `<thead><tr>
    <th style="padding:8px 10px; background:#374151; color:#fff;
      border:1px solid #1f2937; font-size:12px; min-width:75px;">
      ${__("Day")}
    </th>${slotHeaders}
  </tr></thead>`;

  const rows = days
    .map((day, i) => {
      const cells = time_slots
        .map((slot) => {
          if (slot.type === "break") {
            return `<td style="border:1px solid var(--border-color); min-width:46px;
            background:repeating-linear-gradient(45deg,#f3f4f6,#f3f4f6 5px,#e9eaec 5px,#e9eaec 10px);"></td>`;
          }
          let entries = (grid[`${slot.from}-${slot.to}`] || {})[day] || [];
          if (filterValue) {
            if (viewMode === "class")
              entries = entries.filter((e) => e.student_group === filterValue);
            else if (viewMode === "teacher")
              entries = entries.filter((e) => e.instructor === filterValue);
            else if (viewMode === "subject")
              entries = entries.filter((e) => e.course === filterValue);
          }
          return buildCell(entries, viewMode, colorMap);
        })
        .join("");

      return `<tr style="background:${i % 2 === 0 ? "var(--bg-color,#fff)" : "var(--control-bg,#f9f9f9)"};">
      <td style="border:1px solid var(--border-color); padding:8px 10px;
        font-weight:600; font-size:12px; background:var(--control-bg,#f4f5f6);
        white-space:nowrap; vertical-align:middle;">${day}</td>
      ${cells}
    </tr>`;
    })
    .join("");

  const legendItems = Object.entries(colorMap)
    .map(
      ([label, color]) =>
        `<span style="display:inline-flex; align-items:center; gap:5px; margin:3px 8px; font-size:11px;">
      <span style="display:inline-block; width:10px; height:10px; background:${color};"></span>
      ${label}
    </span>`,
    )
    .join("");

  return `<div style="overflow-x:auto;">
    <table class="table table-bordered" style="border-collapse:collapse; width:100%;">
      ${thead}<tbody>${rows}</tbody>
    </table>
  </div>
  ${
    legendItems
      ? `<div class="text-muted" style="margin-top:10px; padding:8px 10px;
    border:1px solid var(--border-color); font-size:11px;">
    <strong>${__("Legend")}:</strong> ${legendItems}
  </div>`
      : ""
  }`;
}

function generateStandardPrintHtml(data, viewMode, filterValue, title, opts) {
  opts = opts || { fullNames: false, showTeacher: true, showRoom: true };
  const { time_slots, days, grid } = data;

  let periodNum = 0;
  const colHeaders = time_slots
    .map((slot) => {
      if (slot.type === "break") {
        return `<th class="period-hdr break-hdr">
      <span class="period-time" style="font-weight:bold;">${slot.label || "Break"}</span><br>
      <span class="period-time">${slot.from}-${slot.to}</span>
    </th>`;
      }
      periodNum += 1;
      return `<th class="period-hdr">
      <span class="period-num">${periodNum}</span><br>
      <span class="period-time">${slot.from} - ${slot.to}</span>
    </th>`;
    })
    .join("");

  const rows = days
    .map((day) => {
      const cells = time_slots
        .map((slot) => {
          if (slot.type === "break") {
            return `<td class="tt-cell tt-break"></td>`;
          }
          const { from, to } = slot;
          let entries = (grid[`${from}-${to}`] || {})[day] || [];
          if (filterValue) {
            if (viewMode === "class")
              entries = entries.filter((e) => e.student_group === filterValue);
            else if (viewMode === "teacher")
              entries = entries.filter((e) => e.instructor === filterValue);
            else if (viewMode === "subject")
              entries = entries.filter((e) => e.course === filterValue);
          }
          if (!entries.length) return `<td class="tt-cell tt-empty"></td>`;

          const blocks = entries
            .map((e, i) => {
              const course = opts.fullNames
                ? e.course || "-"
                : abbrevSubject(e.course);
              const teacher = opts.fullNames
                ? e.instructor || ""
                : abbrevTeacher(e.instructor || "");
              const group = opts.fullNames
                ? e.student_group || "-"
                : abbrevTeacher(e.student_group || "");
              const room = opts.showRoom ? e.room_name || e.room || "" : "";

              let subj, left, right;
              if (viewMode === "teacher") {
                subj = course;
                left = group;
                right = room;
              } else if (viewMode === "subject") {
                subj = group;
                left = opts.showTeacher ? teacher : "";
                right = room;
              } else {
                subj = course;
                left = opts.showTeacher ? teacher : "";
                right = room;
              }
              const groupLabel =
                viewMode === "school" && e.student_group
                  ? `<div class="tt-group">${e.student_group}</div>`
                  : "";
              return `${i > 0 ? `<hr class="tt-divider">` : ""}
          <div class="tt-entry">
            ${groupLabel}
            <div class="tt-subject">${subj}</div>
            <div class="tt-meta"><span>${left}</span><span>${right}</span></div>
          </div>`;
            })
            .join("");

          return `<td class="tt-cell">${blocks}</td>`;
        })
        .join("");

      return `<tr><td class="day-cell">${day.substring(0, 2)}</td>${cells}</tr>`;
    })
    .join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:Arial,Helvetica,sans-serif;font-size:10px;margin:12px;color:#000;}
    h2{font-size:13px;text-align:center;margin-bottom:10px;font-weight:bold;}
    table{border-collapse:collapse;width:100%;table-layout:fixed;}
    th,td{border:1px solid #555;}
    .period-hdr{text-align:center;padding:4px 2px;background:#f0f0f0;vertical-align:middle;}
    .period-num{font-size:16px;font-weight:bold;display:block;line-height:1;}
    .period-time{font-size:8px;color:#444;white-space:nowrap;}
    .day-cell{font-size:22px;font-weight:bold;text-align:center;vertical-align:middle;padding:4px;width:36px;background:#f8f8f8;}
    .tt-cell{padding:2px 3px;vertical-align:top;}
    .tt-empty{background:#fafafa;}
    .tt-break{background:repeating-linear-gradient(45deg,#f0f0f0,#f0f0f0 4px,#e2e2e2 4px,#e2e2e2 8px);}
    .break-hdr{background:#dcdcdc;}
    .tt-entry{padding:1px 0;}
    .tt-group{font-size:7px;color:#777;text-align:right;line-height:1.2;}
    .tt-subject{font-size:15px;font-weight:bold;line-height:1.1;}
    .tt-meta{display:flex;justify-content:space-between;font-size:8px;color:#333;margin-top:1px;}
    .tt-divider{border:none;border-top:1px dashed #aaa;margin:3px 0;}
    .tt-letterhead{margin-bottom:8px;}
    @media print{@page{size:A4 landscape;margin:8mm;}}
  </style></head><body>
  ${opts.letterHeadHtml ? `<div class="tt-letterhead">${opts.letterHeadHtml}</div>` : ""}
  <h2>${title}</h2>
  <table>
    <thead><tr>
      <th style="width:36px;background:#f0f0f0;"></th>${colHeaders}
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body></html>`;
}

function generateColorPrintHtml(data, viewMode, filterValue, colorMap, title, opts) {
  opts = opts || { fullNames: true, showTeacher: true, showRoom: true };
  const { time_slots, days, grid } = data;

  const slotHeaders = time_slots
    .map((slot) => {
      if (slot.type === "break") {
        return `<th style="text-align:center;padding:5px 3px;color:#fff;
      background:#6b7280;border:1px solid #1a252f;font-size:9px;white-space:nowrap;">
      ${slot.label || "Break"}<br><span style="opacity:.8;">${slot.from} – ${slot.to}</span>
    </th>`;
      }
      return `<th style="text-align:center;padding:5px 3px;color:#fff;
      border:1px solid #1a252f;font-size:10px;white-space:nowrap;">
      ${slot.from}<br><span style="font-size:9px;opacity:.75;">– ${slot.to}</span>
    </th>`;
    })
    .join("");

  const rows = days
    .map((day, di) => {
      const rowBg = di % 2 === 0 ? "#fff" : "#f7f9fc";
      const cells = time_slots
        .map((slot) => {
          if (slot.type === "break") {
            return `<td style="border:1px solid #ddd;min-width:40px;
            background:repeating-linear-gradient(45deg,#f0f0f0,#f0f0f0 4px,#e2e2e2 4px,#e2e2e2 8px);"></td>`;
          }
          const { from, to } = slot;
          let entries = (grid[`${from}-${to}`] || {})[day] || [];
          if (filterValue) {
            if (viewMode === "class")
              entries = entries.filter((e) => e.student_group === filterValue);
            else if (viewMode === "teacher")
              entries = entries.filter((e) => e.instructor === filterValue);
            else if (viewMode === "subject")
              entries = entries.filter((e) => e.course === filterValue);
          }
          if (!entries.length)
            return `<td style="border:1px solid #ddd;padding:2px;min-width:70px;background:${rowBg};"></td>`;

          const blocks = entries
            .map((e, i) => {
              const colorKey =
                viewMode !== "teacher" ? e.course : e.student_group;
              const c = pickColor(colorKey, colorMap);
              const course = opts.fullNames
                ? e.course || "-"
                : abbrevSubject(e.course);
              const teacher = opts.fullNames
                ? e.instructor || ""
                : abbrevTeacher(e.instructor || "");
              const group = e.student_group || "-";
              const room = opts.showRoom ? e.room_name || e.room || "" : "";

              let primary, meta;
              if (viewMode === "teacher") {
                primary = group;
                meta = [course, room].filter(Boolean).join(" · ");
              } else if (viewMode === "subject") {
                primary = group;
                meta = [opts.showTeacher ? teacher : "", room]
                  .filter(Boolean)
                  .join(" · ");
              } else {
                primary = course;
                meta = [opts.showTeacher ? teacher : "", room]
                  .filter(Boolean)
                  .join(" · ");
                if (viewMode === "school" && e.student_group)
                  meta += `  [${e.student_group}]`;
              }
              return `<div style="border-left:3px solid ${c};background:${c}18;padding:3px 5px;
          margin-bottom:${i < entries.length - 1 ? "3px" : "0"};">
          <div style="font-weight:700;font-size:10px;">${primary}</div>
          <div style="font-size:9px;color:#555;">${meta}</div>
        </div>`;
            })
            .join("");

          return `<td style="border:1px solid #ddd;padding:2px;vertical-align:top;background:${rowBg};">${blocks}</td>`;
        })
        .join("");

      return `<tr>
      <td style="border:1px solid #ddd;padding:5px 8px;font-weight:700;font-size:11px;
        background:#edf2f7;white-space:nowrap;vertical-align:middle;">${day}</td>
      ${cells}
    </tr>`;
    })
    .join("");

  const legendItems = Object.entries(colorMap)
    .map(
      ([label, color]) =>
        `<span style="display:inline-flex;align-items:center;gap:4px;margin:2px 6px;font-size:9px;">
      <span style="display:inline-block;width:9px;height:9px;background:${color};"></span>${label}
    </span>`,
    )
    .join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
  <style>
    body{font-family:Arial,sans-serif;margin:12px;font-size:10px;}
    h2{font-size:13px;text-align:center;margin-bottom:10px;}
    table{border-collapse:collapse;width:100%;}
    .tt-letterhead{margin-bottom:8px;}
    @media print{@page{size:A4 landscape;margin:8mm;}}
  </style></head><body>
  ${opts.letterHeadHtml ? `<div class="tt-letterhead">${opts.letterHeadHtml}</div>` : ""}
  <h2>${title}</h2>
  <table>
    <thead><tr>
      <th style="padding:8px;background:#2c3e50;color:#fff;border:1px solid #1a252f;min-width:60px;">${__("Day")}</th>
      ${slotHeaders}
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  ${
    legendItems
      ? `<div style="margin-top:8px;padding:6px 10px;border:1px solid #ddd;font-size:9px;">
    <strong>${__("Legend")}: </strong>${legendItems}
  </div>`
      : ""
  }
</body></html>`;
}

const VIEW_MODES = [
  {
    key: "school",
    label: __("Whole School"),
    filterLabel: null,
    optionsKey: null,
  },
  {
    key: "class",
    label: __("By Class"),
    filterLabel: __("Student Group"),
    optionsKey: "student_groups",
  },
  {
    key: "teacher",
    label: __("By Teacher"),
    filterLabel: __("Teacher"),
    optionsKey: "instructors",
  },
  {
    key: "subject",
    label: __("By Subject"),
    filterLabel: __("Subject"),
    optionsKey: "subjects",
  },
];

frappe.ui.form.on("Timetable Generation Result", {
  refresh(frm) {
    if (frm.doc.status !== "Failed") {
      frm
        .add_custom_button(__("View Timetable"), () => openTimetableDialog(frm))
        .addClass("btn-primary");
    }
    if (frm.doc.unscheduled_count > 0) {
      frm
        .add_custom_button(__("Diagnose Unscheduled"), () =>
          openDiagnosisDialog(frm),
        )
        .addClass("btn-danger");
    }
  },
});

// Collect per-print display preferences, then hand them to the generator.
function openPrintOptions(onConfirm) {
  const finish = (v, letterHeadHtml) =>
    onConfirm({
      fullNames: v.name_style === "Full",
      showTeacher: !!v.show_teacher,
      showRoom: !!v.show_room,
      letterHeadHtml: letterHeadHtml || "",
    });

  const d = new frappe.ui.Dialog({
    title: __("Print Options"),
    fields: [
      {
        fieldname: "name_style",
        label: __("Subject / Teacher Names"),
        fieldtype: "Select",
        options: ["Abbreviated", "Full"].join("\n"),
        default: "Abbreviated",
      },
      { fieldname: "cb", fieldtype: "Column Break" },
      {
        fieldname: "show_teacher",
        label: __("Show Teacher"),
        fieldtype: "Check",
        default: 1,
      },
      {
        fieldname: "show_room",
        label: __("Show Room"),
        fieldtype: "Check",
        default: 1,
      },
      { fieldname: "sb", fieldtype: "Section Break" },
      {
        fieldname: "letter_head",
        label: __("Letter Head"),
        fieldtype: "Link",
        options: "Letter Head",
        description: __("Leave blank to print without a letter head."),
      },
    ],
    primary_action_label: __("Print"),
    primary_action(v) {
      d.hide();
      if (!v.letter_head) return finish(v, "");
      frappe.db
        .get_value("Letter Head", v.letter_head, "content")
        .then((r) => finish(v, (r.message && r.message.content) || ""));
    },
  });

  // Default to the site's default letter head, if any.
  frappe.db
    .get_value("Letter Head", { is_default: 1 }, "name")
    .then((r) => {
      if (r.message && r.message.name) d.set_value("letter_head", r.message.name);
    });

  d.show();
}

// Where the rendered grid comes from: the week this run generated, or the
// Course Schedule records that are live right now.
const TT_SOURCES = [
  { key: "snapshot", label: __("As Generated") },
  { key: "live", label: __("Current") },
];

function openTimetableDialog(frm) {
  const dialog = new frappe.ui.Dialog({
    title: __("Timetable") + " — " + (frm.doc.academic_term || ""),
    size: "extra-large",
  });
  dialog.$wrapper
    .find(".modal-dialog")
    .css({ "max-width": "94vw", width: "94vw" });
  dialog.show();

  let data = null;
  let viewMode = "class";
  let filterValue = "";
  const colorMap = {};

  function modeConfig() {
    return VIEW_MODES.find((m) => m.key === viewMode);
  }

  // Keep the selected filter valid: options differ per view mode, and they
  // also differ between the snapshot and the live schedule.
  function syncFilter(preferred) {
    const cfg = modeConfig();
    if (!cfg.optionsKey) {
      filterValue = "";
      return;
    }
    const opts = data[cfg.optionsKey] || [];
    if (preferred && opts.includes(preferred)) filterValue = preferred;
    else if (!opts.includes(filterValue)) filterValue = opts[0] || "";
  }

  function load(requestedSource) {
    const keepFilter = filterValue;
    dialog.$body.html(`<div class="text-center text-muted" style="padding:40px;">
      <p>${__("Loading timetable...")}</p>
    </div>`);

    frappe.call({
      method:
        "education.education.doctype.timetable_generation_result" +
        ".timetable_generation_result.get_timetable_view",
      args: { result_name: frm.doc.name, source: requestedSource || null },
      callback(r) {
        if (!r.message) {
          dialog.$body.html(
            `<p class="text-danger" style="padding:20px;">${__("Failed to load timetable data.")}</p>`,
          );
          return;
        }
        data = r.message;
        syncFilter(keepFilter);
        refresh();
      },
    });
  }

  function printTitle() {
    const modeName = modeConfig()?.label || "";
    return `${frm.doc.academic_term || __("Timetable")} — ${modeName}: ${filterValue || __("All")}`;
  }

  function openPrint(html) {
    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }

  // Only offer the switch once there is something to switch between.
  function buildSourceToggle() {
    if (!data.snapshot_available) return "";

    const buttons = TT_SOURCES.map(
      (s) =>
        `<button data-source="${s.key}" class="btn btn-sm ${s.key === data.source ? "btn-primary" : "btn-default"}" style="margin-right:4px;">
        ${s.label}
      </button>`,
    ).join("");

    return `<div style="display:flex; align-items:center; gap:8px; margin-left:12px;">
      <label class="control-label" style="margin:0;">${__("Source")}:</label>
      <div>${buttons}</div>
    </div>`;
  }

  function buildSourceNote() {
    if (data.source === "snapshot") {
      const when = data.generated_on
        ? frappe.datetime.str_to_user(data.generated_on)
        : null;
      return when
        ? __("Showing the timetable as generated on {0}.", [when])
        : __("Showing the timetable as generated by this run.");
    }
    return __(
      "Showing the current Course Schedule, which includes later generations and manual edits.",
    );
  }

  function buildToolbar() {
    const modeButtons = VIEW_MODES.map(
      (m) =>
        `<button data-mode="${m.key}" class="btn btn-sm ${m.key === viewMode ? "btn-primary" : "btn-default"}" style="margin-right:4px;">
        ${m.label}
      </button>`,
    ).join("");

    const cfg = modeConfig();
    let filterHtml = "";
    if (cfg.optionsKey) {
      const opts = (data[cfg.optionsKey] || [])
        .map(
          (v) =>
            `<option value="${v}" ${v === filterValue ? "selected" : ""}>${v}</option>`,
        )
        .join("");
      filterHtml = `<div style="display:flex; align-items:center; gap:8px; margin-left:12px;">
        <label class="control-label" style="margin:0;">${cfg.filterLabel}:</label>
        <select id="tt-filter" class="form-control form-control-sm" style="min-width:200px;">${opts}</select>
      </div>`;
    }

    return `<div style="display:flex; align-items:center; flex-wrap:wrap; gap:8px;
      padding:8px 12px; border-bottom:1px solid var(--border-color);">
      <div>${modeButtons}</div>
      ${filterHtml}
      ${buildSourceToggle()}
      <div style="margin-left:auto; display:flex; gap:6px;">
        <button id="tt-print-color" class="btn btn-sm btn-default">${__("Color Print")}</button>
        <button id="tt-print-std"   class="btn btn-sm btn-default">${__("Standard Print")}</button>
      </div>
    </div>
    <div style="padding:6px 12px; margin-bottom:6px; font-size:11px; color:var(--text-muted);">
      ${buildSourceNote()}
    </div>
    <div id="tt-grid"></div>`;
  }

  function attachEvents() {
    dialog.$body.find("[data-mode]").on("click", function () {
      viewMode = $(this).data("mode");
      syncFilter();
      refresh();
    });
    dialog.$body.find("[data-source]").on("click", function () {
      const requested = $(this).data("source");
      if (requested !== data.source) load(requested);
    });
    dialog.$body.find("#tt-filter").on("change", function () {
      filterValue = $(this).val();
      redrawGrid();
    });
    dialog.$body.find("#tt-print-color").on("click", () =>
      openPrintOptions((opts) =>
        openPrint(
          generateColorPrintHtml(
            data,
            viewMode,
            filterValue,
            colorMap,
            printTitle(),
            opts,
          ),
        ),
      ),
    );
    dialog.$body.find("#tt-print-std").on("click", () =>
      openPrintOptions((opts) =>
        openPrint(
          generateStandardPrintHtml(
            data,
            viewMode,
            filterValue,
            printTitle(),
            opts,
          ),
        ),
      ),
    );
  }

  function redrawGrid() {
    // Rendered inside the toolbar shell rather than replacing it, so the
    // source toggle stays reachable even when a view has nothing to show.
    const $grid = dialog.$body.find("#tt-grid");
    if (!data.time_slots || !data.time_slots.length) {
      $grid.html(
        `<p class="text-muted" style="padding:20px;">${__("No schedule entries found for the first week of this term.")}</p>`,
      );
      return;
    }
    $grid.html(renderTimetable(data, viewMode, filterValue, colorMap));
  }

  function refresh() {
    dialog.$body.html(buildToolbar());
    attachEvents();
    redrawGrid();
  }

  load(null);
}

function openDiagnosisDialog(frm) {
  const dialog = new frappe.ui.Dialog({
    title: __("Unscheduled Items — Diagnosis"),
    size: "large",
  });
  dialog.$wrapper.find(".modal-dialog").css({ "max-width": "780px" });
  dialog.$body.html(`<div class="text-center text-muted" style="padding:30px;">
    <p>${__("Running diagnosis...")}</p>
  </div>`);
  dialog.show();

  frappe.call({
    method:
      "education.education.doctype.timetable_generator" +
      ".timetable_generator.get_unscheduled_diagnosis",
    args: { result_name: frm.doc.name },
    callback(r) {
      if (!r.message || !r.message.success) {
        dialog.$body.html(`<div class="alert alert-danger" style="margin:20px;">
          ${r.message ? r.message.error : __("Failed to run diagnosis.")}
        </div>`);
        return;
      }

      const { diagnosed, source } = r.message;
      if (!diagnosed || !diagnosed.length) {
        dialog.$body.html(
          `<p class="text-muted" style="padding:20px;">${__("No diagnosis data available.")}</p>`,
        );
        return;
      }

      const sourceNote =
        source === "stored"
          ? `<span class="text-muted">(${__("stored at generation time")})</span>`
          : `<span class="text-muted">(${__("live — current config")})</span>`;

      const sections = diagnosed
        .map((d) => {
          const statusPill = d.reasons.length
            ? `<span class="indicator-pill red">${d.scheduled_this_week}/${d.frequency_per_week} ${__("per week")}</span>`
            : `<span class="indicator-pill green">${d.scheduled_this_week}/${d.frequency_per_week} ${__("per week")}</span>`;

          const reasonsList = d.reasons.map((r) => `<li>${r}</li>`).join("");

          const teacherRows = Object.entries(d.teacher_loads || {})
            .map(([t, info]) => {
              const over = info.periods_scheduled >= info.max_per_week;
              return `<tr>
            <td>${t}</td>
            <td class="text-center">
              <span class="indicator-pill ${over ? "red" : "green"}">
                ${info.periods_scheduled}/${info.max_per_week}
              </span>
            </td>
            <td class="text-center">${info.max_per_day}/${__("day")}</td>
          </tr>`;
            })
            .join("");

          const teacherSection = teacherRows
            ? `<table class="table table-bordered table-sm" style="margin-top:6px;">
              <thead>
                <tr>
                  <th>${__("Teacher")}</th>
                  <th class="text-center">${__("Used / Week Limit")}</th>
                  <th class="text-center">${__("Day Limit")}</th>
                </tr>
              </thead>
              <tbody>${teacherRows}</tbody>
            </table>`
            : `<p class="text-danger" style="font-size:12px; margin-top:4px;">${__("No teachers configured.")}</p>`;

          const roomsText = d.configured_rooms.length
            ? d.configured_rooms.join(", ")
            : `<span class="indicator-pill red">${__("None configured")}</span>`;

          const hintsSection = d.hints.length
            ? `<div class="mt-3">
              <strong style="font-size:12px;">${__("Suggested Fixes")}</strong>
              <ul style="margin:4px 0 0 16px; font-size:12px;">${d.hints.map((h) => `<li>${h}</li>`).join("")}</ul>
            </div>`
            : "";

          return `<div style="padding:12px 0; border-bottom:1px solid var(--border-color);">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
            <div>
              <strong>${d.subject}</strong>
              <span class="text-muted" style="margin-left:8px; font-size:12px;">${d.stream}</span>
            </div>
            <div class="text-right">
              ${statusPill}
              <div class="text-muted" style="font-size:11px; margin-top:2px;">
                ${d.unscheduled_count} ${__("instance(s) not placed")}
              </div>
            </div>
          </div>

          <div class="mt-2">
            <strong style="font-size:12px;">${__("Reasons")}</strong>
            <ul style="margin:4px 0 0 16px; font-size:12px;">${reasonsList}</ul>
          </div>

          <div class="mt-2">
            <strong style="font-size:12px;">${__("Capable Teachers")} (${d.capable_teachers.length})</strong>
            ${teacherSection}
          </div>

          <div class="mt-2">
            <strong style="font-size:12px;">${__("Configured Rooms")}</strong>
            <div class="text-muted" style="font-size:12px; margin-top:3px;">${roomsText}</div>
          </div>

          ${hintsSection}
        </div>`;
        })
        .join("");

      dialog.$body.html(`<div style="padding:0 4px;">
        <div style="margin-bottom:12px;">
          <strong>${diagnosed.length}</strong> ${__("subject-stream group(s) with unscheduled instances")}
          &nbsp;${sourceNote}
        </div>
        <div style="max-height:68vh; overflow-y:auto;">${sections}</div>
      </div>`);
    },
  });
}
