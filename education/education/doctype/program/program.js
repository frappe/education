// Copyright (c) 2015, Frappe Technologies and contributors
// For license information, please see license.txt

frappe.ui.form.on('Program Course', {
	courses_add: function(frm){
		frm.fields_dict['courses'].grid.get_field('course').get_query = function(doc){
			var courses_list = [];
			$.each(doc.courses, function(idx, val){
				if (val.course) courses_list.push(val.course);
			});
			return { filters: [['Course', 'name', 'not in', courses_list]] };
		};
	}
});
