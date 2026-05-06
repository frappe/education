frappe.ui.form.on('Author', {
  refresh(frm) {
    load_books(frm)
  },
})

function load_books(frm) {
  if (!frm.doc.name || frm.is_new()) return

  frappe.call({
    method: 'frappe.client.get_list',
    args: {
      doctype: 'Library Media',
      fields: ['name', 'title'],
      limit_page_length: 100,
    },
    callback: function (r) {
      let media_list = r.message || []

      let results = []

      let promises = media_list.map((m) => {
        return frappe.db.get_doc('Library Media', m.name)
      })

      Promise.all(promises).then((docs) => {
        docs.forEach((doc) => {
          ;(doc.authors || []).forEach((a) => {
            if (a.author === frm.doc.name) {
              results.push({
                parent: doc.name,
                title: doc.title,
                role: a.role,
              })
            }
          })
        })

        if (!results.length) {
          frm
            .get_field('books_written')
            .$wrapper.html(
              `<p style="color: grey;">No media found for this author</p>`
            )
          return
        }

        let html = `
                    <table class="table table-bordered">
                        <thead>
                            <tr>
                                <th>Media</th>
                                <th>Role</th>
                            </tr>
                        </thead>
                        <tbody>
                `

        results.forEach((row) => {
          html += `
                        <tr>
                            <td>
                                <a href="/app/library-media/${row.parent}">
                                    ${row.title || row.parent}
                                </a>
                            </td>
                            <td>${row.role || '—'}</td>
                        </tr>
                    `
        })

        html += `</tbody></table>`

        frm.get_field('books_written').$wrapper.html(html)
      })
    },
  })
}
