frappe.listview_settings['Student Applicant'] = {
    add_fields: ['application_status'],
    get_indicator: function(doc) {
        if (doc.application_status === 'Admitted')
            return [__('Admitted'), 'green', 'application_status,=,Admitted'];
        if (doc.application_status === 'Approved')
            return [__('Approved'), 'blue', 'application_status,=,Approved'];
        if (doc.application_status === 'Rejected')
            return [__('Rejected'), 'red', 'application_status,=,Rejected'];
        return [__('Applied'), 'orange', 'application_status,=,Applied'];
    },
    onload: function(listview) {
        listview.page.add_action_item(__('Approve & Enroll'), function() {
            let selected = listview.get_checked_items();
            if (!selected.length) {
                frappe.msgprint({ title: 'No Students Selected',
                    message: 'Please select students first.',
                    indicator: 'orange' }); return;
            }
            let already = selected.filter(r =>
                ['Admitted','Approved'].includes(r.application_status));
            let toEnroll = selected.filter(r =>
                !['Admitted','Approved'].includes(r.application_status));
            if (!toEnroll.length) {
                frappe.msgprint({ title: 'Nothing to Process',
                    message: 'All selected are already enrolled.',
                    indicator: 'orange' }); return;
            }
            let msg = '<table style="width:100%;font-size:14px;border-collapse:collapse">';
            msg += '<tr style="background:#f5f5f5"><td style="padding:10px">Total selected</td><td><b>' + selected.length + '</b></td></tr>';
            msg += '<tr style="background:#fff8e1"><td style="padding:10px">Already enrolled (skip)</td><td><b style="color:orange">' + already.length + '</b></td></tr>';
            msg += '<tr style="background:#e8f5e9"><td style="padding:10px">Will be enrolled</td><td><b style="color:green">' + toEnroll.length + '</b></td></tr>';
            msg += '</table>';
            let confirmDialog = new frappe.ui.Dialog({
                title: 'Confirm Bulk Enrollment',
                fields: [{ fieldtype: 'HTML', options: msg }],
                primary_action_label: 'Yes, Enroll',
                primary_action: function() {
                    confirmDialog.hide();
                    frappe.show_progress('Enrolling Students...', 0, 100, 'Starting...');
                    frappe.call({
                        method: 'education.bulk_enroll.bulk_approve_enroll',
                        args: { names: JSON.stringify(selected.map(d => d.name)) },
                        timeout: 300000,
                        callback: function(r) {
                            frappe.show_progress('Enrolling Students...', 100, 100, 'Done!');
                            setTimeout(() => frappe.hide_progress(), 800);
                            let res = r.message;
                            let out = '<table style="width:100%;font-size:14px">';
                            if (res.success_count > 0) out += '<tr style="background:#e8f5e9"><td style="padding:10px">Enrolled</td><td><b style="color:green">' + res.success_count + ' students</b></td></tr>';
                            if (res.already_enrolled_count > 0) out += '<tr style="background:#fff8e1"><td style="padding:10px">Skipped</td><td><b style="color:orange">' + res.already_enrolled_count + '</b></td></tr>';
                            if (res.failed_count > 0) out += '<tr style="background:#ffebee"><td style="padding:10px">Failed</td><td><b style="color:red">' + res.failed_count + '</b></td></tr>';
                            out += '</table>';
                            if (res.failed && res.failed.length) {
                                out += '<hr><p><b>Failed students:</b></p><ul>';
                                res.failed.forEach(f => out += '<li><b>' + f.name + '</b>: ' + f.error + '</li>');
                                out += '</ul>';
                            }
                            listview.refresh();
                            let d = new frappe.ui.Dialog({
                                title: res.failed_count > 0 ? 'Enrollment Complete with Errors' : 'Enrollment Complete!',
                                fields: [{ fieldtype: 'HTML', options: out }],
                                primary_action_label: 'Done',
                                primary_action: () => d.hide() });
                            d.show();
                        },
                        error: function(xhr) {
                            frappe.hide_progress();
                            frappe.msgprint({ title: 'Error',
                                message: 'Something went wrong. Check error logs.',
                                indicator: 'red' });
                        }
                    });
                },
                secondary_action_label: 'Cancel'
            });
            confirmDialog.show();
        });
    }
};