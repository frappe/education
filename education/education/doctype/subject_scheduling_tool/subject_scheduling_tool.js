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
    frm.set_query('subject', 'slots', function () {
      return {
        filters: {
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
          const { subject_schedules } = r.message
          if (subject_schedules && subject_schedules.length > 0) {
            const subject_schedules_html = subject_schedules
              .map(
                (c) => `
							<tr>
								<td><a href="/app/subject-schedule/${c.name}">${c.name}</a></td>
								<td>${c.subject || ''}</td>
								<td>${c.schedule_date}</td>
							</tr>
						`
              )
              .join('')

            const html = `
							<table class="table table-bordered">
								<caption>${__('Following subject schedules were created')}</caption>
								<thead><tr><th>${__('Schedule')}</th><th>${__('Subject')}</th><th>${__(
              'Date'
            )}</th></tr></thead>
								<tbody>
									${subject_schedules_html}
								</tbody>
							</table>
						`

            frappe.msgprint(html)
          }
        })
    })
  },
})
