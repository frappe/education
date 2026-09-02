frappe.pages["school-timetable"].on_page_load = function (wrapper) {
  const page = frappe.ui.make_app_page({
    parent: wrapper,
    title: __("School Timetable"),
    single_column: true,
  });

  let calendar = null;
  let streamColorMap = {};
  let allTerms = [];

  // Color palette for streams — light background, colored border
  const STREAM_COLORS = [
    { bg: "#EFF6FF", border: "#3B82F6", text: "#1D4ED8" },
    { bg: "#F0FDF4", border: "#16A34A", text: "#14532D" },
    { bg: "#FFF7ED", border: "#EA580C", text: "#9A3412" },
    { bg: "#FDF4FF", border: "#9333EA", text: "#6B21A8" },
    { bg: "#FFF1F2", border: "#E11D48", text: "#9F1239" },
    { bg: "#ECFDF5", border: "#0D9488", text: "#134E4A" },
    { bg: "#EEF2FF", border: "#4F46E5", text: "#312E81" },
    { bg: "#FFFBEB", border: "#D97706", text: "#78350F" },
    { bg: "#F0F9FF", border: "#0284C7", text: "#0C4A6E" },
    { bg: "#FDF2F8", border: "#DB2777", text: "#831843" },
    { bg: "#F7FEE7", border: "#65A30D", text: "#365314" },
    { bg: "#FFF5F5", border: "#DC2626", text: "#7F1D1D" },
  ];

  function pickStreamColor(stream) {
    if (!streamColorMap[stream]) {
      const idx = Object.keys(streamColorMap).length % STREAM_COLORS.length;
      streamColorMap[stream] = STREAM_COLORS[idx];
    }
    return streamColorMap[stream];
  }

  function fmtTime(timeStr) {
    if (!timeStr) return "";
    const parts = String(timeStr).split(":");
    let h = parseInt(parts[0]);
    const m = (parts[1] || "00").substring(0, 2);
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  }

  /**
   * Convert a JS Date to a "YYYY-MM-DD" string using LOCAL date components.
   */
  function toLocalDateStr(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function fmtTimeTo24(val) {
    if (!val) return "00:00:00";
    const parts = String(val).split(":");
    return parts
      .slice(0, 3)
      .map((p) => p.padStart(2, "0"))
      .join(":");
  }

  $(page.body).html(`
		<div id="tt-page-wrap">
			<!-- Filter bar -->
			<div id="tt-filters" class="d-flex flex-wrap align-items-center gap-3 p-3"
				style="border-bottom:1px solid var(--border-color); background:var(--card-bg);">

				<div class="d-flex align-items-center gap-2">
					<label class="control-label mb-0 text-nowrap">${__("Term")}:</label>
					<select id="tt-term" class="form-control form-control-sm" style="min-width:200px;">
						<option value="">${__("All Terms")}</option>
					</select>
				</div>

				<div class="d-flex align-items-center gap-2">
					<label class="control-label mb-0 text-nowrap">${__("Class")}:</label>
					<select id="tt-stream" class="form-control form-control-sm" style="min-width:180px;">
						<option value="">${__("All Classes")}</option>
					</select>
				</div>

				<div class="d-flex align-items-center gap-2">
					<label class="control-label mb-0 text-nowrap">${__("Teacher")}:</label>
					<select id="tt-teacher" class="form-control form-control-sm" style="min-width:180px;">
						<option value="">${__("All Teachers")}</option>
					</select>
				</div>

				<div class="d-flex gap-2 ml-auto">
					<button id="tt-clear" class="btn btn-sm btn-default">${__("Clear")}</button>
					<button id="tt-print" class="btn btn-sm btn-primary">${__("Print")}</button>
				</div>
			</div>

			<!-- Calendar -->
			<div id="tt-calendar" style="padding:16px;"></div>
		</div>

		<style>
			#tt-calendar .fc { font-family: inherit; font-size: 13px; }
			#tt-calendar .fc-toolbar-title {
				font-size: 16px; font-weight: 600; color: var(--text-color);
			}
			#tt-calendar .fc-button {
				background: var(--btn-default-bg, #f0f0f0);
				border: 1px solid var(--border-color);
				color: var(--text-color);
				box-shadow: none !important;
				padding: 4px 12px;
				font-size: 12px;
				border-radius: var(--border-radius, 4px);
			}
			#tt-calendar .fc-button:hover { background: var(--control-bg); }
			#tt-calendar .fc-button-primary:not(:disabled).fc-button-active,
			#tt-calendar .fc-button-primary:not(:disabled):active {
				background: var(--primary) !important;
				border-color: var(--primary) !important;
				color: #fff !important;
			}
			#tt-calendar .fc-col-header-cell-cushion,
			#tt-calendar .fc-daygrid-day-number { color: var(--text-color); text-decoration: none; }
			#tt-calendar .fc-timegrid-slot { height: 48px; }
			#tt-calendar .fc-timegrid-slot-label { font-size: 11px; color: var(--text-muted); }
			#tt-calendar .fc-event {
				border-radius: 4px; border-width: 2px; cursor: pointer; padding: 2px 4px;
			}
			#tt-calendar .fc-event:hover { filter: brightness(0.94); }
			#tt-calendar .fc-day-today { background: rgba(249,200,0,0.07) !important; }
			#tt-calendar .fc-col-header { background: #374151; }
			#tt-calendar .fc-col-header-cell-cushion {
				color: #fff !important; font-size: 12px; font-weight: 600; padding: 6px 8px;
			}
			#tt-calendar .fc-list-event:hover td { background: var(--control-bg); }
		</style>
	`);

  // Load dropdown data
  frappe.call({
    method:
      "education.education.page.school_timetable.timetable.get_academic_terms",
    callback(r) {
      allTerms = r.message || [];
      const sel = $("#tt-term");
      allTerms.forEach((t) =>
        sel.append(`<option value="${t.value}">${t.label}</option>`),
      );
    },
  });

  frappe.call({
    method:
      "education.education.page.school_timetable.timetable.get_streams",
    callback(r) {
      const sel = $("#tt-stream");
      (r.message || []).forEach((s) =>
        sel.append(`<option value="${s.value}">${s.label}</option>`),
      );
    },
  });

  frappe.call({
    method:
      "education.education.page.school_timetable.timetable.get_teachers",
    callback(r) {
      const sel = $("#tt-teacher");
      (r.message || []).forEach((t) =>
        sel.append(`<option value="${t.value}">${t.label}</option>`),
      );
    },
  });

  // Load FullCalendar 6
  function loadFullCalendar(cb) {
    if (window.FullCalendar) {
      cb();
      return;
    }

    if (!document.getElementById("fc-css")) {
      const link = document.createElement("link");
      link.id = "fc-css";
      link.rel = "stylesheet";
      link.href =
        "https://cdn.jsdelivr.net/npm/fullcalendar@6.1.11/index.global.min.css";
      document.head.appendChild(link);
    }
    const script = document.createElement("script");
    script.src =
      "https://cdn.jsdelivr.net/npm/fullcalendar@6.1.11/index.global.min.js";
    script.onload = cb;
    script.onerror = () =>
      frappe.msgprint({
        title: __("Load Error"),
        message: __(
          "Could not load the calendar library. Check your internet connection.",
        ),
        indicator: "red",
      });
    document.head.appendChild(script);
  }

  loadFullCalendar(initCalendar);

  // Calendar initialization
  function initCalendar() {
    const calEl = document.getElementById("tt-calendar");
    if (calendar) {
      calendar.destroy();
      calendar = null;
    }

    calendar = new FullCalendar.Calendar(calEl, {
      initialView: "timeGridWeek",
      headerToolbar: {
        left: "prev,next today",
        center: "title",
        right: "timeGridWeek,timeGridDay,listWeek",
      },
      buttonText: {
        today: __("Today"),
        week: __("Week"),
        day: __("Day"),
        list: __("Agenda"),
      },
      weekends: false, // school is Mon–Fri
      slotMinTime: "07:00:00",
      slotMaxTime: "18:00:00",
      slotDuration: "00:30:00",
      slotLabelInterval: "01:00:00",
      allDaySlot: false,
      nowIndicator: true,
      editable: false, // read-only
      selectable: false,
      eventClick(info) {
        showEventDetail(info.event);
      },
      eventContent(arg) {
        const ep = arg.event.extendedProps;
        return {
          html: `<div style="overflow:hidden; padding:2px 3px;">
						<div style="font-size:10px; opacity:.75; white-space:nowrap;">${arg.timeText}</div>
						<div style="font-weight:700; font-size:11px; line-height:1.3; white-space:normal;">${ep.course || arg.event.title}</div>
						${ep.student_group ? `<div style="font-size:10px; opacity:.85;">${ep.student_group}</div>` : ""}
						${ep.room ? `<div style="font-size:10px; opacity:.7;">${ep.room}</div>` : ""}
					</div>`,
        };
      },
      events(fetchInfo, successCb, failureCb) {
        const instructor = $("#tt-teacher").val() || "";
        const stream = $("#tt-stream").val() || "";
        const startDate = fetchInfo.startStr.split("T")[0];
        const endDate = fetchInfo.endStr.split("T")[0];

        frappe.call({
          method:
            "education.education.page.school_timetable.timetable.get_course_schedule",
          args: {
            instructor,
            stream,
            start_date: startDate,
            end_date: endDate,
          },
          callback(r) {
            const events = (r.message || []).map((s) => {
              const col = pickStreamColor(s.student_group);
              return {
                id: s.name,
                title: s.course,
                start: `${s.schedule_date}T${fmtTimeTo24(s.from_time)}`,
                end: `${s.schedule_date}T${fmtTimeTo24(s.to_time)}`,
                backgroundColor: col.bg,
                borderColor: col.border,
                textColor: col.text,
                extendedProps: {
                  course: s.course,
                  instructor: s.instructor,
                  student_group: s.student_group,
                  room: s.room,
                  schedule_date: s.schedule_date,
                  from_time: s.from_time,
                  to_time: s.to_time,
                },
              };
            });
            successCb(events);
          },
          error: failureCb,
        });
      },
    });

    calendar.render();
  }

  // event detail popup
  function showEventDetail(event) {
    const ep = event.extendedProps;
    const col = pickStreamColor(ep.student_group);
    frappe.msgprint({
      title: ep.course,
      message: `
				<table class="table table-bordered table-sm" style="margin:0;">
					<tr><th style="width:110px;">${__("Date")}</th>
					    <td>${ep.schedule_date || ""}</td></tr>
					<tr><th>${__("Time")}</th>
					    <td>${fmtTime(ep.from_time)} – ${fmtTime(ep.to_time)}</td></tr>
					<tr><th>${__("Class")}</th>
					    <td><span style="display:inline-block; padding:2px 8px; border-radius:3px;
					        background:${col.bg}; border:1px solid ${col.border};
					        color:${col.text}; font-weight:600;">${ep.student_group || "-"}
					    </span></td></tr>
					<tr><th>${__("Teacher")}</th><td>${ep.instructor || "-"}</td></tr>
					<tr><th>${__("Room")}</th>  <td>${ep.room || "-"}</td></tr>
				</table>`,
      indicator: "blue",
    });
  }

  // Filter
  function refetch() {
    if (calendar) calendar.refetchEvents();
  }

  $("#tt-term").on("change", function () {
    const term = allTerms.find((t) => t.value === $(this).val());
    if (term && term.start && calendar) calendar.gotoDate(term.start);
    refetch();
  });

  $("#tt-stream").on("change", refetch);
  $("#tt-teacher").on("change", refetch);

  $("#tt-clear").on("click", function () {
    $("#tt-term, #tt-stream, #tt-teacher").val("");
    streamColorMap = {};
    refetch();
  });

  // Print
  $("#tt-print").on("click", function () {
    if (!calendar) return;

    const viewStart = new Date(calendar.view.currentStart);
    const viewEndExcl = new Date(calendar.view.currentEnd);
    viewEndExcl.setDate(viewEndExcl.getDate() - 1);

    const startDate = toLocalDateStr(viewStart);
    const endDate = toLocalDateStr(viewEndExcl);
    const instructor = $("#tt-teacher").val() || "";
    const stream = $("#tt-stream").val() || "";

    frappe.call({
      method:
        "education.education.page.school_timetable.timetable.get_course_schedule",
      args: {
        instructor,
        stream,
        start_date: startDate,
        end_date: endDate,
      },
      callback(r) {
        printSchedule(
          r.message || [],
          stream || instructor || __("All"),
          startDate,
          endDate,
        );
      },
    });
  });

  function printSchedule(schedules, label, startDate, endDate) {
    // Build the list of dates that are actually in the queried range
    // (Mon–Fri only) so a day-view prints one day,
    // a week-view prints Mon–Fri, etc.
    const displayDates = [];
    const cur = new Date(startDate + "T12:00:00");
    const end = new Date(endDate + "T12:00:00");
    while (cur <= end) {
      const dow = cur.getDay();
      if (dow >= 1 && dow <= 5) {
        // Mon = 1 … Fri = 5
        displayDates.push(cur.toISOString().split("T")[0]);
      }
      cur.setDate(cur.getDate() + 1);
    }

    // Group schedules by date
    const byDate = {};
    displayDates.forEach((d) => (byDate[d] = []));
    schedules.forEach((s) => {
      if (byDate[s.schedule_date]) byDate[s.schedule_date].push(s);
    });

    // Unique sorted time slots from the returned data
    const slotMap = {};
    schedules.forEach((s) => {
      const key = fmtTimeTo24(s.from_time);
      slotMap[key] = { from: s.from_time, to: s.to_time };
    });
    const slots = Object.keys(slotMap)
      .sort()
      .map((k) => slotMap[k]);

    if (!slots.length || !displayDates.length) {
      frappe.msgprint({
        title: __("Nothing to Print"),
        message: __("No schedules found for the current view."),
        indicator: "orange",
      });
      return;
    }

    const colHeaders = slots
      .map(
        (sl) =>
          `<th style="text-align:center; font-size:10px; padding:4px 3px; background:#f0f0f0; white-space:nowrap;">
						${fmtTime(sl.from)}<br><span style="opacity:.65;">– ${fmtTime(sl.to)}</span>
					</th>`,
      )
      .join("");

    const rows = displayDates
      .map((dateStr) => {
        // Header cell: "Mon\n19 May"
        const d = new Date(dateStr + "T12:00:00");
        const dayAbbr = d.toLocaleDateString("en-US", {
          weekday: "short",
        });
        const dateFmt = d.toLocaleDateString("en-US", {
          day: "numeric",
          month: "short",
        });

        const cells = slots
          .map((sl) => {
            // Use filter (not find) so ALL classes at this time are shown,
            // including parallel classes in different streams.
            const matches = (byDate[dateStr] || []).filter(
              (s) => fmtTimeTo24(s.from_time) === fmtTimeTo24(sl.from),
            );
            if (!matches.length)
              return `<td style="border:1px solid #ccc; padding:4px;"></td>`;

            const blocks = matches
              .map(
                (m, idx) => `
								<div style="${idx > 0 ? "border-top:1px dashed #ccc; margin-top:3px; padding-top:3px;" : ""}">
									<strong style="font-size:11px;">${m.course}</strong><br>
									<span style="font-size:10px; color:#444;">${m.instructor || ""}</span><br>
									<span style="font-size:10px; color:#777;">
										${m.student_group || ""}${m.room ? " · " + m.room : ""}
									</span>
								</div>`,
              )
              .join("");

            return `<td style="border:1px solid #ccc; padding:4px; vertical-align:top;">${blocks}</td>`;
          })
          .join("");

        return `<tr>
					<td style="border:1px solid #ccc; padding:5px 7px; font-weight:700;
						font-size:12px; background:#f8f8f8; white-space:nowrap; text-align:center;">
						${dayAbbr}<br><span style="font-weight:400; font-size:10px;">${dateFmt}</span>
					</td>
					${cells}
				</tr>`;
      })
      .join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
			<title>${__("Timetable")} — ${label}</title>
			<style>
				body { font-family: Arial, sans-serif; margin: 12px; }
				h2 { font-size: 14px; text-align: center; margin-bottom: 10px; }
				table { border-collapse: collapse; width: 100%; }
				th { border: 1px solid #ccc; padding: 5px; }
				@media print { @page { size: A4 landscape; margin: 8mm; } }
			</style></head><body>
			<h2>${__("Timetable")} — ${label}</h2>
			<table>
				<thead><tr>
					<th style="width:46px; background:#374151; color:#fff;">${__("Day")}</th>
					${colHeaders}
				</tr></thead>
				<tbody>${rows}</tbody>
			</table>
		</body></html>`;

    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }
};
