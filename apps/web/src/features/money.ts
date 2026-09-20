/** Digits (and a minus sign at the start, when `negative` is true) of what was typed. Separators and letters are dropped. */
export function cleanMoney(text: string, negative = false): string {
  const minus = negative && text.trimStart().startsWith("-") ? "-" : "";
  return minus + text.replace(/\D/g, "");
}

/** "1500000" shown as "1.500.000": a dot between groups of three digits, as VND is written. */
export function groupDigits(raw: string): string {
  const minus = raw.startsWith("-") ? "-" : "";
  const digits = raw.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  return minus + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Where the cursor goes in `shown` so that it stays after the same number of digits as before the change. */
export function caretAfter(shown: string, digitsBefore: number): number {
  let pos = 0;
  let seen = 0;
  while (pos < shown.length && seen < digitsBefore) {
    if (/\d/.test(shown[pos]!)) seen++;
    pos++;
  }
  return pos;
}
