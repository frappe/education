// Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on('Library Media', {
  refresh(frm) {
    load_media_copies(frm)
    toggle_copy_fields(frm)
    frm.add_custom_button('Scan ISBN', () => {
      open_isbn_scanner(frm)
    })
  },
  isbn(frm) {
    if (frm.doc.isbn) {
      frm.set_value('isbn', frm.doc.isbn.replace(/-/g, ''))
    }
  },
  auto_create_copies(frm) {
    toggle_copy_fields(frm)
  },
})

function toggle_copy_fields(frm) {
  if (frm.doc.auto_create_copies) {
    frm.set_df_property('default_copy_count', 'hidden', 0)
    frm.set_df_property('default_copy_count', 'reqd', 1)

    frm.set_df_property(
      'default_copy_count',
      'description',
      'Number of copies to auto-create when media is added'
    )
    frm.set_df_property('default_copy_count', 'default', 1)
  } else {
    frm.set_df_property('default_copy_count', 'hidden', 1)
    frm.set_df_property('default_copy_count', 'reqd', 0)

    frm.set_value('default_copy_count', 0)
  }
}

function load_media_copies(frm) {
  frappe.call({
    method: 'frappe.client.get_list',
    args: {
      doctype: 'Media Copy',
      filters: {
        media: frm.doc.name,
      },
      fields: ['name', 'media_title', 'edition_number', 'format', 'status'],
      order_by: 'edition_number desc',
    },
    callback: function (r) {
      let rows = r.message || []

      let html = `
                <h4>Media Copies Timeline</h4>
                <table class="table table-bordered">
                    <thead>
                        <tr>
                            <th>Edition</th>
                            <th>Title</th>
                            <th>Format</th>
                            <th>Status</th>

                        </tr>
                    </thead>
                    <tbody>
            `

      rows.forEach((c) => {
        html += `
                    <tr>
                        <td> <a href="/app/media-copy/${c.name}">
                                ${c.edition_number || c.name}
                            </a></td>
                        <td>${c.media_title || '-'}</td>
                        <td>${c.format || '-'}</td>
                        <td>${c.status || '-'}</td>

                    </tr>
                `
      })

      html += `</tbody></table>`

      frm.get_field('media_copy_timeline').$wrapper.html(html)
    },
  })
}

function open_isbn_scanner(frm) {
  let dialog = new frappe.ui.Dialog({
    title: 'Scan ISBN Barcode',
    fields: [
      {
        fieldtype: 'HTML',
        fieldname: 'scanner',
      },
      {
        fieldtype: 'Int',
        fieldname: 'copy_count',
        label: 'Number of Copies',
        default: 1,
      },
      {
        fieldtype: 'Check',
        fieldname: 'auto_create',
        label: 'Auto-create copies',
        default: 0,
      },
    ],
  })

  dialog.show()
  dialog.fields_dict.auto_create.$input.on('change', function () {
    let checked = dialog.get_value('auto_create')

    dialog.set_df_property('copy_count', 'hidden', !checked)

    if (!checked) {
      dialog.set_value('copy_count', 0)
    }
  })

  setTimeout(() => {
    const wrapper = dialog.fields_dict.scanner.$wrapper

    wrapper.html(`
            <div id="reader" style="width:100%;"></div>
        `)

    const readerElement = document.getElementById('reader')

    if (!readerElement) {
      frappe.msgprint('Scanner UI failed to load')
      return
    }

    const scanner = new Html5Qrcode('reader')

    Html5Qrcode.getCameras()
      .then((devices) => {
        if (!devices.length) {
          frappe.msgprint('No camera found')
          return
        }

        scanner.start(devices[0].id, { fps: 10, qrbox: 250 }, (decodedText) => {
          scanner.stop()
          dialog.hide()

          process_isbn_workflow(frm, decodedText, dialog.get_values())
        })
      })
      .catch((err) => {
        frappe.msgprint('Camera error: ' + err)
      })
  }, 300)
}

async function process_isbn_workflow(frm, isbn, scan_values) {
  isbn = isbn.replace(/-/g, '').trim()

  // 1. check if exists
  let existing = await frappe.db.get_list('Library Media', {
    filters: { isbn },
    fields: ['name'],
  })

  if (existing.length) {
    frappe.set_route('Form', 'Library Media', existing[0].name)
    return
  }

  // 2. fetch book data
  let book = await fetch_book_data(isbn)

  if (!book) {
    frappe.msgprint('No book found for this ISBN')
    return
  }

  // 3. create everything
  await create_full_library_record(book, isbn, scan_values)

  frappe.msgprint('Book successfully added to library!')
}

async function fetch_book_data(isbn) {
  let res = await fetch(
    `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`
  )

  let data = await res.json()

  if (!data.items) return null

  let info = data.items[0].volumeInfo

  return {
    title: info.title,
    publisher: info.publisher,
    published_date: info.publishedDate,
    authors: info.authors || [],
  }
}
async function create_full_library_record(book, isbn) {
  // 1. Create or fetch publisher
  let publisher_name = book.publisher || 'Unknown'

  let publisher = await ensure_doc('Publisher', 'name', publisher_name)

  // 2. Create Library Media
  let media = await frappe.call({
    method: 'frappe.client.insert',
    args: {
      doc: {
        doctype: 'Library Media',
        title: book.title,
        isbn: isbn,
        publisher: publisher_name,
        publication_date: book.published_date,
      },
    },
  })

  let media_name = media.message.name

  // 3. Create authors
  for (let author_name of book.authors) {
    let author = await ensure_doc('Author', 'name', author_name)

    await frappe.call({
      method: 'frappe.client.insert',
      args: {
        doc: {
          doctype: 'Library Media Author',
          parent: media_name,
          parenttype: 'Library Media',
          parentfield: 'authors',
          author: author_name,
          role: 'Author',
        },
      },
    })
  }

  if (scan_values && scan_values.auto_create) {
    await frappe.call({
      method: 'library.api.create_copies',
      args: {
        media: media_name,
        count: scan_values.copy_count || 1,
        force: 0,
      },
    })
  }
  frappe.set_route('Form', 'Library Media', media_name)
}

async function ensure_doc(doctype, field, value) {
  let res = await frappe.db.get_list(doctype, {
    filters: { [field]: value },
    fields: ['name'],
  })

  if (res.length) return res[0]

  let created = await frappe.call({
    method: 'frappe.client.insert',
    args: {
      doc: {
        doctype,
        [field]: value,
      },
    },
  })

  return created.message
}
