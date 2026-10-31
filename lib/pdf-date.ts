/**
 * Parser for the date strings PDFs store in their info dictionary
 * (`D:YYYYMMDDHHmmSSOHH'mm'`).
 *
 * pdf-lib has its own parser, but it throws on anything it considers malformed.
 * In practice plenty of files carry an extra pair of parentheses, omit the
 * `D:` prefix, or drop digits — and every reader still shows them fine, so we
 * parse leniently and let the caller fall back to a dash when nothing fits.
 */

const HEAD = /^(\d{4})(\d{2})?(\d{2})?(\d{2})?(\d{2})?(\d{2})?/;
const ZONE = /(?:Z|[+-]\d{2}'?\d{0,2}'?)$/i;

export function parsePdfDate(input: string | null | undefined): Date | null {
  if (!input) return null;

  let text = input.trim();
  // Some producers keep the literal's delimiters inside the value.
  while (text.length > 2 && text.startsWith("(") && text.endsWith(")")) {
    text = text.slice(1, -1).trim();
  }
  text = text.replace(/^D:/i, "").trim();

  const head = HEAD.exec(text);
  if (!head) return null;

  const year = Number(head[1]);
  const month = Number(head[2] || "1");
  const day = Number(head[3] || "1");
  const hours = Number(head[4] || "0");
  const minutes = Number(head[5] || "0");
  const seconds = Number(head[6] || "0");

  // Reject values a Date would silently roll over (month 13, hour 24, …).
  if (
    year < 1 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hours > 23 ||
    minutes > 59 ||
    seconds > 59
  ) {
    return null;
  }

  const local = new Date(year, month - 1, day, hours, minutes, seconds);
  const zone = ZONE.exec(text.slice(head[0].length).trim());
  if (!zone) return local;

  if (zone[0].toUpperCase() === "Z") {
    return new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
  }

  // `+08'00'` means the stamp is eight hours ahead of UTC, so subtract it.
  const digits = zone[0].replace(/'/g, "");
  const sign = digits.startsWith("-") ? -1 : 1;
  const offset = sign * (Number(digits.slice(1, 3) || "0") * 60 + Number(digits.slice(3, 5) || "0"));
  return new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds) - offset * 60_000);
}
