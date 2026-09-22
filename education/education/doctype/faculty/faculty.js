// Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on('Faculty', {
  refresh(frm) {
    frappe.db
      .get_single_value('Education Settings', 'user_creation_skip')
      .then((r) => {
        if (cint(r) !== 1) {
          frm.set_df_property('email_address', 'reqd', 1)
        }
      })
  },
})

frappe.ui.form.on('Course Subject', {
  subjects_add: function (frm) {
    allowed_departments = []
    if (frm.doc.allowed_departments) {
      frm.doc.allowed_departments.forEach((department) => {
        allowed_departments.push(department.department)
      })
    }
    frm.fields_dict['subjects'].grid.get_field('subject').get_query = function (
      doc
    ) {
      var subjects_list = []
      $.each(doc.subjects, function (idx, val) {
        if (val.subject) subjects_list.push(val.subject)
      })
      return {
        filters: [
          ['Subject', 'name', 'not in', subjects_list],
          ['Subject', 'department', 'in', allowed_departments],
        ],
      }
    }
  },
})
