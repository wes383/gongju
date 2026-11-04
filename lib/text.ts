/**
 * Text helpers: statistics, case conversion, cleaning, sorting,
 * line diffing, Lorem Ipsum and simple ciphers.
 */

import { codedError } from "./errors";

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
    throw codedError("text.tooLarge", DIFF_LINE_LIMIT);
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
   Word diff
   ══════════════════════════════════════════════════════════════ */

export interface WordDiff {
  kind: LineDiffKind;
  text: string;
}

export const DIFF_WORD_LIMIT = 2000;

/**
 * Words, single CJK characters, whitespace runs and punctuation. Latin words
 * stay whole so "retry" reads as one change instead of six, while Chinese is
 * diffed character by character, which is what readers expect there.
 */
const WORD_TOKEN =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]|[\p{L}\p{M}\p{N}_]+|\s+|[^\s\p{L}\p{M}\p{N}_]/gu;

/**
 * Inline diff for prompts and single-paragraph text, where a line-level diff
 * would mark the whole line as changed.
 */
export function diffWords(left: string, right: string): WordDiff[] {
  const a = left.match(WORD_TOKEN) ?? [];
  const b = right.match(WORD_TOKEN) ?? [];
  const n = a.length;
  const m = b.length;

  if (n > DIFF_WORD_LIMIT || m > DIFF_WORD_LIMIT) {
    throw codedError("text.tooLarge", DIFF_WORD_LIMIT);
  }

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

  const out: WordDiff[] = [];
  const push = (kind: LineDiffKind, text: string) => {
    const last = out[out.length - 1];
    // Adjacent tokens of the same kind read better as one run
    if (last && last.kind === kind) last.text += text;
    else out.push({ kind, text });
  };

  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      push("same", a[i]);
      i++;
      j++;
    } else if (lengths[(i + 1) * width + j] >= lengths[i * width + j + 1]) {
      push("removed", a[i]);
      i++;
    } else {
      push("added", b[j]);
      j++;
    }
  }
  while (i < n) push("removed", a[i++]);
  while (j < m) push("added", b[j++]);

  return out;
}

/* ══════════════════════════════════════════════════════════════
   Lorem Ipsum
   ══════════════════════════════════════════════════════════════ */

/** Classic Lorem Ipsum corpus; the unique words are extracted once at module load */
const LATIN_CORPUS =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ' +
  'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. ' +
  'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. ' +
  'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. ' +
  'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, ' +
  'eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. ' +
  'Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos ' +
  'qui ratione voluptatem sequi nesciunt. Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, ' +
  'adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. ' +
  'At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti ' +
  'quos dolores et quas molestias excepturi sint occaecati cupiditate non provident, similique sunt in culpa qui officia ' +
  'deserunt mollitia animi, id est laborum et dolorum fuga.';

const LATIN_WORDS = [...new Set(LATIN_CORPUS.toLowerCase().match(/[a-z]+/g) ?? [])];

const ZH_PHRASES = [
  "此外", "因此", "同时", "例如", "总之", "换句话说", "在此基础上", "需要注意的是",
  "一般情况下", "从实际效果看", "相比之下", "进一步来说", "不过", "另外", "具体而言",
  "这个功能的设计", "页面的整体布局", "文本的排版方式", "数据结构的组织", "接口的调用顺序",
  "参数的默认取值", "错误提示的措辞", "加载状态的表现", "交互反馈的时机", "字段命名的习惯",
  "建议先检查输入内容", "再决定是否继续", "可以适当调整顺序", "尽量避免重复操作",
  "把常用的选项放在显眼位置", "让重要信息优先出现", "减少不必要的跳转", "保持操作路径清晰",
  "在动手之前先确认需求", "把复杂问题拆成小步骤", "逐步验证每一步的结果", "及时记录遇到的问题",
  "在移动端浏览时", "在网络不稳定的情况下", "当数据量较大时", "面对多语言内容时",
  "如果需要长期维护", "对于团队协作来说", "在版本迭代过程中", "遇到兼容性问题时",
  "整体体验会更加流畅", "阅读起来也更轻松", "维护成本会明显降低", "出错概率随之减少",
  "用户不需要额外的学习成本", "大部分场景都能覆盖", "细节上还有优化空间", "效果比预期更好",
  "这部分内容仅用于占位", "可以根据实际需要替换", "不影响最终呈现效果", "调整时注意保持一致性",
  "把注意力放在主要内容上", "次要信息可以适当弱化", "留白同样重要", "节奏感来自合理的分组",
  "先跑通再优化", "不要在细节上过度纠结", "优先保证可用性", "再考虑视觉上的打磨",
  "把结论放在开头", "论据紧随其后", "段落之间保持呼吸感", "标题层级不要跳级",
  "列表适合并列内容", "表格适合对比数据", "引用用来强调出处", "代码块保留原始格式",
  "输入框给出示例值", "按钮文案用动词开头", "错误提示说明下一步", "空状态提供入口",
  "第一次使用需要引导", "熟练之后可以隐藏提示", "默认值要足够合理", "高频操作尽量少点击",
  "颜色不要超过三种", "字号差异要明显", "行高影响可读性", "对齐方式保持一致",
  "动画服务于理解", "过渡不要打断思路", "加载超过一秒需要反馈", "失败要给出重试方式",
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

/** 6-16 words, with an occasional comma so long sentences read naturally */
function latinSentence(): string {
  const length = 6 + Math.floor(Math.random() * 11);
  const words = Array.from({ length }, () => pick(LATIN_WORDS));

  if (length > 9 && Math.random() < 0.6) {
    const commaAt = 2 + Math.floor(Math.random() * (length - 4));
    words[commaAt] = words[commaAt] + ',';
  }

  const text = words.join(' ');
  return text.charAt(0).toUpperCase() + text.slice(1) + '.';
}

/** 2-5 phrases; two short ones in a row are joined with a comma-like pause */
function zhSentence(): string {
  const count = 2 + Math.floor(Math.random() * 4);
  const parts = Array.from({ length: count }, () => pick(ZH_PHRASES));

  let body = parts[0];
  for (let i = 1; i < parts.length; i++) {
    const pause = parts[i].length <= 4 && parts[i - 1].length <= 4 ? "、" : "，";
    body += pause + parts[i];
  }
  return body + "。";
}

export function generateLorem(opts: LoremOptions): string {
  const { language, unit, count, startWithLorem } = opts;
  const total = Math.min(Math.max(count, 1), 100);
  const sentence = language === "zh" ? zhSentence : latinSentence;

  if (unit === "words") {
    const words =
      language === "zh"
        ? Array.from({ length: total }, () => pick(ZH_PHRASES))
        : Array.from({ length: total }, () => pick(LATIN_WORDS));
    const joined = language === "zh" ? words.join("") : words.join(" ");
    return startWithLorem && language === "latin" ? "Lorem ipsum " + joined : joined;
  }

  if (unit === "sentences") {
    const list = Array.from({ length: total }, sentence);
    if (startWithLorem && language === "latin") {
      list[0] = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";
    }
    return language === "zh" ? list.join("") : list.join(" ");
  }

  const paragraphs = Array.from({ length: total }, () => {
    const sentences = 3 + Math.floor(Math.random() * 3);
    return Array.from({ length: sentences }, sentence).join(language === "zh" ? "" : " ");
  });

  if (startWithLorem && language === "latin") {
    paragraphs[0] =
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. " + paragraphs[0];
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
