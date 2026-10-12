// Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on('Hostel Room', {
  setup(frm) {
    frm.set_query('hostel', () => ({ filters: { disabled: 0 } }))
    // Buildings on the hostel's campus, found from the hostel itself.
    frm.set_query('building', () => ({
      query: 'education.education.doctype.building.building.building_query',
      filters: { hostel: frm.doc.hostel },
    }))
    education.setup_facility_query(frm)
  },

  onload(frm) {
    if (frm.is_new() && frm.doc.hostel && !frm.doc.building) {
      set_default_building(frm)
    }
  },

  hostel(frm) {
    set_default_building(frm)
  },
})

// A new room starts in the hostel's default building.
function set_default_building(frm) {
  if (!frm.doc.hostel) {
    frm.set_value('building', '')
    return
  }
  const hostel = frm.doc.hostel
  frappe.db.get_value('Hostel', hostel, 'default_building').then((r) => {
    // Ignore a reply for a hostel that is no longer selected.
    if (frm.doc.hostel === hostel) {
      frm.set_value('building', r.message.default_building || '')
    }
  })
}
