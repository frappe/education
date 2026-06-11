// Copyright (c) 2016, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on('Student Applicant', {
  refresh: function (frm) {
    frm.set_query('academic_term', function () {
      return {
        filters: {
          academic_year: frm.doc.academic_year,
        },
      }
    })

    frm.set_query('admission_register', function () {
      return {
        filters: {
          docstatus: 1,
        },
      }
    })

    frm.set_query('course', function () {
      if (frm.doc.admission_based_on === 'Program') {
        return {
          filters: {
            name: ['in', frm._register_courses || []],
          },
        }
      }
      return {}
    })

    frm.trigger('fetch_register_courses')
    frm.trigger('toggle_email_mandatory')
    frm.trigger('setup_actions')
  },

  setup_actions: function (frm) {
    if (frm.is_new()) return

    const status = frm.doc.application_status

    if (status === 'Applied' || status === 'Rejected') {
      frm.add_custom_button(
        __('Approve'),
        function () {
          frm.call('approve').then(() => frm.reload_doc())
        },
        'Actions'
      )
    }

    if (status === 'Applied' || status === 'Approved') {
      frm.add_custom_button(
        __('Reject'),
        function () {
          frm.set_value('application_status', 'Rejected')
          frm.save_or_update()
        },
        'Actions'
      )
    }

    if (status === 'Approved' && frm.doc.admission_based_on === 'Program') {
      frm
        .add_custom_button(__('Enroll in Program'), function () {
          frm.call('enroll_in_program').then((r) => {
            if (r.message) {
              frappe.msgprint(
                __(
                  'Program Enrollment {0} created and student enrolled in course.',
                  [
                    `<a href="/app/program-enrollment/${r.message}">${r.message}</a>`,
                  ]
                )
              )
            }
            frm.reload_doc()
          })
        })
        .addClass('btn-primary')
    }

    // NOTE: SEPARATE ENROLLMENT FOR COURSE AND PROGRAM

    if (status === 'Approved' && frm.doc.admission_based_on === 'Course') {
      frm
        .add_custom_button(__('Enroll in Program'), function () {
          frm.call('enroll_in_program').then((r) => {
            if (r.message) {
              frappe.msgprint(
                __(
                  'Program Enrollment {0} created and student enrolled in course.',
                  [
                    `<a href="/app/program-enrollment/${r.message}">${r.message}</a>`,
                  ]
                )
              )
            }
            frm.reload_doc()
          })
        })
        .addClass('btn-primary')
    }
  },

  admission_register: function (frm) {
    frm.set_value('course', null)
    frm._register_courses = []

    if (!frm.doc.admission_register) return

    frm.call('get_admission_register_details').then((r) => {
      const details = r.message
      if (!details) return

      frm.set_value('admission_based_on', details.admission_based_on)
      frm.set_value('academic_year', details.academic_year)
      frm.set_value('registration_fee', details.registration_fee)
      frm.set_value('registration_fee_item', details.registration_fee_item)

      if (details.admission_based_on === 'Course') {
        frm.set_value('course', details.course)
      } else if (details.admission_based_on === 'Program') {
        frm._register_courses = details.courses || []
      }
    })
  },

  fetch_register_courses: function (frm) {
    if (
      frm.doc.admission_register &&
      frm.doc.admission_based_on === 'Program'
    ) {
      frappe.db
        .get_doc('Admission Register', frm.doc.admission_register)
        .then((register) => {
          frm._register_courses = (register.courses || []).map(
            (row) => row.course
          )
        })
    }
  },

  toggle_email_mandatory: function (frm) {
    frappe.db
      .get_single_value('Education Settings', 'user_creation_skip')
      .then((user_creation_skip) => {
        frm.set_df_property(
          'email_address',
          'reqd',
          cint(user_creation_skip) ? 0 : 1
        )
      })
  },
})
