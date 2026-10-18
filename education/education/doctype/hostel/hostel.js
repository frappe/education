// Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on('Hostel', {
  setup(frm) {
    // Hostel buildings on this hostel's campus.
    frm.set_query('default_building', () => ({
      query: 'education.education.doctype.building.building.building_query',
      filters: { company: frm.doc.company, campus: frm.doc.campus || '' },
    }))
  },

  campus(frm) {
    frm.set_value('default_building', '')
  },

  refresh(frm) {
    render_buildings(frm)
    if (!frm.is_new()) {
      frm.add_custom_button(__('Hostel Occupancy'), () => {
        frappe.set_route('query-report', 'Hostel Occupancy', {
          hostel: frm.doc.name,
        })
      })
    }
  },
})

function render_buildings(frm) {
  const buildings = (frm.doc.__onload && frm.doc.__onload.buildings) || []
  const html = buildings.length
    ? buildings
        .map(
          (b) =>
            `<div><a href="/app/building/${encodeURIComponent(
              b.name
            )}">${frappe.utils.escape_html(
              b.building_name
            )}</a> <span class="text-muted">${__('{0} rooms', [
              b.rooms,
            ])}</span></div>`
        )
        .join('')
    : `<div class="text-muted">${__(
        'No rooms are placed in a building yet.'
      )}</div>`
  frm.get_field('buildings_html').$wrapper.html(html)
}
