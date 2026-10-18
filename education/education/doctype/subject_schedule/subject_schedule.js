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
    set_subject_query(frm)
    set_faculty_query(frm)
  },

  student_batch: function (frm) {
    if (frm.doc.subject) {
      frm.set_value('subject', '')
    }
    set_subject_query(frm)
    set_faculty_query(frm)
  },

  subject: function (frm) {
    set_faculty_query(frm)
    if (frm.doc.faculty && frm.doc.subject) {
      frappe.db
        .exists('Course Subject', {
          parenttype: 'Faculty',
          parent: frm.doc.faculty,
          subject: frm.doc.subject,
        })
        .then((exists) => {
          if (!exists) {
            frm.set_value('faculty', '')
          }
        })
    }
  },

  faculty: function (frm) {
    set_subject_query(frm)
    if (frm.doc.faculty && frm.doc.subject) {
      frappe.db
        .exists('Course Subject', {
          parenttype: 'Faculty',
          parent: frm.doc.faculty,
          subject: frm.doc.subject,
        })
        .then((exists) => {
          if (!exists) {
            frm.set_value('subject', '')
          }
        })
    }
  },
})

function set_subject_query(frm) {
  frm.set_query('subject', function () {
    if (frm.doc.faculty) {
      return {
        query: 'education.education.doctype.faculty.faculty.subject_query',
        filters: {
          faculty: frm.doc.faculty,
          course: frm.doc.course,
        },
      }
    }
    return {
      filters: {
        course: frm.doc.course,
      },
    }
  })
}

function set_faculty_query(frm) {
  frm.set_query('faculty', function () {
    return {
      query: 'education.education.doctype.faculty.faculty.faculty_query',
      filters: {
        subject: frm.doc.subject,
        course: frm.doc.course,
      },
    }
  })
}
