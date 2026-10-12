from education.education.doctype.floor.floor import create_default_floors


def execute():
	"""Give existing sites the default floors that new installs get."""
	create_default_floors()
