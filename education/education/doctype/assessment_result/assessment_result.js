// Copyright (c) 2016, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on('Assessment Result', {
  onload: function (frm) {
    frm.set_query('assessment_plan', function () {
      return {
        filters: {
          docstatus: 1,
        },
      }
    })
  },

  score: function (frm) {
    if (!frm.doc.maximum_score || !frm.doc.grading_scale) {
      return
    }

    if (frm.doc.score > frm.doc.maximum_score) {
      frm.set_value('score', frm.doc.maximum_score)
      frappe.throw(__('Score cannot be greater than Maximum Score'))
    }

    frappe.call({
      method: 'education.education.api.get_grade',
      args: {
        grading_scale: frm.doc.grading_scale,
        percentage: (frm.doc.score / frm.doc.maximum_score) * 100,
      },
      callback: function (r) {
        if (r.message) {
          frm.set_value('grade', r.message)
        }
      },
    })
  },
})
