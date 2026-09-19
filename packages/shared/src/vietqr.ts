/**
 * VietQR: the QR code that Vietnamese banking apps read to fill in a bank transfer (who to pay, how much, and the words
 * of the transfer). It is an EMVCo payload, written as text, with a CRC16 at the end. Everything here is plain code with
 * no browser or server parts, so the same text can be made anywhere.
 */

/** A bank with the 6-digit number that banking apps use to find it (the "BIN"). */
export interface BankInfo {
  bin: string;
  /** The name people use, for example "Vietcombank". */
  name: string;
}

/**
 * Banks a teacher can choose. The list is only for choosing; any bank can be used by typing its 6 digit number.
 * Check a new payment QR by scanning it with the teacher's own banking app.
 */
export const VN_BANKS: readonly BankInfo[] = [
  { bin: "970436", name: "Vietcombank" },
  { bin: "970415", name: "VietinBank" },
  { bin: "970418", name: "BIDV" },
  { bin: "970405", name: "Agribank" },
  { bin: "970407", name: "Techcombank" },
  { bin: "970422", name: "MB Bank" },
  { bin: "970416", name: "ACB" },
  { bin: "970432", name: "VPBank" },
  { bin: "970423", name: "TPBank" },
  { bin: "970403", name: "Sacombank" },
  { bin: "970437", name: "HDBank" },
  { bin: "970441", name: "VIB" },
  { bin: "970443", name: "SHB" },
  { bin: "970426", name: "MSB" },
  { bin: "970448", name: "OCB" },
  { bin: "970440", name: "SeABank" },
  { bin: "970431", name: "Eximbank" },
  { bin: "970449", name: "LPBank" },
  { bin: "970428", name: "Nam A Bank" },
  { bin: "970409", name: "Bac A Bank" },
  { bin: "970412", name: "PVcomBank" },
  { bin: "970433", name: "VietBank" },
  { bin: "970425", name: "ABBANK" },
  { bin: "970419", name: "NCB" },
  { bin: "970438", name: "BaoViet Bank" },
  { bin: "970452", name: "KienlongBank" },
  { bin: "970429", name: "SCB" },
  { bin: "970408", name: "GPBank" },
  { bin: "970457", name: "Woori Bank" },
  { bin: "970424", name: "Shinhan Bank" },
  { bin: "970439", name: "Public Bank" },
  { bin: "546034", name: "CAKE" },
  { bin: "546035", name: "Ubank" },
  { bin: "963388", name: "Timo" },
];

/** CRC-16/CCITT-FALSE (polynomial 0x1021, start 0xFFFF), as 4 capital hex letters. */
export function crc16(text: string): string {
  let crc = 0xffff;
  for (let i = 0; i < text.length; i++) {
    crc ^= (text.charCodeAt(i) & 0xff) << 8;
    for (let bit = 0; bit < 8; bit++)
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** One part of the payload: a 2 digit tag, the 2 digit length of the value, and the value. */
const part = (tag: string, value: string) => `${tag}${String(value.length).padStart(2, "0")}${value}`;

export const isBin = (v: string) => /^\d{6}$/.test(v);
/** Bank account numbers are digits only, and 6 to 19 of them for a transfer by account number. */
export const isAccountNumber = (v: string) => /^\d{6,19}$/.test(v);

/**
 * The words of a transfer, as the banks want them: capital and small letters, digits, space and . - _ only, at most 25
 * characters. Accents are taken off (and the Vietnamese letter đ becomes d).
 */
export function transferMessage(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^A-Za-z0-9 ._-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 25)
    .trim();
}

export interface QrInput {
  bin: string;
  account: string;
  /** Whole VND. */
  amount: number;
  /** The words of the transfer. Made safe with `transferMessage`. */
  message: string;
}

/**
 * The text inside the QR. Returns null when the bank number, the account or the amount cannot make a good code
 * (so the receipt is made without a QR, and nobody scans a wrong one).
 */
export function vietQrPayload(input: QrInput): string | null {
  const { bin, account, amount } = input;
  if (!isBin(bin) || !isAccountNumber(account)) return null;
  if (!Number.isInteger(amount) || amount < 1 || amount > 9_999_999_999_999) return null;
  const message = transferMessage(input.message);
  const beneficiary = part("00", bin) + part("01", account);
  const body =
    part("00", "01") + // version
    part("01", "12") + // 12: the amount is fixed (a code for one payment)
    part("38", part("00", "A000000727") + part("01", beneficiary) + part("02", "QRIBFTTA")) + // pay to an account
    part("53", "704") + // VND
    part("54", String(amount)) +
    part("58", "VN") +
    (message ? part("62", part("08", message)) : "") +
    "6304";
  return body + crc16(body);
}
