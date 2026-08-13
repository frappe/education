// Copyright (c) 2016, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on('Assessment Plan', {
  onload: function (frm) {
    frm.set_query('assessment_group', function (doc, cdt, cdn) {
      return {
        filters: {
          is_group: 0,
        },
      }
    })
    frm.set_query('grading_scale', function () {
      return {
        filters: {
          docstatus: 1,
        },
      }
    })
    frm.set_query('subject', function () {
      return {
        filters: {
          course: frm.doc.course,
        },
      }
    })
  },

  refresh: function (frm) {
    if (frm.doc.docstatus == 1) {
      frm.add_custom_button(
        __('Assessment Result Tool'),
        function () {
          frappe.route_options = {
            assessment_plan: frm.doc.name,
            student_batch: frm.doc.student_batch,
          }
          frappe.set_route('Form', 'Assessment Result Tool')
        },
        __('Tools')
      )
    }

    frm.set_query('course', function () {
      return {
        query:
          'education.education.doctype.program_enrollment.program_enrollment.get_program_courses',
        filters: {
          program: frm.doc.program,
        },
      }
    })

    frm.set_query('academic_term', function () {
      return {
        filters: {
          academic_year: frm.doc.academic_year,
        },
      }
    })
  },

  course: function (frm) {
    if (frm.doc.subject) {
      frm.set_value('subject', '')
    }
  },
})
