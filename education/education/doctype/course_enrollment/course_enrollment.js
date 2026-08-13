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

    frm.set_query('student_batch', function () {
      return {
        filters: {
          course: frm.doc.course,
          disabled: 0,
        },
      }
    })

    frm.trigger('fetch_allowed_courses')
  },

  course: function (frm) {
    frm.set_value('student_batch', null)
  },

  company: function (frm) {
    frm.set_value('admission_register', null)
    if (frm.doc.company) {
      frm.set_query('admission_register', function () {
        return {
          filters: {
            company: frm.doc.company,
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
