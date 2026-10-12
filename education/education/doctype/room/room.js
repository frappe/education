// Copyright (c) 2015, Frappe Technologies and contributors
// For license information, please see license.txt

frappe.ui.form.on('Room', {
  setup(frm) {
    education.setup_facility_query(frm)
    frm.set_query('building', () => {
      const filters = { disabled: 0, building_type: 'Academic' }
      if (frm.doc.company) {
        filters.company = frm.doc.company
      }
      if (frm.doc.campus) {
        filters.campus = frm.doc.campus
      }
      return { filters }
    })
  },

  refresh(frm) {
    toggle_location(frm)
  },

  building(frm) {
    toggle_location(frm)
    if (!frm.doc.building) {
      return
    }
    // The room takes its site from the building.
    frappe.db
      .get_value('Building', frm.doc.building, ['company', 'campus'])
      .then((r) => {
        const building = r.message || {}
        return frm
          .set_value('company', building.company)
          .then(() => frm.set_value('campus', building.campus))
      })
  },
})

function toggle_location(frm) {
  const from_building = Boolean(frm.doc.building)
  frm.set_df_property('company', 'read_only', from_building)
  frm.set_df_property('campus', 'read_only', from_building)
}
