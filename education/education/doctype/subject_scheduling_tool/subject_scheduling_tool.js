// Copyright (c) 2016, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on('Subject Scheduling Tool', {
  setup(frm) {
    frm.set_query('student_batch', function () {
      return {
        filters: {
          disabled: 0,
        },
      }
    })
    frm.set_query('subject', 'slots', function (doc, cdt, cdn) {
      const row = locals[cdt][cdn]
      if (row.faculty) {
        return {
          query: 'education.education.doctype.faculty.faculty.subject_query',
          filters: {
            faculty: row.faculty,
            course: frm.doc.course,
          },
        }
      }
      return {
        filters: {
          course: frm.doc.course,
        },
      }
    })
    frm.set_query('faculty', 'slots', function (doc, cdt, cdn) {
      const row = locals[cdt][cdn]
      return {
        query: 'education.education.doctype.faculty.faculty.faculty_query',
        filters: {
          subject: row.subject,
          course: frm.doc.course,
        },
      }
    })
  },
  refresh(frm) {
    frm.disable_save()
    frm.page.set_primary_action(__('Schedule Subjects'), () => {
      frappe.dom.freeze(__('Scheduling...'))
      frm
        .call('schedule_subjects')
        .fail(() => {
          frappe.dom.unfreeze()
          frappe.msgprint(__('Subject Scheduling Failed'))
        })
        .then((r) => {
          frappe.dom.unfreeze()
          if (!r.message) {
            frappe.throw(__('There were errors creating Subject Schedule'))
          }
          show_scheduling_result(r.message)
        })
    })
  },
})

frappe.ui.form.on('Subject Scheduling Tool Slot', {
  subject(frm, cdt, cdn) {
    const row = frappe.get_doc(cdt, cdn)
    clear_invalid_faculty(row)
  },
  faculty(frm, cdt, cdn) {
    const row = frappe.get_doc(cdt, cdn)
    clear_invalid_subject(row)
  },
})

function clear_invalid_faculty(row) {
  if (!row.faculty || !row.subject) {
    return
  }
  frappe.db
    .exists('Course Subject', {
      parenttype: 'Faculty',
      parent: row.faculty,
      subject: row.subject,
    })
    .then((exists) => {
      if (!exists) {
        frappe.model.set_value(row.doctype, row.name, 'faculty', '')
      }
    })
}

function clear_invalid_subject(row) {
  if (!row.faculty || !row.subject) {
    return
  }
  frappe.db
    .exists('Course Subject', {
      parenttype: 'Faculty',
      parent: row.faculty,
      subject: row.subject,
    })
    .then((exists) => {
      if (!exists) {
        frappe.model.set_value(row.doctype, row.name, 'subject', '')
      }
    })
}

function show_scheduling_result(result) {
  const {
    subject_schedules = [],
    subject_schedules_errors = [],
    rescheduled = [],
    reschedule_errors = [],
  } = result
  const sections = []

  if (subject_schedules.length) {
    sections.push(
      table_section(
        __('Following subject schedules were created'),
        [__('Schedule'), __('Subject'), __('Date')],
        subject_schedules.map(
          (c) => `
						<tr>
							<td><a href="/app/subject-schedule/${c.name}">${c.name}</a></td>
							<td>${frappe.utils.escape_html(c.subject || '')}</td>
							<td>${c.schedule_date}</td>
						</tr>
					`
        )
      )
    )
  }

  if (subject_schedules_errors.length) {
    sections.push(
      table_section(
        __('These slots were skipped because of an overlap'),
        [__('Subject'), __('Faculty'), __('Date')],
        subject_schedules_errors.map(
          (c) => `
						<tr>
							<td>${frappe.utils.escape_html(c.subject || '')}</td>
							<td>${frappe.utils.escape_html(c.faculty || '')}</td>
							<td>${c.date}</td>
						</tr>
					`
        )
      )
    )
  }

  if (rescheduled.length) {
    sections.push(
      table_section(
        __('These existing schedules were removed for reschedule'),
        [__('Schedule')],
        rescheduled.map(
          (name) => `<tr><td>${frappe.utils.escape_html(name)}</td></tr>`
        )
      )
    )
  }

  if (reschedule_errors.length) {
    sections.push(
      table_section(
        __('These existing schedules could not be removed'),
        [__('Schedule')],
        reschedule_errors.map(
          (name) => `<tr><td>${frappe.utils.escape_html(name)}</td></tr>`
        )
      )
    )
  }

  if (!sections.length) {
    frappe.msgprint(__('No subject schedules were created'))
    return
  }

  frappe.msgprint({
    title: __('Subject Scheduling'),
    indicator: subject_schedules.length ? 'green' : 'orange',
    message: sections.join(''),
  })
}

function table_section(caption, headers, rows) {
  return `
		<table class="table table-bordered">
			<caption>${caption}</caption>
			<thead><tr>${headers
        .map((header) => `<th>${header}</th>`)
        .join('')}</tr></thead>
			<tbody>
				${rows.join('')}
			</tbody>
		</table>
	`
}
