// Copyright (c) 2016, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on('Student Batch Name', {
  refresh: function (frm) {
    if (!frm.is_new()) {
      frm.add_custom_button(__('Students'), function () {
        frappe.set_route('List', 'Course Enrollment', {
          student_batch: frm.doc.name,
          docstatus: 1,
        })
      })
    }
  },
})
