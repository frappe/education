-- 0017: the teacher's bank number (6 digits, "BIN") so the receipt can carry a payment QR code (VietQR). Expand only.
ALTER TABLE tenants ADD COLUMN bank_bin TEXT NOT NULL DEFAULT '' CHECK (bank_bin = '' OR bank_bin GLOB '[0-9][0-9][0-9][0-9][0-9][0-9]');
