// Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on('Ceremony Registration', {
  refresh(frm) {
    frm.set_query('ceremony', function () {
      return {
        filters: {
          docstatus: 1,
        },
      }
    })
  },

  ceremony(frm) {
    if (frm.doc.ceremony) {
      frappe.call({
        method:
          'education.education.doctype.ceremony.ceremony.get_allowed_programs',
        args: {
          ceremony: frm.doc.ceremony,
        },
        callback: function (r) {
          if (r.message) {
            frm.set_query('program', function () {
              return {
                filters: {
                  name: ['in', r.message],
                },
              }
            })
          }
        },
      })
    }
  },
})
