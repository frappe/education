"""AVS-rules pre-flight validator for AVETMISS 8.0 NAT files.

Replicates the mechanically-checkable AVS edits from /reference/VET-8.0.csv so
errors are caught before submission. Pure Python (no Frappe) — runs in tests."""

from .engine import validate  # noqa: F401
