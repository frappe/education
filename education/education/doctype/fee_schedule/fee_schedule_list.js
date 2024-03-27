frappe.listview_settings['Fee Schedule'] = {
	add_fields: ["status", "due_date", "grand_total"],
	get_indicator: function (doc) {
		const status_colors = {
			"Draft": "orange",
			"Sales Invoice Creation Pending": "orange",
			"Sales Order Creation Pending": "orange",
			"In Process": "orange",
			"Sales Invoice Created": "green",
			"Sales Order Created": "green",
			"Fee Creation Failed": "red",
		}

		return [__(doc.status), status_colors[doc.status], "status,=," + doc.status];
	}
};
