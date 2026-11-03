/**
 * Mojibake (乱码) repair.
 *
 * The recoverable case is UTF-8 bytes that were displayed with a single-byte
 * charset (Latin-1 or Windows-1252): the bytes are still there, so mapping each
 * character back to its byte and decoding as UTF-8 restores the text. Bytes that
 * were already replaced with U+FFFD are gone for good, which the caller is told
 * about instead of pretending the fix worked.
 *
 * The other direction (UTF-8 shown as GBK) needs a GBK encoder that browsers do
 * not ship, so this module does not pretend to handle it.
 */

export type MojibakeKind = "none" | "latin1" | "cp1252" | "double" | "lossy";

export interface MojibakeCandidate {
  id: "latin1" | "cp1252" | "double";
  text: string;
  score: number;
}

export interface MojibakeReport {
  /** Best guess at what went wrong */
  kind: MojibakeKind;
  /** U+FFFD count: everything above zero is unrecoverable */
  replacementChars: number;
  /** High-byte characters that look like mojibake */
  suspiciousChars: number;
  candidates: MojibakeCandidate[];
}

/** Windows-1252 maps 0x80–0x9F to printable characters instead of control codes */
const CP1252_FORWARD = new Map<number, string>([
  [0x80, "€"],
  [0x82, "‚"],
  [0x83, "ƒ"],
  [0x84, "„"],
  [0x85, "…"],
  [0x86, "†"],
  [0x87, "‡"],
  [0x88, "ˆ"],
  [0x89, "‰"],
  [0x8a, "Š"],
  [0x8b, "‹"],
  [0x8c, "Œ"],
  [0x8e, "Ž"],
  [0x91, "‘"],
  [0x92, "’"],
  [0x93, "“"],
  [0x94, "”"],
  [0x95, "•"],
  [0x96, "–"],
  [0x97, "—"],
  [0x98, "˜"],
  [0x99, "™"],
  [0x9a, "š"],
  [0x9b, "›"],
  [0x9c, "œ"],
  [0x9e, "ž"],
  [0x9f, "Ÿ"],
]);

const CP1252_REVERSE = new Map<string, number>(
  [...CP1252_FORWARD.entries()].map(([byte, char]) => [char, byte])
);

function toBytes(text: string, encoding: "latin1" | "cp1252"): Uint8Array | null {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code < 0x100) {
      out[i] = code;
      continue;
    }
    if (encoding === "cp1252") {
      const byte = CP1252_REVERSE.get(text[i]);
      if (byte !== undefined) {
        out[i] = byte;
        continue;
      }
    }
    return null;
  }
  return out;
}

function decodeUtf8(bytes: Uint8Array): string | null {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

/** Reinterpret Latin-1 bytes as UTF-8; null when the bytes are not valid UTF-8 */
export function fixLatin1(text: string): string | null {
  const bytes = toBytes(text, "latin1");
  return bytes ? decodeUtf8(bytes) : null;
}

/** Same, but also reverses Windows-1252's printable 0x80–0x9F range */
export function fixCp1252(text: string): string | null {
  const bytes = toBytes(text, "cp1252");
  return bytes ? decodeUtf8(bytes) : null;
}

/** Strip BOM, normalise to NFC so comparison is stable */
function normalise(text: string): string {
  return text.replace(/^\uFEFF/, "").normalize("NFC");
}

/** Apply the Latin-1 fix repeatedly, keeping the most readable intermediate */
export function fixRepeated(text: string, passes = 3): string {
  let current = normalise(text);
  let best = current;
  let bestScore = readability(current);
  for (let i = 0; i < passes; i += 1) {
    const next = fixLatin1(current);
    if (!next || next === current) break;
    current = next;
    const score = readability(next);
    if (score > bestScore) {
      best = next;
      bestScore = score;
    }
  }
  return best;
}

/**
 * Produce the mojibake on purpose: UTF-8 bytes shown in a single-byte charset.
 * The `cp1252` variant keeps 0x80–0x9F printable, which is what a browser does.
 */
export function toMojibake(text: string, encoding: "latin1" | "cp1252" = "latin1"): string {
  const bytes = new TextEncoder().encode(normalise(text));
  let out = "";
  for (const byte of bytes) {
    out += encoding === "cp1252" ? (CP1252_FORWARD.get(byte) ?? String.fromCharCode(byte)) : String.fromCharCode(byte);
  }
  return out;
}

/** Higher is better: CJK counts most, stray high-byte noise counts against */
export function readability(text: string): number {
  if (!text) return 0;
  const cjk = (text.match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) ?? []).length;
  const ascii = (text.match(/[A-Za-z0-9\s]/g) ?? []).length;
  const noise = (text.match(/[\u0080-\u00ff]/g) ?? []).length;
  const replacement = (text.match(/\ufffd/g) ?? []).length;
  return (cjk * 4 + ascii * 0.2 - noise * 1.5 - replacement * 6) / Math.max(1, text.length);
}

export function countReplacement(text: string): number {
  return (text.match(/\ufffd/g) ?? []).length;
}

function countSuspicious(text: string): number {
  // "Ã¤", "å¥½", "â€œ" — a high-byte char followed by another high byte
  return (text.match(/[\u00c0-\u00ff][\u0080-\u00bf]|[\u0080-\u00bf]{2,}/g) ?? []).length;
}

/** Rank the three repairs and report what the input looks like */
export function analyseMojibake(input: string): MojibakeReport {
  const text = normalise(input);
  const replacementChars = countReplacement(text);
  const suspiciousChars = countSuspicious(text);

  const candidates: MojibakeCandidate[] = [];
  for (const [id, fix] of [
    ["latin1", fixLatin1],
    ["cp1252", fixCp1252],
  ] as const) {
    const fixed = fix(text);
    if (fixed !== null) candidates.push({ id, text: fixed, score: readability(fixed) });
  }
  const repeated = fixRepeated(text);
  if (repeated !== text) {
    candidates.push({ id: "double", text: repeated, score: readability(repeated) });
  }
  candidates.sort((a, b) => b.score - a.score);

  let kind: MojibakeKind = "none";
  if (replacementChars > 0 && candidates.length === 0) kind = "lossy";
  else if (candidates.length > 0 && candidates[0].score > readability(text)) {
    kind = candidates[0].id;
  } else if (suspiciousChars > 0) {
    kind = "latin1";
  }

  return { kind, replacementChars, suspiciousChars, candidates };
}

/** The best repair, or the input unchanged when nothing improves it */
export function fixMojibake(input: string): { text: string; kind: MojibakeKind } {
  const report = analyseMojibake(input);
  const best = report.candidates[0];
  if (!best) return { text: normalise(input), kind: report.kind };
  return { text: best.text, kind: best.id };
}
