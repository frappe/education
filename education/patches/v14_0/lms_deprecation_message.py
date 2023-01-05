import click
import frappe


def execute():

	click.secho(
		"LMS Module has been removed from the Education App. "
		"There is a new app for it called the Frappe LMS App. "
		"You can install the app from GitHub or Frappe Cloud Marketplace.\n"
		"https://github.com/frappe/lms\n"
		"https://frappecloud.com/marketplace/apps/lms",
		fg="yellow",
	)
