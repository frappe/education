// Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on('Faculty', {
  refresh(frm) {
    set_course_subject_fields_read_only(frm)
    frappe.db
      .get_single_value('Education Settings', 'user_creation_skip')
      .then((r) => {
        if (cint(r) !== 1) {
          frm.set_df_property('email_address', 'reqd', 1)
        }
      })
  },
})

function set_course_subject_fields_read_only(frm) {
  const grid = frm.fields_dict.subjects.grid
  const skip_fieldtypes = ['Section Break', 'Column Break', 'Tab Break']
  grid.docfields.forEach((df) => {
    if (df.fieldname !== 'subject' && !skip_fieldtypes.includes(df.fieldtype)) {
      grid.update_docfield_property(df.fieldname, 'read_only', 1)
    }
  })
}

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
