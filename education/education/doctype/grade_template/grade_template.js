// Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on('Grade Template', {
  setup: function (frm) {
    frm.set_query('academic_year', function () {
      return {
        filters: {
          company: frm.doc.company,
        },
      }
    })

    frm.set_query('academic_term', function () {
      return {
        filters: {
          academic_year: frm.doc.academic_year,
          company: frm.doc.company,
        },
      }
    })

    // frm.set_query('assignment_type', 'assignment_weights', function () {
    //   return {
    //     filters: {
    //       company: frm.doc.company,
    //     },
    //   }
    // })
  },

  company: function (frm) {
    if (frm.doc.academic_year) {
      frm.set_value('academic_year', '')
    }
    if (frm.doc.academic_term) {
      frm.set_value('academic_term', '')
    }
  },

  academic_year: function (frm) {
    if (frm.doc.academic_term) {
      frm.set_value('academic_term', '')
    }
  },

  weightage_type: function (frm) {
    if (frm.doc.weightage_type === 'Assignment Type Weightage') {
      frm.clear_table('attendance_weights')
      frm.refresh_field('attendance_weights')
    } else if (frm.doc.weightage_type === 'Attendance Weightage') {
      frm.clear_table('assignment_weights')
      frm.refresh_field('assignment_weights')
    }
  },
})
