// Copyright (c) 2018, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on('Course Enrollment', {
  refresh: function (frm) {
    frm.set_query('admission_register', function () {
      return {
        filters: {
          docstatus: 1,
          status: ['in', ['Admission Open', 'Closed']],
        },
      }
    })

    frm.set_query('course', function () {
      return {
        filters: {
          name: ['in', frm._allowed_courses || []],
        },
      }
    })

    frm.set_query('student_batch', function () {
      return {
        filters: {
          course: frm.doc.course,
          disabled: 0,
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

    frm.trigger('fetch_allowed_courses')
    frm.trigger('setup_billing_actions')
    frm.trigger('setup_subject_registration_action')
  },

  setup_subject_registration_action: function (frm) {
    if (frm.doc.docstatus !== 1) return

    frm.add_custom_button(__('Subject Registration'), function () {
      frappe
        .call({
          method:
            'education.education.doctype.subject_registration.subject_registration.get_subject_registration',
          args: { course_enrollment: frm.doc.name },
        })
        .then((r) => {
          if (r.message) {
            frappe.set_route('Form', 'Subject Registration', r.message)
            return
          }
          frappe.new_doc('Subject Registration', {
            course_enrollment: frm.doc.name,
          })
        })
    })
  },

  setup_billing_actions: function (frm) {
    if (frm.doc.docstatus !== 1) return

    const retryable = ['Pending', 'Failed', 'Partially Invoiced']
    if (!retryable.includes(frm.doc.billing_status) && !frm.doc.billing_error)
      return

    frm
      .add_custom_button(__('Create / Retry Fee Plan'), function () {
        frm.call('create_or_retry_fee_plan').then((r) => {
          const result = r.message || {}
          if (result.billing_status === 'Created') {
            frappe.show_alert({
              message: __('Fee Plan and invoices are up to date.'),
              indicator: 'green',
            })
          }
          frm.reload_doc()
        })
      })
      .addClass('btn-primary')
  },

  course: function (frm) {
    frm.set_value('student_batch', null)
    frm.set_value('roll_number', null)
    frm.trigger('fetch_fee_term')
  },

  student_batch: function (frm) {
    if (!frm.doc.student_batch || frm.doc.roll_number) return

    frappe
      .call({
        method:
          'education.education.doctype.course_enrollment.course_enrollment.get_next_roll_number',
        args: { batch: frm.doc.student_batch },
      })
      .then((r) => {
        if (r.message && !frm.doc.roll_number) {
          frm.set_value('roll_number', r.message)
        }
      })
  },

  company: function (frm) {
    frm.set_value('admission_register', null)
    frm.set_value('fee_term', null)
    if (frm.doc.company) {
      frm.set_query('admission_register', function () {
        return {
          filters: {
            company: frm.doc.company,
            docstatus: 1,
            status: ['in', ['Admission Open', 'Closed']],
          },
        }
      })
    }
  },

  admission_register: function (frm) {
    frm.set_value('course', null)
    frm.trigger('fetch_allowed_courses')
  },

  student: function (frm) {
    frm.trigger('fetch_allowed_courses')
  },

  fetch_fee_term: function (frm) {
    if (!frm.doc.course) {
      frm.set_value('fee_term', null)
      return
    }

    frappe.db.get_value('Course', frm.doc.course, 'fee_term').then((r) => {
      frm.set_value('fee_term', (r.message && r.message.fee_term) || null)
    })
  },

  fetch_allowed_courses: function (frm) {
    frm._allowed_courses = []
    if (!frm.doc.admission_register) return

    frappe
      .call({
        method:
          'education.education.doctype.course_enrollment.course_enrollment.get_allowed_courses',
        args: {
          admission_register: frm.doc.admission_register,
          student: frm.doc.student,
        },
      })
      .then((r) => {
        frm._allowed_courses = r.message || []
      })
  },
})
