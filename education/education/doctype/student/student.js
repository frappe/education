frappe.ui.form.on('Student', {
	refresh: function(frm) {
		frm.set_query("user", function (doc) {
			return {
				filters: {
					ignore_user_type: 1,
				},
			};
		});

		if(!frm.is_new()) {
			frm.add_custom_button(__('Accounting Ledger'), function() {
				frappe.set_route('query-report', 'General Ledger',
					{party_type:'Student', party:frm.doc.name});
			});
		}

		frappe.db.get_single_value('Education Settings', 'user_creation_skip', (r) => {
			if (cint(r.user_creation_skip) !== 1) {
				frm.set_df_property('student_email_id', 'reqd', 1);
			}
		});

        // Fetch the latest Student Exit date_of_leaving
        if (frm.doc.name) {
            frappe.call({
                method: "frappe.client.get_value",
                args: {
                    doctype: "Student Exit",
                    filters: {
                        student: frm.doc.name
                    },
                    fieldname: "date_of_leaving"
                },
                callback: function(r) {
                    if (r.message && r.message.date_of_leaving) {
                        frm.set_value('date_of_exit', r.message.date_of_leaving);
                    } else {
                        frm.set_value('date_of_exit', null);
                    }
                }
            });
        }
	}
});

frappe.ui.form.on('Student', {
    refresh: function (frm) {
        frm.add_custom_button(__('Update Student Name'), function () {
            let ticketCreatedUsingButton = false;

            let dialog = new frappe.ui.Dialog({
                title: 'Update Student Name',
                fields: [
                    {
                        label: 'First Name',
                        fieldname: 'first_name',
                        fieldtype: 'Data',
                        reqd: 1
                    },
                    {
                        label: 'Middle Name',
                        fieldname: 'middle_name',
                        fieldtype: 'Data',
                        reqd: 0
                    },
                    {
                        label: 'Last Name',
                        fieldname: 'last_name',
                        fieldtype: 'Data',
                        reqd: 1
                    },
                    {
                        label: 'Do you have a HelpDesk Ticket URL?',
                        fieldname: 'has_ticket',
                        fieldtype: 'Check',
                        reqd: 1
                    },
                    {
                        label: 'HelpDesk Ticket ID',
                        fieldname: 'help_desk_ticket_url',
                        fieldtype: 'Data',
                        depends_on: 'eval:doc.has_ticket==1',
                        reqd: 1
                    },
                    {
                        label: 'Attachment',
                        fieldname: 'attachment',
                        fieldtype: 'Attach',
                        depends_on: 'eval:doc.has_ticket==1',
                        reqd: 0
                    },
                    {
                        label: 'Create HelpDesk Ticket',
                        fieldname: 'create_ticket_btn',
                        fieldtype: 'Button',
                        depends_on: 'eval:doc.has_ticket==0'
                    }
                ],
                primary_action_label: 'Submit',
                primary_action(values) {
                    // Validate if ticket is created using the button
                    if (ticketCreatedUsingButton && !values.attachment) {
                        frappe.msgprint(__('Please attach a document before submitting if you created a HelpDesk Ticket.'));
                        return;
                    }

                    // Validate required fields
                    if (values.has_ticket && !values.help_desk_ticket_url) {
                        frappe.msgprint(__('Please provide a valid HelpDesk Ticket URL.'));
                        return;
                    }

                    // Validate file type (only images and PDFs)
                    if (values.attachment) {
                        let allowed_extensions = ['jpg', 'jpeg', 'png', 'pdf'];
                        let file_extension = values.attachment.split('.').pop().toLowerCase();
                        if (!allowed_extensions.includes(file_extension)) {
                            frappe.msgprint(__('Only image files (JPG, PNG) and PDFs are allowed.'));
                            return;
                        }
                    }

                    frappe.call({
                        method: 'frappe.client.set_value',
                        args: {
                            doctype: 'Student',
                            name: frm.doc.name,
                            fieldname: {
                                first_name: values.first_name,
                                middle_name: values.middle_name || frm.doc.middle_name,
                                last_name: values.last_name,
                                help_desk_ticket_url: values.help_desk_ticket_url
                            }
                        },
                        callback: function (response) {
                            if (response.message) {
                                if (values.attachment && values.help_desk_ticket_url) {
                                    frappe.call({
                                        method: 'frappe.client.insert',
                                        args: {
                                            doc: {
                                                doctype: 'File',
                                                file_url: values.attachment,
                                                attached_to_doctype: 'HD Ticket',
                                                attached_to_name: values.help_desk_ticket_url
                                            }
                                        },
                                        callback: function (response) {
                                            if (response.message) {
                                                frappe.msgprint(__('Attachment successfully added to the ticket.'));
                                            } else {
                                                frappe.msgprint(__('Failed to attach the file to the HelpDesk Ticket.'));
                                            }
                                        },
                                        error: function (error) {
                                            console.error('Error Attaching File:', error);
                                            frappe.msgprint(__('An error occurred while attaching the file. Check console for details.'));
                                        }
                                    });
                                }

                                frappe.call({
                                    method: 'frappe.desk.form.utils.add_comment',
                                    args: {
                                        reference_doctype: frm.doc.doctype,
                                        reference_name: frm.doc.name,
                                        content: `Student name updated. ${
                                            values.help_desk_ticket_url ? 'HelpDesk Ticket URL: ' + values.help_desk_ticket_url : ''
                                        }`,
                                        comment_email: frappe.session.user,
                                        comment_by: frappe.session.user_fullname
                                    },
                                    callback: function () {
                                        frappe.msgprint(__('Student updated and comment added successfully!'));
                                        frm.reload_doc();
                                    }
                                });
                            } else {
                                frappe.msgprint(__('Failed to update the Student document.'));
                            }
                        }
                    });

                    dialog.hide();
                }
            });

            dialog.fields_dict.create_ticket_btn.$input.on('click', function () {
                frappe.prompt(
                    [
                        {
                            label: 'Ticket Subject',
                            fieldname: 'subject',
                            fieldtype: 'Data',
                            reqd: 1
                        }
                    ],
                    function (data) {
                        frappe.call({
                            method: 'helpdesk.helpdesk.doctype.hd_ticket.api.new',
                            args: {
                                doc: {
                                    subject: data.subject
                                }
                            },
                            callback: function (response) {
                                if (response.message) {
                                    const ticket_name = response.message.name;
                                    dialog.set_value('help_desk_ticket_url', ticket_name);
                                    dialog.set_value('has_ticket', 1); // Auto-check the checkbox
                                    frappe.msgprint(__('HelpDesk Ticket created successfully: ') + ticket_name);

                                    ticketCreatedUsingButton = true;
                                } else {
                                    frappe.msgprint(__('Failed to create HelpDesk Ticket.'));
                                }
                            }
                        });
                    },
                    __('Create HelpDesk Ticket'),
                    __('Create')
                );
            });

            dialog.show();
        });
    }
});


frappe.ui.form.on('Student Guardian', {
	guardians_add: function(frm){
		frm.fields_dict['guardians'].grid.get_field('guardian').get_query = function(doc){
			let guardian_list = [];
			if(!doc.__islocal) guardian_list.push(doc.guardian);
			$.each(doc.guardians, function(idx, val){
				if (val.guardian) guardian_list.push(val.guardian);
			});
			return { filters: [['Guardian', 'name', 'not in', guardian_list]] };
		};
	}
});



// api/method/helpdesk.helpdesk.doctype.hd_ticket.api.new