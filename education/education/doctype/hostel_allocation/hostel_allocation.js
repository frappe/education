// Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on('Hostel Allocation', {
  setup(frm) {
    // Only hostels of the academic year's company.
    frm.set_query('hostel', () => {
      const filters = { disabled: 0 }
      if (frm.academic_year_company) {
        filters.company = frm.academic_year_company
      }
      return { filters }
    })
    frm.set_query('hostel_room', () => ({
      filters: { hostel: frm.doc.hostel, disabled: 0 },
    }))
    frm.set_query('hostel_bed', () => ({
      filters: {
        hostel_room: frm.doc.hostel_room,
        status: ['in', ['Vacant', 'Reserved']],
      },
    }))
    frm.set_query('academic_term', () => ({
      filters: { academic_year: frm.doc.academic_year },
    }))
  },

  onload(frm) {
    if (frm.is_new()) {
      frm.clear_table('invoices')
    }
    set_academic_year_company(frm)
  },

  refresh(frm) {
    const summary = frm.doc.__onload && frm.doc.__onload.billing_summary
    if (summary && summary.billed) {
      frm.dashboard.add_indicator(
        __('Billed: {0}', [format_currency(summary.billed, summary.currency)]),
        'blue'
      )
      frm.dashboard.add_indicator(
        __('Outstanding: {0}', [
          format_currency(summary.outstanding, summary.currency),
        ]),
        summary.outstanding > 0 ? 'orange' : 'green'
      )
    }

    if (frm.doc.docstatus === 1 && frm.doc.status === 'Active') {
      const today = frappe.datetime.get_today()
      if (frm.doc.to_date && frm.doc.to_date <= today) {
        frm.dashboard.set_headline_alert(
          __(
            'The planned check-out was {0}. The bed stays held until the student is checked out.',
            [frappe.datetime.str_to_user(frm.doc.to_date)]
          ),
          'orange'
        )
      }
      if (frm.doc.from_date <= today) {
        frm.add_custom_button(__('Check Out'), () => check_out(frm))
      }
    }
  },

  academic_year(frm) {
    frm.set_value('academic_term', '')
    set_academic_year_company(frm).then(() => {
      if (!frm.doc.hostel || !frm.academic_year_company) {
        return
      }
      frappe.db.get_value('Hostel', frm.doc.hostel, 'company').then((r) => {
        if (r.message.company !== frm.academic_year_company) {
          frm.set_value('hostel', '')
        }
      })
    })
    set_stay_dates(frm)
    set_rent(frm)
  },

  academic_term(frm) {
    set_stay_dates(frm)
    set_rent(frm)
  },

  hostel(frm) {
    frm.set_value('hostel_room', '')
    frm.set_value('hostel_bed', '')
    if (frm.doc.hostel) {
      frappe.db
        .get_value('Hostel', frm.doc.hostel, 'fee_category')
        .then((r) => frm.set_value('fee_category', r.message.fee_category))
    }
    set_rent(frm)
  },

  hostel_room(frm) {
    frm.set_value('hostel_bed', '')
    set_rent(frm)
  },
})

function check_out(frm) {
  frappe.prompt(
    [
      {
        fieldname: 'vacated_on',
        fieldtype: 'Date',
        label: __('Checked Out On'),
        default: frappe.datetime.get_today(),
        reqd: 1,
      },
      {
        fieldname: 'remarks',
        fieldtype: 'Small Text',
        label: __('Remarks'),
        description: __('For example, the room condition or keys returned.'),
      },
    ],
    (values) => frm.call('check_out', values).then(() => frm.reload_doc()),
    __('Check Out {0}', [frm.doc.student_name || frm.doc.student]),
    __('Check Out')
  )
}

// Remember the academic year's company, which the Hostel list is filtered by.
function set_academic_year_company(frm) {
  if (!frm.doc.academic_year) {
    frm.academic_year_company = null
    return Promise.resolve()
  }
  return frappe.db
    .get_value('Academic Year', frm.doc.academic_year, 'company')
    .then((r) => {
      frm.academic_year_company = r.message.company
    })
}

// The stay defaults to the academic period, starting today if the period is under way.
function set_stay_dates(frm) {
  const [doctype, name, start, end] = frm.doc.academic_term
    ? [
        'Academic Term',
        frm.doc.academic_term,
        'term_start_date',
        'term_end_date',
      ]
    : [
        'Academic Year',
        frm.doc.academic_year,
        'year_start_date',
        'year_end_date',
      ]
  if (!name) {
    return
  }
  frappe.db.get_value(doctype, name, [start, end]).then((r) => {
    const period = r.message || {}
    const today = frappe.datetime.get_today()
    const in_period = period[start] <= today && today <= period[end]
    frm.set_value('from_date', in_period ? today : period[start])
    frm.set_value('to_date', period[end])
  })
}

// Rent per term, or per year when the year has no terms; the room's rate wins over the hostel's.
function set_rent(frm) {
  if (!frm.doc.hostel || !frm.doc.academic_year) {
    return
  }
  frappe
    .call({
      method:
        'education.education.doctype.hostel_allocation.hostel_allocation.get_default_rent',
      args: {
        hostel: frm.doc.hostel,
        hostel_room: frm.doc.hostel_room,
        academic_year: frm.doc.academic_year,
        academic_term: frm.doc.academic_term,
      },
    })
    .then((r) => frm.set_value('rent', r.message || 0))
}
