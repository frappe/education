// Copyright (c) 2023, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on('CBT', {
    validate: function (frm) {
        randString(frm);
		frm.events.check_duplicate_question(frm.doc.questions);
    },

	refresh: function (frm) {
		frm.add_custom_button(__('Preview CBT'), () => {
			window.open('/cbt/preview?code=' + frm.doc.preview_url, "_blank")
		});
		frm.add_custom_button(__('View Results'), () => {
			frappe.set_route("/app/cbt-activity/view/report/CBT Activity/cbt=" + frm.doc.name)
		});
	},

	check_duplicate_question: function(questions_data){
		var questions = [];
		questions_data.forEach(function(q){
			questions.push(q.question_link);
		});
		var questions_set = new Set(questions);
		if (questions.length != questions_set.size) {
			frappe.throw(__('The question cannot be duplicate'));
		}
	},


});

var randString = function (frm) {
    var s = "";
    var x = "";
    var today = new Date();
    var date = String(today.getFullYear()).substring(2, 4) + '' + (today.getMonth() + 1);
    var time = today.getHours() + "" + today.getMinutes();
    var dateTime = date + time;
    while (s.length < x && x > 0) {
        var r = Math.random();
        s += (r < 0.1 ? Math.floor(r * 100) : String.fromCharCode(Math.floor(r * 26) + (r > 0.5 ? 97 : 65)));
    }

    let  my_generated_string  = s.toUpperCase() + dateTime;
    frm.doc.preview_url  =  my_generated_string ;
}