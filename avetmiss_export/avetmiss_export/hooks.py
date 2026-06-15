app_name = "avetmiss_export"
app_title = "AVETMISS Export"
app_publisher = "AVETMISS prototype"
app_description = "AVETMISS 8.0 NAT-file export for Frappe Education"
app_email = "peeledspuds@duck.com"
app_license = "MIT"

# This app extends Education; installing it requires education (which itself
# pulls in erpnext). We never edit core Education doctypes/controllers.
required_apps = ["education"]

# Create the AVETMISS custom fields on a fresh install (migrate uses the patch).
after_install = "avetmiss_export.setup.install.after_install"
