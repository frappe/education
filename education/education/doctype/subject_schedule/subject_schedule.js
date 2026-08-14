frappe.ui.form.on('Subject Schedule', {
  refresh: function (frm) {
    if (!frm.doc.__islocal) {
      frm.add_custom_button(__('Mark Attendance'), function () {
        frappe.route_options = {
          based_on: 'Subject Schedule',
          subject_schedule: frm.doc.name,
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
    frm.set_query('subject', function () {
      return {
        filters: {
          course: frm.doc.course,
        },
      }
    })
  },

  student_batch: function (frm) {
    if (frm.doc.subject) {
      frm.set_value('subject', '')
    }
  },
})
