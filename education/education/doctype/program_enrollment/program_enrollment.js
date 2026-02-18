// Copyright (c) 2016, Frappe and contributors
// For license information, please see license.txt

frappe.ui.form.on('Program Enrollment', {
  onload: function (frm) {
    frm.set_query('academic_term', function () {
      return {
        filters: {
          academic_year: frm.doc.academic_year,
        },
      }
    })

    frm.set_query('academic_term', 'fees', function () {
      return {
        filters: {
          academic_year: frm.doc.academic_year,
        },
      }
    })

    frm.fields_dict['fees'].grid.get_field('fee_schedule').get_query =
      function (doc, cdt, cdn) {
        var d = locals[cdt][cdn]
        return {
          filters: { academic_term: d.academic_term },
        }
      }


    // frm.set_query('student', function() {
    // 	return{
    // 		query: 'education.education.doctype.program_enrollment.program_enrollment.get_students',
    // 		filters: {
    // 			'academic_year': frm.doc.academic_year,
    // 			'academic_term': frm.doc.academic_term
    // 		}
    // 	}
    // });
  },

  refresh: function(frm) {
    if (!frm.program_courses?.length && frm.doc.program) {
      frm.events.set_program_courses(frm);
    }
  },

  program: function (frm) {
    frm.events.get_courses(frm)
    if (frm.doc.program) {
      frappe.call({
        method: 'education.education.api.get_fee_schedule',
        args: {
          program: frm.doc.program,
          student_category: frm.doc.student_category,
        },
        callback: function (r) {
          if (r.message) {
            frm.set_value('fees', r.message)
            frm.events.get_courses(frm)
          }
        },
      })
    }
  },

  student_category: function () {
    frappe.ui.form.trigger('Program Enrollment', 'program')
  },

  get_courses: function (frm) {
    frm.program_courses = []
    frm.set_value('courses', [])
    frappe.call({
      method: 'get_courses',
      doc: frm.doc,
      callback: function (r) {
        if (r.message) {
          frm.program_courses = r.message
          frm.set_value('courses', r.message)
          frm.refresh_field('courses')
        }
      },
    })
  },

  set_program_courses:function(frm) {
    frm.program_courses = [];
    frappe.call({
      method: 'get_courses',
      doc: frm.doc,
      callback: function(r) {
        if (r.message) {
          frm.program_courses = r.message
        }
      }
    })
  },
})

frappe.ui.form.on('Program Enrollment Course', {
  courses_add: function (frm) {
    frm.fields_dict['courses'].grid.get_field('course').get_query = function (
      doc
    ) {
      var course_list = []
      $.each(frm.doc.courses || [], function (_idx, val) {
        if (val.course) course_list.push(val.course)
      })

      let program_courses = (frm.program_courses || []).map(e => e.course)

      if (!program_courses.length) {
				return { filters: [['Course', 'name', 'not in', course_list]] };
      } else {
				return { filters: [['Course', 'name', 'not in', course_list],
					['Course', 'name', 'in', program_courses]] }
      }
    }
  },
})
