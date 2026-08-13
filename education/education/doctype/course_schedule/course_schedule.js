frappe.ui.form.on('Course Schedule', {
  refresh: function (frm) {
    if (!frm.doc.__islocal) {
      frm.add_custom_button(__('Mark Attendance'), function () {
        frappe.route_options = {
          based_on: 'Course Schedule',
          course_schedule: frm.doc.name,
        }
        frappe.set_route('Form', 'Student Attendance Tool')
      })
    }
  },

  onload: (frm) => {
    frm.set_query('student_batch', function () {
      return {
        filters: {
          disabled: 0,
        },
      }
    })
  },
})
