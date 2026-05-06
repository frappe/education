// Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on('Media Copy', {
    refresh(frm) {
        if (!frm.doc.media) return;

        frappe.db.get_doc('Library Media', frm.doc.media).then(media => {

            let authors = (media.authors || [])
                .map(a => a.author)
                .join(', ');

          let html = `
            <div class="card" style="padding:10px;">
                <h5>Authors</h5>
                <ul>
                    ${(media.authors || []).map(a => `<li>${a.author}</li>`).join('')}
                </ul>
            </div>
        `;

            frm.get_field('authors_display').$wrapper.html(html);
        });
    }
});