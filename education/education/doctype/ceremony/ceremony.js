// Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

function setup_unique_child_filter(
  frm,
  table_field,
  link_field,
  target_doctype
) {
  frm.fields_dict[table_field].grid.get_field(link_field).get_query = function (
    doc
  ) {
    const selected_values = (doc[table_field] || [])
      .map((row) => row[link_field])
      .filter(Boolean)

    return {
      filters: [[target_doctype, 'name', 'not in', selected_values]],
    }
  }
}

frappe.ui.form.on('Ceremony Program', {
  programs_add(frm) {
    setup_unique_child_filter(frm, 'programs', 'program', 'Program')
  },
})

frappe.ui.form.on('Ceremony Document Item', {
  student_documents_add(frm) {
    setup_unique_child_filter(
      frm,
      'student_documents',
      'ceremony_document',
      'Ceremony Document'
    )
  },

  guest_documents_add(frm) {
    setup_unique_child_filter(
      frm,
      'guest_documents',
      'ceremony_document',
      'Ceremony Document'
    )
  },
})
