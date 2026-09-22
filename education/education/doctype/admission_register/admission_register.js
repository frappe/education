// Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on('Admission Register', {
  refresh(frm) {
    if (frm.doc.company) {
      frm.set_query('course', function () {
        return {
          filters: {
            company: frm.doc.company,
          },
        }
      })
    }
    frm.trigger('set_course_filters')
    frm.trigger('setup_stage_actions')
    frm.trigger('set_academic_term_filter')
  },
  academic_year: function (frm) {
    frm.set_value('academic_term', null)
    frm.trigger('set_academic_term_filter')
  },
  company: function (frm) {
    if (frm.doc.company) {
      frm.set_query('course', function () {
        return {
          filters: {
            company: frm.doc.company,
          },
        }
      })
    }
    frm.trigger('set_course_filters')
  },
  course: function (frm) {
    if (frm.doc.course) {
      frm.call('get_course_details', { course: frm.doc }).then((r) => {
        if (r.message) {
          frm.set_value(
            'registration_fee_amount',
            r.message.registration_fee_amount
          )
          frm.set_value('registration_fee', r.message.registration_fee)
          frm.set_value(
            'registration_fee_item',
            r.message.registration_fee_item
          )
        }
      })
    }
  },

  program: function (frm) {
    frm.trigger('set_course_filters')
  },
  admission_based_on: function (frm) {
    if (frm.doc.admission_based_on === 'Program') {
      frm.clear_table('courses')
      frm.trigger('set_course_filters')
    }
  },

  set_course_filters(frm) {
    if (frm.doc.admission_based_on !== 'Program') return

    frm.set_query('course', 'courses', function (doc, cdt, cdn) {
      const selected_courses = (frm.doc.courses || [])
        .filter((row) => row.name !== cdn && row.course)
        .map((row) => row.course)

      const filters = [
        ['Course', 'program', '=', frm.doc.program],
        ['Course', 'company', '=', frm.doc.company],
      ]

      if (selected_courses.length) {
        filters.push(['Course', 'name', 'not in', selected_courses])
      }

      return { filters }
    })
  },

  setup_stage_actions(frm) {
    if (frm.doc.docstatus !== 1) return

    const call_and_reload = (method) => {
      frm.call(method).then(() => frm.reload_doc())
    }

    if (frm.doc.status === 'Submitted') {
      frm
        .add_custom_button(__('Publish'), () => call_and_reload('publish'))
        .addClass('btn-primary')
    }

    if (frm.doc.status === 'Published') {
      frm
        .add_custom_button(__('Start Admission'), () =>
          call_and_reload('start_admission')
        )
        .addClass('btn-primary')

      frm.add_custom_button(__('Unpublish'), () => call_and_reload('unpublish'))

      frm.add_custom_button(__('Close Admission'), () => {
        frappe.confirm(
          __(
            'Close this admission? Applicants will no longer be able to apply.'
          ),
          () => call_and_reload('close_admission')
        )
      })
    }

    if (frm.doc.status === 'Admission Open') {
      frm
        .add_custom_button(__('Close Admission'), () => {
          frappe.confirm(
            __(
              'Close this admission? Applicants will no longer be able to apply.'
            ),
            () => call_and_reload('close_admission')
          )
        })
        .addClass('btn-primary')
    }

    if (frm.doc.status === 'Closed') {
      frm.add_custom_button(__('Reopen Admission'), () =>
        call_and_reload('reopen_admission')
      )
    }
  },

  set_academic_term_filter(frm) {
    frm.set_query('academic_term', function () {
      return {
        filters: {
          academic_year: frm.doc.academic_year,
        },
      }
    })
  },
})
