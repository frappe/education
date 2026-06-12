// Copyright (c) 2018, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on('Course Enrollment', {
  refresh: function (frm) {
    frm.set_query('admission_register', function () {
      return {
        filters: {
          docstatus: 1,
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

    frm.trigger('fetch_allowed_courses')
  },

  admission_register: function (frm) {
    frm.set_value('course', null)
    frm.trigger('fetch_allowed_courses')
  },

  student: function (frm) {
    frm.trigger('fetch_allowed_courses')
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
