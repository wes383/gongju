/**
 * Chinese typography (中文排版) helpers.
 *
 * The main job is 盘古之白: a space between CJK characters and Latin letters or
 * digits so mixed text stops looking cramped. Typography around punctuation,
 * quote style and full-width letters are separate, opt-in passes.
 *
 * URLs and e-mail addresses are masked before any pass runs, because inserting
 * spaces inside them would break copy-paste.
 */

export interface PanguOptions {
  /** Space between CJK and Latin letters / digits / symbols */
  spacing: boolean;
  /** Convert half-width , ; : ? ! . to Chinese punctuation when next to CJK */
  punctuation: boolean;
  /** Turn straight quotes into “ ” and ‘ ’ */
  quotes: boolean;
  /** Full-width letters and digits to half-width */
  fullwidth: boolean;
  /** Half-width brackets and commas to full-width (Chinese context) */
  halfwidthPunct: boolean;
  /** Trim line ends and collapse runs of blank lines */
  trim: boolean;
}

export const DEFAULT_PANGU: PanguOptions = {
  spacing: true,
  punctuation: false,
  quotes: false,
  fullwidth: true,
  halfwidthPunct: false,
  trim: true,
};

// Ideographs only: CJK punctuation must not trigger a space before Latin text
const CJK = "\\u3400-\\u4dbf\\u4e00-\\u9fff\\uf900-\\ufaff";
const ANSI = "A-Za-z0-9\\u0370-\\u03ff@#$%^&*_+=|\\\\<>~`";

const CJK_RE = new RegExp(`[${CJK}]`);
const CJK_TO_ANSI = new RegExp(`([${CJK}])([${ANSI}])`, "g");
const ANSI_TO_CJK = new RegExp(`([${ANSI}])([${CJK}])`, "g");

const TOKEN_RE = /(https?:\/\/[^\s"'<>）】]+|mailto:[^\s"'<>]+|[\w.+-]+@[\w-]+(?:\.[\w-]+)+)/g;

export function hasCjk(text: string): boolean {
  return CJK_RE.test(text);
}

/** Mask URLs and e-mails so later passes cannot touch them */
function mask(text: string): { text: string; tokens: string[] } {
  const tokens: string[] = [];
  const masked = text.replace(TOKEN_RE, (match) => {
    tokens.push(match);
    return `\u0000${tokens.length - 1}\u0000`;
  });
  return { text: masked, tokens };
}

function unmask(text: string, tokens: string[]): string {
  return text.replace(/\u0000(\d+)\u0000/g, (_, index: string) => tokens[Number(index)] ?? "");
}

/** Insert the single space CJK typography expects; returns how many were added */
export function addSpacing(text: string): { text: string; added: number } {
  const { text: masked, tokens } = mask(text);
  const before = (masked.match(/ /g) ?? []).length;
  const spaced = masked.replace(CJK_TO_ANSI, "$1 $2").replace(ANSI_TO_CJK, "$1 $2");
  const after = (spaced.match(/ /g) ?? []).length;
  return { text: unmask(spaced, tokens), added: after - before };
}

/** Full-width letters, digits and the ideographic space to half-width */
export function fullwidthToHalfwidth(text: string): string {
  return text
    .replace(/[\uff21-\uff3a\uff41-\uff5a\uff10-\uff19]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
    )
    .replace(/\u3000/g, " ");
}

/** Half-width commas and brackets to full-width, but only around CJK text */
export function halfwidthToFullwidthPunct(text: string): string {
  return text
    .replace(/([\u4e00-\u9fff]),/g, "$1，")
    .replace(/,([\u4e00-\u9fff])/g, "，$1")
    .replace(/([\u4e00-\u9fff]);/g, "$1；")
    .replace(/([\u4e00-\u9fff])!/g, "$1！")
    .replace(/([\u4e00-\u9fff])\?(?!\?)/g, "$1？")
    .replace(/([\u4e00-\u9fff]):(?!\/)/g, "$1：")
    .replace(/\(([^()]*[\u4e00-\u9fff][^()]*)\)/g, "（$1）");
}

/** Half-width punctuation to Chinese punctuation when it follows CJK */
export function chinesePunctuation(text: string): string {
  return text
    .replace(/([\u4e00-\u9fff]),+(?!\d)/g, "$1，")
    .replace(/([\u4e00-\u9fff]);/g, "$1；")
    .replace(/([\u4e00-\u9fff]):(?!\/\/)/g, "$1：")
    .replace(/([\u4e00-\u9fff])\?(?!=)/g, "$1？")
    .replace(/([\u4e00-\u9fff])!(?!=)/g, "$1！")
    .replace(/([\u4e00-\u9fff])\.(?=\s|$|\n)/g, "$1。");
}

/** Straight quotes to curly ones; skipped for text without CJK */
export function curlyQuotes(text: string): string {
  if (!hasCjk(text)) return text;
  let doubleOpen = true;
  let singleOpen = true;
  let out = "";
  for (const ch of text) {
    if (ch === '"') {
      out += doubleOpen ? "“" : "”";
      doubleOpen = !doubleOpen;
    } else if (ch === "'") {
      out += singleOpen ? "‘" : "’";
      singleOpen = !singleOpen;
    } else {
      out += ch;
    }
  }
  return out;
}

/** Trailing spaces per line, and runs of 3+ newlines down to one blank line */
export function tidyWhitespace(text: string): string {
  return text
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n");
}

export interface PanguResult {
  text: string;
  /** Spaces inserted between CJK and Latin text */
  added: number;
}

export function pangu(input: string, options: PanguOptions = DEFAULT_PANGU): PanguResult {
  let text = input;
  let added = 0;

  if (options.fullwidth) text = fullwidthToHalfwidth(text);
  if (options.spacing) {
    const spaced = addSpacing(text);
    text = spaced.text;
    added = spaced.added;
  }
  if (options.halfwidthPunct) text = halfwidthToFullwidthPunct(text);
  if (options.punctuation) text = chinesePunctuation(text);
  if (options.quotes) text = curlyQuotes(text);
  if (options.trim) text = tidyWhitespace(text);

  return { text, added };
}

/** Copy used by the tool when the user has not typed anything */
export const PANGU_SAMPLE = `2024年Q3,我们在Next.js 15上把API响应时间从320ms降到了85ms.
使用React Server Components后,首屏LCP提升了40%.详细数据见README.md或访问https://example.com/docs?v=2.
负责人:张三(前端),邮箱 dev@example.com.`;
