// Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on('Room Booking', {
  refresh(frm) {
    // if (!frm.is_new() && frm.doc.room) {
    //   frm.add_custom_button(__('Room Occupancy'), () => {
    //     frappe.set_route('query-report', 'Room Occupancy', {
    //       room: frm.doc.room,
    //       from_date: frm.doc.schedule_date,
    //       to_date: frm.doc.schedule_date,
    //     })
    //   })
    // }
  },
})
