/**
 * Random generators and password strength estimation.
 * Everything uses crypto.getRandomValues — never Math.random.
 */

function randomInt(max: number): number {
  if (max <= 0) return 0;
  // Rejection sampling keeps the distribution uniform
  const limit = Math.floor(0xffffffff / max) * max;
  const buffer = new Uint32Array(1);
  let value = 0;
  do {
    crypto.getRandomValues(buffer);
    value = buffer[0];
  } while (value >= limit);
  return value % max;
}

/* ══════════════════════════════════════════════════════════════
   Passwords
   ══════════════════════════════════════════════════════════════ */

export interface PasswordOptions {
  length: number;
  upper: boolean;
  lower: boolean;
  digits: boolean;
  symbols: boolean;
  avoidAmbiguous: boolean;
}

const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWER = "abcdefghijklmnopqrstuvwxyz";
const DIGITS = "0123456789";
const SYMBOLS = "!@#$%^&*()-_=+[]{};:,.?/";
const AMBIGUOUS = new Set("0O1lI|`'\";:.,{}[]()/\\");

function charsetFor(opts: PasswordOptions): string[] {
  const sets: string[] = [];
  const filter = (source: string) =>
    [...source].filter((ch) => !opts.avoidAmbiguous || !AMBIGUOUS.has(ch)).join("");

  if (opts.upper) sets.push(filter(UPPER));
  if (opts.lower) sets.push(filter(LOWER));
  if (opts.digits) sets.push(filter(DIGITS));
  if (opts.symbols) sets.push(filter(SYMBOLS));
  return sets.filter((s) => s.length > 0);
}

export function generatePassword(opts: PasswordOptions): string {
  const sets = charsetFor(opts);
  if (sets.length === 0) return "";

  const all = sets.join("");
  const length = Math.max(opts.length, sets.length);

  // Seed one character per selected set so every class is represented
  const chars = sets.map((set) => set[randomInt(set.length)]);
  while (chars.length < length) chars.push(all[randomInt(all.length)]);

  // Fisher-Yates with a CSPRNG
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
}

/* ══════════════════════════════════════════════════════════════
   Identifiers
   ══════════════════════════════════════════════════════════════ */

function hex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface UuidOptions {
  uppercase: boolean;
  hyphens: boolean;
  braces: boolean;
}

export function formatUuid(raw: string, opts: UuidOptions): string {
  let out = raw;
  if (!opts.hyphens) out = out.replace(/-/g, "");
  if (opts.braces) out = `{${out}}`;
  if (opts.uppercase) out = out.toUpperCase();
  return out;
}

export function uuidV4(): string {
  return crypto.randomUUID();
}

/** RFC 9562 version 7: 48-bit millisecond timestamp + random tail */
export function uuidV7(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  const timestamp = Date.now();
  bytes[0] = Math.floor(timestamp / 2 ** 40) & 0xff;
  bytes[1] = Math.floor(timestamp / 2 ** 32) & 0xff;
  bytes[2] = Math.floor(timestamp / 2 ** 24) & 0xff;
  bytes[3] = Math.floor(timestamp / 2 ** 16) & 0xff;
  bytes[4] = Math.floor(timestamp / 2 ** 8) & 0xff;
  bytes[5] = timestamp & 0xff;

  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const h = hex(bytes);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const NANOID_ALPHABET = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";

export function nanoid(size = 21, alphabet = NANOID_ALPHABET): string {
  let id = "";
  for (let i = 0; i < size; i++) id += alphabet[randomInt(alphabet.length)];
  return id;
}

const ULID_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function ulid(): string {
  let time = "";
  let stamp = Date.now();
  for (let i = 0; i < 10; i++) {
    time = ULID_ALPHABET[stamp % 32] + time;
    stamp = Math.floor(stamp / 32);
  }
  let random = "";
  for (let i = 0; i < 16; i++) random += ULID_ALPHABET[randomInt(32)];
  return time + random;
}

export function randomString(length: number, alphabet: string): string {
  if (!alphabet) return "";
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[randomInt(alphabet.length)];
  return out;
}

/* ══════════════════════════════════════════════════════════════
   Strength estimation
   ══════════════════════════════════════════════════════════════ */

export type StrengthIssue =
  | "empty"
  | "tooShort"
  | "common"
  | "repeated"
  | "sequence"
  | "keyboard"
  | "digitsOnly"
  | "singleClass"
  | "longButSimple";

const COMMON_PASSWORDS = new Set([
  "123456", "password", "12345678", "qwerty", "123456789", "12345", "1234", "111111",
  "1234567", "dragon", "123123", "baseball", "abc123", "football", "monkey", "letmein",
  "696969", "shadow", "master", "666666", "qwertyuiop", "123321", "mustang", "1234567890",
  "michael", "654321", "pussy", "superman", "1qaz2wsx", "7777777", "fuckyou", "121212",
  "000000", "qazwsx", "123qwe", "killer", "trustno1", "jordan", "jennifer", "zxcvbnm",
  "asdfgh", "hunter", "buster", "soccer", "harley", "batman", "andrew", "tigger",
  "sunshine", "iloveyou", "fuckme", "2000", "charlie", "robert", "thomas", "hockey",
  "ranger", "daniel", "starwars", "klaster", "112233", "george", "asshole", "computer",
  "michelle", "jessica", "pepper", "1111", "zxcvbn", "555555", "11111111", "131313",
  "freedom", "777777", "pass", "fuck", "maggie", "159753", "aaaaaa", "ginger", "princess",
  "joshua", "cheese", "amanda", "summer", "love", "ashley", "nicole", "chelsea", "biteme",
  "matthew", "access", "yankees", "987654321", "dallas", "austin", "thunder", "taylor",
  "matrix", "admin", "root", "toor", "guest", "test", "qwerty123", "1q2w3e4r", "qwerty1",
  "qazwsxedc", "password1", "password123", "admin123", "welcome", "welcome1", "letmein1",
  "p@ssw0rd", "passw0rd", "abcd1234", "abc123456", "1111111", "888888", "666888", "5201314",
  "woaini", "woaini1314", "521521", "147258369", "159357", "a123456", "a123456789",
]);

const KEYBOARD_ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm", "1234567890"];

export interface StrengthResult {
  score: 0 | 1 | 2 | 3 | 4;
  bits: number;
  charsetSize: number;
  /** Seconds at 1e10 guesses/sec (offline attack) */
  crackSeconds: number;
  issues: StrengthIssue[];
}

function charsetSizeOf(password: string): number {
  let size = 0;
  if (/[a-z]/.test(password)) size += 26;
  if (/[A-Z]/.test(password)) size += 26;
  if (/[0-9]/.test(password)) size += 10;
  if (/[^A-Za-z0-9]/.test(password)) size += 33;
  return size;
}

function hasSequence(password: string): boolean {
  const lower = password.toLowerCase();
  for (let i = 0; i + 2 < lower.length; i++) {
    const a = lower.charCodeAt(i);
    const b = lower.charCodeAt(i + 1);
    const c = lower.charCodeAt(i + 2);
    if (b - a === 1 && c - b === 1) return true;
    if (a - b === 1 && b - c === 1) return true;
  }
  return false;
}

function hasKeyboardRun(password: string): boolean {
  const lower = password.toLowerCase();
  return KEYBOARD_ROWS.some((row) => {
    for (let i = 0; i + 3 <= lower.length; i++) {
      const chunk = lower.slice(i, i + 3);
      if (row.includes(chunk)) return true;
      if (row.includes([...chunk].reverse().join(""))) return true;
    }
    return false;
  });
}

function hasRepeat(password: string): boolean {
  return /(.)\1{2,}/.test(password);
}

export function estimateStrength(password: string): StrengthResult {
  if (!password) {
    return { score: 0, bits: 0, charsetSize: 0, crackSeconds: 0, issues: ["empty"] };
  }

  const charsetSize = charsetSizeOf(password);
  const issues: StrengthIssue[] = [];
  let bits = password.length * Math.log2(Math.max(charsetSize, 1));

  if (password.length < 8) issues.push("tooShort");
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    issues.push("common");
    bits = Math.min(bits, 8);
  }
  if (hasRepeat(password)) {
    issues.push("repeated");
    bits *= 0.75;
  }
  if (hasSequence(password)) {
    issues.push("sequence");
    bits *= 0.8;
  }
  if (hasKeyboardRun(password)) {
    issues.push("keyboard");
    bits *= 0.75;
  }
  if (/^\d+$/.test(password)) {
    issues.push("digitsOnly");
    bits *= 0.8;
  }
  if (charsetSize <= 26) issues.push("singleClass");
  if (password.length >= 16 && charsetSize <= 26) issues.push("longButSimple");

  bits = Math.max(0, Math.round(bits));
  const score: StrengthResult["score"] =
    bits < 28 ? 0 : bits < 40 ? 1 : bits < 60 ? 2 : bits < 90 ? 3 : 4;

  return {
    score,
    bits,
    charsetSize,
    crackSeconds: 2 ** bits / 1e10,
    issues: [...new Set(issues)],
  };
}
