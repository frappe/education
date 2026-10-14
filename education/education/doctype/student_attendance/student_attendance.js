// Copyright (c) 2016, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on('Student Attendance', {
  setup: function (frm) {
    frm.add_fetch('course_schedule', 'schedule_date', 'date')
    frm.add_fetch('course_schedule', 'student_group', 'student_group')
  },
})
