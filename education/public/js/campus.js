// Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.provide('education')

const campus_required_when_present = ['Class Room', 'Room', 'Facility']

education.setup_campus_field = function (frm) {
  if (!frm.fields_dict.campus) {
    return
  }

  frm.set_query('campus', () => {
    const filters = { disabled: 0 }
    if (frm.doc.company) {
      filters.company = frm.doc.company
    }
    return { filters }
  })

  const company = frm.doc.company
  if (!company) {
    frm.toggle_display('campus', false)
    frm.toggle_reqd('campus', false)
    return
  }

  frappe.db.exists('Campus', { company, disabled: 0 }).then((name) => {
    const show = Boolean(name)
    const require_on_new =
      show &&
      frm.is_new() &&
      campus_required_when_present.includes(frm.doc.doctype)
    frm.toggle_display('campus', show)
    frm.toggle_reqd('campus', require_on_new)
  })
}

education.setup_schedule_campus = function (frm) {
  if (!frm.fields_dict.campus) {
    return
  }

  frappe.db.count('Campus', { filters: { disabled: 0 } }).then((count) => {
    frm.toggle_display('campus', count > 0 || Boolean(frm.doc.campus))
  })

  if (!frm.doc.room) {
    return
  }

  frappe.db.get_value('Room', frm.doc.room, 'campus').then((r) => {
    const room_campus = r && r.message && r.message.campus
    frm.set_df_property('campus', 'read_only', Boolean(room_campus))
  })
}

function bind_campus_forms() {
  for (const doctype of [
    'Class Room',
    'Room',
    'Facility',
    'Admission Register',
    'Course Enrollment',
    'Fees',
    'Fee Plan',
  ]) {
    frappe.ui.form.on(doctype, {
      onload(frm) {
        education.setup_campus_field(frm)
      },
      refresh(frm) {
        education.setup_campus_field(frm)
      },
      company(frm) {
        if (frm.doc.campus) {
          frm.set_value('campus', '')
        }
        education.setup_campus_field(frm)
      },
    })
  }

  for (const doctype of ['Subject Schedule', 'Assessment Plan']) {
    frappe.ui.form.on(doctype, {
      onload(frm) {
        education.setup_schedule_campus(frm)
        frm.set_query('room', () => ({
          query: 'education.education.doctype.room.room.room_query',
          filters: { campus: frm.doc.campus },
        }))
      },
      refresh(frm) {
        education.setup_schedule_campus(frm)
      },
      room(frm) {
        if (!frm.doc.room) {
          frm.set_df_property('campus', 'read_only', 0)
          return
        }
        frappe.db.get_value('Room', frm.doc.room, 'campus').then((r) => {
          const room_campus = r && r.message && r.message.campus
          if (room_campus) {
            frm.set_value('campus', room_campus)
          }
          frm.set_df_property('campus', 'read_only', Boolean(room_campus))
          education.setup_schedule_campus(frm)
        })
      },
    })
  }
}

bind_campus_forms()
