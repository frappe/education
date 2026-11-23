// Sidebar banner for the Education module: open Frappe Learning when installed, suggest it otherwise.
frappe.provide("frappe.ui");
frappe.ui.sidebar_banners = frappe.ui.sidebar_banners || [];

frappe.ui.sidebar_banners.push(() => ({
	module: "Education",
	app: "lms",
	icon: `<img src="/assets/education/learning.svg" width="16" height="16" alt="">`,
	installed: { title: __("Switch to Learning"), message: __("Open Frappe Learning") },
	promo: {
		title: __("Try Frappe Learning"),
		message: __("Run online courses and batches for your students. Try it for free!"),
		link: "https://frappe.io/learning?utm_source=education-sidebar&utm_medium=sidebar&utm_campaign=frappe-ad",
	},
}));
