/**
 * Text helpers: statistics, case conversion, cleaning, sorting,
 * line diffing, Lorem Ipsum and simple ciphers.
 */

/* ══════════════════════════════════════════════════════════════
   Statistics
   ══════════════════════════════════════════════════════════════ */

export interface TextStats {
  chars: number;
  charsNoSpaces: number;
  words: number;
  cjk: number;
  lines: number;
  nonEmptyLines: number;
  paragraphs: number;
  sentences: number;
  bytes: number;
  readingMinutes: number;
}

const CJK_RE = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;

export function textStats(text: string): TextStats {
  const chars = [...text].length;
  const charsNoSpaces = [...text.replace(/\s/g, "")].length;

  let cjk = 0;
  for (const ch of text) if (CJK_RE.test(ch)) cjk++;

  const latinWords = text.match(/[A-Za-z0-9_'’-]+/g)?.length ?? 0;
  const lines = text === "" ? 0 : text.split("\n").length;
  const nonEmptyLines = text.split("\n").filter((l) => l.trim() !== "").length;
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim() !== "").length;
  const sentences =
    text.split(/[.!?。！？…]+/).filter((s) => s.trim() !== "").length;
  const bytes = new TextEncoder().encode(text).length;
  // 300 CJK characters or 200 latin words per minute, whichever is slower
  const readingMinutes = Math.max(cjk / 300, latinWords / 200);

  return {
    chars,
    charsNoSpaces,
    words: latinWords + cjk,
    cjk,
    lines,
    nonEmptyLines,
    paragraphs,
    sentences,
    bytes,
    readingMinutes,
  };
}

/* ══════════════════════════════════════════════════════════════
   Case conversion
   ══════════════════════════════════════════════════════════════ */

export type CaseStyle =
  | "upper"
  | "lower"
  | "title"
  | "sentence"
  | "camel"
  | "pascal"
  | "snake"
  | "kebab"
  | "constant"
  | "dot";

/** Split on separators and camelCase boundaries, lower-cased */
export function splitWords(input: string): string[] {
  return input
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .split(/[^A-Za-z0-9\u4e00-\u9fff]+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase());
}

const capitalize = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

export function convertCase(input: string, style: CaseStyle): string {
  if (!input) return "";
  const words = splitWords(input);

  switch (style) {
    case "upper":
      return input.toUpperCase();
    case "lower":
      return input.toLowerCase();
    case "title":
      return input.replace(/\b([a-z])/g, (m) => m.toUpperCase());
    case "sentence":
      return input
        .toLowerCase()
        .replace(/(^\s*[a-z])|([.!?]\s+[a-z])/g, (m) => m.toUpperCase());
    case "camel":
      return words.map((w, i) => (i === 0 ? w : capitalize(w))).join("");
    case "pascal":
      return words.map(capitalize).join("");
    case "snake":
      return words.join("_");
    case "kebab":
      return words.join("-");
    case "constant":
      return words.join("_").toUpperCase();
    case "dot":
      return words.join(".");
    default:
      return input;
  }
}

/* ══════════════════════════════════════════════════════════════
   Cleaning
   ══════════════════════════════════════════════════════════════ */

export interface CleanOptions {
  trimLines: boolean;
  collapseSpaces: boolean;
  removeEmptyLines: boolean;
  removeDuplicateLines: boolean;
}

export function cleanText(text: string, opts: CleanOptions): string {
  let lines = text.split("\n");

  if (opts.trimLines) lines = lines.map((l) => l.trim());
  if (opts.collapseSpaces) lines = lines.map((l) => l.replace(/[ \t]+/g, " "));
  if (opts.removeEmptyLines) lines = lines.filter((l) => l.trim() !== "");
  if (opts.removeDuplicateLines) {
    const seen = new Set<string>();
    lines = lines.filter((l) => {
      if (seen.has(l)) return false;
      seen.add(l);
      return true;
    });
  }

  return lines.join("\n");
}

/* ══════════════════════════════════════════════════════════════
   Sorting
   ══════════════════════════════════════════════════════════════ */

export type SortMode = "asc" | "desc" | "lengthAsc" | "lengthDesc" | "numeric" | "reverse";

export interface SortOptions {
  mode: SortMode;
  dedupe: boolean;
  ignoreCase: boolean;
}

export function sortLines(text: string, opts: SortOptions): string {
  let lines = text.split("\n").filter((l) => l.trim() !== "");
  if (opts.dedupe) lines = [...new Set(lines)];

  const collator = new Intl.Collator(undefined, {
    numeric: opts.mode === "numeric",
    sensitivity: opts.ignoreCase ? "base" : "variant",
  });

  switch (opts.mode) {
    case "asc":
      lines.sort(collator.compare);
      break;
    case "desc":
      lines.sort((a, b) => collator.compare(b, a));
      break;
    case "lengthAsc":
      lines.sort((a, b) => a.length - b.length);
      break;
    case "lengthDesc":
      lines.sort((a, b) => b.length - a.length);
      break;
    case "numeric":
      lines.sort((a, b) => {
        const na = Number.parseFloat(a.replace(/[^0-9.eE+-]/g, ""));
        const nb = Number.parseFloat(b.replace(/[^0-9.eE+-]/g, ""));
        if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
        return collator.compare(a, b);
      });
      break;
    case "reverse":
      lines.reverse();
      break;
  }

  return lines.join("\n");
}

/* ══════════════════════════════════════════════════════════════
   Line diff (LCS)
   ══════════════════════════════════════════════════════════════ */

export type LineDiffKind = "same" | "added" | "removed";

export interface LineDiff {
  kind: LineDiffKind;
  text: string;
  leftLine: number | null;
  rightLine: number | null;
}

export const DIFF_LINE_LIMIT = 2000;

export function diffLines(left: string, right: string): LineDiff[] {
  const a = left.split("\n");
  const b = right.split("\n");
  const n = a.length;
  const m = b.length;

  if (n > DIFF_LINE_LIMIT || m > DIFF_LINE_LIMIT) {
    throw new Error("diff.tooLarge");
  }

  // lengths[i][j] = LCS length of a[i..] and b[j..]
  const width = m + 1;
  const lengths = new Uint32Array((n + 1) * width);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lengths[i * width + j] =
        a[i] === b[j]
          ? lengths[(i + 1) * width + j + 1] + 1
          : Math.max(lengths[(i + 1) * width + j], lengths[i * width + j + 1]);
    }
  }

  const out: LineDiff[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ kind: "same", text: a[i], leftLine: i + 1, rightLine: j + 1 });
      i++;
      j++;
    } else if (lengths[(i + 1) * width + j] >= lengths[i * width + j + 1]) {
      out.push({ kind: "removed", text: a[i], leftLine: i + 1, rightLine: null });
      i++;
    } else {
      out.push({ kind: "added", text: b[j], leftLine: null, rightLine: j + 1 });
      j++;
    }
  }
  while (i < n) {
    out.push({ kind: "removed", text: a[i], leftLine: i + 1, rightLine: null });
    i++;
  }
  while (j < m) {
    out.push({ kind: "added", text: b[j], leftLine: null, rightLine: j + 1 });
    j++;
  }

  return out;
}

/* ══════════════════════════════════════════════════════════════
   Lorem Ipsum
   ══════════════════════════════════════════════════════════════ */

const LATIN_WORDS = [
  "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit",
  "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore", "et", "dolore",
  "magna", "aliqua", "enim", "ad", "minim", "veniam", "quis", "nostrud",
  "exercitation", "ullamco", "laboris", "nisi", "aliquip", "ex", "ea", "commodo",
  "consequat", "duis", "aute", "irure", "in", "reprehenderit", "voluptate",
  "velit", "esse", "cillum", "eu", "fugiat", "nulla", "pariatur", "excepteur",
  "sint", "occaecat", "cupidatat", "non", "proident", "sunt", "culpa", "qui",
  "officia", "deserunt", "mollit", "anim", "id", "est", "laborum",
];

const ZH_PHRASES = [
  "我们需要", "在这个项目中", "通过简单的配置", "可以快速完成", "文本处理",
  "以及格式转换", "同时保持", "良好的可读性", "对于开发者来说", "这非常实用",
  "在实际使用中", "建议先检查", "输入内容的格式", "然后再进行", "下一步操作",
  "如果遇到问题", "可以查看", "页面下方的说明", "所有计算", "都在本地完成",
  "不会上传到服务器", "数据安全", "始终是第一位的",
];

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

export interface LoremOptions {
  language: "latin" | "zh";
  unit: "paragraphs" | "sentences" | "words";
  count: number;
  startWithLorem: boolean;
}

export function generateLorem(opts: LoremOptions): string {
  const { language, unit, count, startWithLorem } = opts;
  const total = Math.min(Math.max(count, 1), 100);

  const sentence = (): string => {
    if (language === "zh") {
      const parts = Array.from({ length: 3 + Math.floor(Math.random() * 3) }, () => pick(ZH_PHRASES));
      return `${parts.join("，")}。`;
    }
    const words = Array.from({ length: 8 + Math.floor(Math.random() * 8) }, () => pick(LATIN_WORDS));
    const text = words.join(" ");
    return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
  };

  if (unit === "words") {
    const words =
      language === "zh"
        ? Array.from({ length: total }, () => pick(ZH_PHRASES))
        : Array.from({ length: total }, () => pick(LATIN_WORDS));
    const joined = language === "zh" ? words.join("") : words.join(" ");
    return startWithLorem && language === "latin" ? `Lorem ipsum ${joined}` : joined;
  }

  if (unit === "sentences") {
    const list = Array.from({ length: total }, sentence);
    if (startWithLorem && language === "latin") {
      list[0] = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";
    }
    return language === "zh" ? list.join("") : list.join(" ");
  }

  const paragraphs = Array.from({ length: total }, () =>
    Array.from({ length: 3 + Math.floor(Math.random() * 3) }, sentence).join(
      language === "zh" ? "" : " "
    )
  );
  if (startWithLorem && language === "latin") {
    paragraphs[0] = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. ${paragraphs[0]}`;
  }
  return paragraphs.join("\n\n");
}

/* ══════════════════════════════════════════════════════════════
   Simple ciphers
   ══════════════════════════════════════════════════════════════ */

export type CipherMode = "rot13" | "caesar" | "atbash" | "reverse";

export function shiftLetters(text: string, shift: number): string {
  const n = ((shift % 26) + 26) % 26;
  return text.replace(/[a-zA-Z]/g, (ch) => {
    const base = ch <= "Z" ? 65 : 97;
    return String.fromCharCode(((ch.charCodeAt(0) - base + n) % 26) + base);
  });
}

export function atbash(text: string): string {
  return text.replace(/[a-zA-Z]/g, (ch) => {
    const base = ch <= "Z" ? 65 : 97;
    return String.fromCharCode(25 - (ch.charCodeAt(0) - base) + base);
  });
}

export function applyCipher(text: string, mode: CipherMode, shift = 3): string {
  switch (mode) {
    case "rot13":
      return shiftLetters(text, 13);
    case "caesar":
      return shiftLetters(text, shift);
    case "atbash":
      return atbash(text);
    case "reverse":
      return [...text].reverse().join("");
    default:
      return text;
  }
}

/* ══════════════════════════════════════════════════════════════
   Regex helpers
   ══════════════════════════════════════════════════════════════ */

export interface RegexMatch {
  index: number;
  value: string;
  groups: (string | undefined)[];
  named: Record<string, string> | undefined;
}

export interface RegexResult {
  matches: RegexMatch[];
  highlighted: string;
  replaced: string;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function runRegex(
  pattern: string,
  flags: string,
  input: string,
  replacement: string
): RegexResult {
  if (!pattern) return { matches: [], highlighted: escapeHtml(input), replaced: input };

  // Guard against catastrophic backtracking by capping the match count
  const re = new RegExp(pattern, flags.includes("g") ? flags : `${flags}g`);
  const matches: RegexMatch[] = [];
  let guard = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(input)) !== null) {
    matches.push({
      index: match.index,
      value: match[0],
      groups: match.slice(1),
      named: match.groups ? { ...match.groups } as Record<string, string> : undefined,
    });
    if (match[0] === "") re.lastIndex++;
    if (++guard > 10000) break;
  }

  let highlighted = "";
  let cursor = 0;
  for (const m of matches) {
    highlighted += escapeHtml(input.slice(cursor, m.index));
    highlighted += `<mark class="rounded bg-yellow-soft px-0.5 text-yellow-fg">${escapeHtml(m.value)}</mark>`;
    cursor = m.index + m.value.length;
  }
  highlighted += escapeHtml(input.slice(cursor));

  let replaced = input;
  try {
    replaced = input.replace(new RegExp(pattern, flags), replacement);
  } catch {
    replaced = input;
  }

  return { matches, highlighted, replaced };
}
