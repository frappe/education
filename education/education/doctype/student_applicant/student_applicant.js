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
          company: frm.doc.company,
        },
      }
    })

    frm.set_query('fee_term', function () {
      return {
        filters: {
          docstatus: 1,
          company: frm.doc.company,
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

    frm.set_query('student_batch', function () {
      return {
        filters: {
          course: frm.doc.course,
        },
      }
    })

    frm.trigger('fetch_register_courses')
    frm.trigger('toggle_email_mandatory')
    frm.trigger('setup_actions')
  },

  company: function (frm) {
    if (frm.doc.company) {
      frm.set_query('admission_register', function () {
        return {
          filters: {
            company: frm.doc.company,
            docstatus: 1,
          },
        }
      })
    }

    frm.set_value('admission_register', null)
    frm.set_value('fee_term', null)
  },

  course: function (frm) {
    if (frm.doc.course) {
      frappe.db.get_value('Course', frm.doc.course, 'fee_term').then((r) => {
        frm.set_value('fee_term', (r.message && r.message.fee_term) || null)
      })

      frm.call('get_course_fee_amount').then((r) => {
        frm.set_value('course_fee_amount', r.message)
      })
    } else {
      frm.set_value('fee_term', null)
    }

    frm.set_value('student_batch', null)
    frm.set_query('student_batch', function () {
      return {
        filters: {
          course: frm.doc.course,
        },
      }
    })
  },

  setup_actions: function (frm) {
    if (frm.is_new()) return

    if (['Admitted', 'Approved'].includes(frm.doc.application_status)) {
      frm.disable_form()
    }

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

    if (
      (status === 'Approved' && frm.doc.admission_based_on === 'Course') ||
      (status === 'Approved' && frm.doc.admission_based_on === 'Program')
    ) {
      frm
        .add_custom_button(__('Enroll'), function () {
          frm.call('enroll_in_course').then((r) => {
            if (r.message) {
              frappe.msgprint(
                __(
                  'Course Enrollment {0} created and student enrolled in course.',
                  [
                    `<a href="/app/course-enrollment/${r.message}">${r.message}</a>`,
                  ]
                )
              )
            }
            frm.reload_doc()
          })
        })
        .addClass('btn-primary')
    }

    // if (status === 'Approved' && frm.doc.admission_based_on === 'Program') {
    //   frm
    //     .add_custom_button(__('Enroll in Program'), function () {
    //       frm.call('enroll_in_program').then((r) => {
    //         if (r.message) {
    //           frappe.msgprint(
    //             __(
    //               'Program Enrollment {0} created and student enrolled in course.',
    //               [
    //                 `<a href="/app/program-enrollment/${r.message}">${r.message}</a>`,
    //               ],
    //             ),
    //           )
    //         }
    //         frm.reload_doc()
    //       })
    //     })
    //     .addClass('btn-primary')
    // }

    // NOTE: SEPARATE ENROLLMENT FOR COURSE AND PROGRAM

    // if (status === 'Approved' && frm.doc.admission_based_on === 'Program') {
    //   frm
    //     .add_custom_button(__('Enroll'), function () {
    //       frm.call('enroll_in_program_and_course').then((r) => {
    //         if (r.message) {
    //           frappe.msgprint(
    //             __(
    //               'Program Enrollment {0} created and student enrolled in course.',
    //               [
    //                 `<a href="/app/-enrollment/${r.message}">${r.message}</a>`,
    //               ],
    //             ),
    //           )
    //         }
    //         frm.reload_doc()
    //       })
    //     })
    //     .addClass('btn-primary')
    // }
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
      frm.set_value('registration_fee_amount', details.registration_fee_amount)

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

  is_already_a_student: function (frm) {
    if (!frm.doc.is_already_a_student) {
      frm.set_value('student', '')
      frm.refresh_field('student')
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
