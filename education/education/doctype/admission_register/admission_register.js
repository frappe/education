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
    if (frm.doc.admission_based_on === 'Program') {
      frm.set_query('course', 'courses', function () {
        return {
          filters: {
            program: frm.doc.program,
            company: frm.doc.company,
          },
        }
      })
    }
  },
})
