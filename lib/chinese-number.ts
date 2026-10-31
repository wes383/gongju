/**
 * Chinese numerals.
 *
 * Two flavours are handled here:
 * - `toRmbUpper` writes an amount the way invoices and cheques require
 *   (壹佰贰拾叁圆肆角伍分), including the 零 placeholders between sections.
 * - `toChineseLower` reads a number out loud (一百二十三), where a leading
 *   "一十" collapses to "十".
 */

const UPPER_DIGITS = ["零", "壹", "贰", "叁", "肆", "伍", "陆", "柒", "捌", "玖"];
const LOWER_DIGITS = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
const UNITS = ["", "拾", "佰", "仟"];
const LOWER_UNITS = ["", "十", "百", "千"];
const SECTIONS = ["", "万", "亿", "万亿"];

const MAX_INTEGER = 999_999_999_999_999; // 万亿级，仍小于 Number.MAX_SAFE_INTEGER

/** Four digits at most, without any section suffix */
function group4(value: number, digits: string[], units: string[]): string {
  const parts = [
    Math.floor(value / 1000),
    Math.floor(value / 100) % 10,
    Math.floor(value / 10) % 10,
    value % 10,
  ];
  let out = "";
  let pendingZero = false;
  for (let i = 0; i < 4; i++) {
    const digit = parts[i];
    if (digit === 0) {
      if (out) pendingZero = true;
      continue;
    }
    if (pendingZero) {
      out += "零";
      pendingZero = false;
    }
    out += digits[digit] + units[3 - i];
  }
  return out;
}

function intToChinese(value: number, digits: string[], units: string[]): string {
  if (value === 0) return "零";
  const groups: number[] = [];
  let rest = value;
  while (rest > 0) {
    groups.push(rest % 10000);
    rest = Math.floor(rest / 10000);
  }
  let out = "";
  for (let i = groups.length - 1; i >= 0; i--) {
    const group = groups[i];
    if (group === 0) {
      // A whole section of zeros only shows up when something follows it
      const hasLower = groups.slice(0, i).some((g) => g > 0);
      if (out && hasLower && !out.endsWith("零")) out += "零";
      continue;
    }
    // e.g. 10001 → 壹万零壹, not 壹万壹
    if (out && group < 1000 && !out.endsWith("零")) out += "零";
    out += group4(group, digits, units) + SECTIONS[i];
  }
  return out;
}

/** Split "1234.5" into integer digits and at most two decimals, or null */
function parseAmount(input: string): { negative: boolean; integer: string; decimals: string } | null {
  const cleaned = input.trim().replace(/[,，\s]/g, "");
  if (!/^-?\d*(\.\d*)?$/.test(cleaned) || cleaned === "" || cleaned === "-" || cleaned === ".") {
    return null;
  }
  const negative = cleaned.startsWith("-");
  const body = negative ? cleaned.slice(1) : cleaned;
  const [rawInteger = "0", rawDecimals = ""] = body.split(".");
  const integer = rawInteger.replace(/^0+(?=\d)/, "") || "0";
  // Money has at most two decimals; round the tail instead of truncating it
  let decimals = rawDecimals;
  if (decimals.length > 2) {
    const rounded = Math.round(Number(`0.${decimals}`) * 100);
    if (rounded === 100) {
      const carried = Number(integer) + 1;
      if (carried > MAX_INTEGER) return null;
      return { negative, integer: String(carried), decimals: "00" };
    }
    decimals = String(rounded).padStart(2, "0");
  }
  return { negative, integer, decimals: decimals.padEnd(2, "0").slice(0, 2) };
}

/**
 * 人民币金额大写. Returns null for input that is not a number.
 * 12.5 → 壹拾贰圆伍角整, 0.05 → 零伍分, -3 → 负叁圆整
 */
export function toRmbUpper(input: string): string | null {
  const parsed = parseAmount(input);
  if (!parsed) return null;
  const integerValue = Number(parsed.integer);
  if (!Number.isFinite(integerValue) || integerValue > MAX_INTEGER) return null;

  const jiao = Number(parsed.decimals[0]);
  const fen = Number(parsed.decimals[1]);
  let out = "";

  if (integerValue > 0) {
    out += intToChinese(integerValue, UPPER_DIGITS, UNITS) + "圆";
    if (jiao === 0 && fen === 0) return (parsed.negative ? "负" : "") + out + "整";
    if (jiao === 0) return (parsed.negative ? "负" : "") + out + "零" + UPPER_DIGITS[fen] + "分";
    out += UPPER_DIGITS[jiao] + "角";
    out += fen === 0 ? "整" : UPPER_DIGITS[fen] + "分";
  } else if (jiao === 0 && fen === 0) {
    out = "零圆整";
  } else if (jiao === 0) {
    out = "零" + UPPER_DIGITS[fen] + "分";
  } else {
    out = UPPER_DIGITS[jiao] + "角" + (fen === 0 ? "整" : UPPER_DIGITS[fen] + "分");
  }
  return (parsed.negative && out !== "零圆整" ? "负" : "") + out;
}

/**
 * 口语读法: 10001 → 一万零一, 110 → 一百一十, 10 → 十,
 * 3.14 → 三点一四. Returns null for input that is not a number.
 */
export function toChineseLower(input: string): string | null {
  const cleaned = input.trim().replace(/[,，\s]/g, "");
  if (!/^-?\d*(\.\d*)?$/.test(cleaned) || cleaned === "" || cleaned === "-" || cleaned === ".") {
    return null;
  }
  const negative = cleaned.startsWith("-");
  const body = negative ? cleaned.slice(1) : cleaned;
  const [rawInteger = "0", decimals = ""] = body.split(".");
  const integer = Number(rawInteger.replace(/^0+(?=\d)/, "") || "0");
  if (!Number.isFinite(integer) || integer > MAX_INTEGER) return null;

  let out = intToChinese(integer, LOWER_DIGITS, LOWER_UNITS);
  // "一十" only reads naturally at the very start: 10 → 十, 110 → 一百一十
  if (out.startsWith("一十")) out = out.slice(1);

  if (decimals) {
    out += "点" + [...decimals].map((d) => LOWER_DIGITS[Number(d)]).join("");
  }
  return (negative ? "负" : "") + out;
}
