// Copyright (c) 2016, Frappe and contributors
// For license information, please see license.txt

frappe.ui.form.on('Program Enrollment', {
  onload: function (frm) {
    frm.fields_dict['fees'].grid.get_field('fee_schedule').get_query =
      function (doc, cdt, cdn) {
        var d = locals[cdt][cdn]
        return {
          filters: { academic_term: d.academic_term },
        }
      }
  },

  company: function (frm) {
    frm.set_value('program', null)
    if (frm.doc.company) {
      frm.set_query('program', function () {
        return {
          filters: {
            company: frm.doc.company,
          },
        }
      })
    }
  },

  program: function (frm) {
    frm.set_query('student_batch_name', function () {
      return {
        filters: {
          program: frm.doc.program,
          disabled: 0,
        },
      }
    })
  },
})
