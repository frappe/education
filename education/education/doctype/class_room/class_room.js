// Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

// frappe.ui.form.on("Class Room", {
// 	refresh(frm) {

// 	},
// });

frappe.ui.form.on('Class Room Facility', {
  facilities_add: function (frm) {
    frm.fields_dict['facilities'].grid.get_field('facility').get_query =
      function (doc) {
        var facilities_list = []
        $.each(doc.facilities, function (idx, val) {
          if (val.facility) facilities_list.push(val.facility)
        })
        return {
          query: 'education.education.doctype.facility.facility.facility_query',
          filters: {
            company: doc.company,
            campus: doc.campus,
            exclude: facilities_list,
          },
        }
      }
  },
})
