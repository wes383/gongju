/**
 * Layout engine for the text-to-image tool.
 *
 * Everything here is pure: wrapping and pagination take a `measure` callback
 * instead of a canvas, so the rules can be unit tested with a stub and the
 * component can feed them real `measureText` values. Nothing in this module
 * touches the DOM.
 */

import { codedError } from "./errors";

export type BlockKind = "h1" | "h2" | "h3" | "quote" | "body" | "bullet" | "ordered" | "hr" | "space";

/** Which inline Markdown the run was written with */
export interface RunStyle {
  bold: boolean;
  italic: boolean;
  code: boolean;
  strike: boolean;
}

export interface InlineRun extends RunStyle {
  text: string;
}

export interface Block {
  kind: BlockKind;
  text: string;
  /** Inline runs; plain mode produces a single unstyled run */
  runs: InlineRun[];
}

/** Monospace face for inline code, with the usual suspects behind it */
export const CODE_FAMILY = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

export interface SizePreset {
  id: "story" | "square" | "card" | "a4";
  width: number;
  height: number;
  label: { zh: string; en: string };
}

export const SIZE_PRESETS: SizePreset[] = [
  {
    id: "story",
    width: 1080,
    height: 1920,
    label: { zh: "竖版 1080×1920", en: "Story 1080×1920" },
  },
  {
    id: "square",
    width: 1080,
    height: 1080,
    label: { zh: "方形 1080×1080", en: "Square 1080×1080" },
  },
  {
    id: "card",
    width: 1200,
    height: 630,
    label: { zh: "横版 1200×630", en: "Wide 1200×630" },
  },
  {
    id: "a4",
    width: 1240,
    height: 1754,
    label: { zh: "A4 1240×1754", en: "A4 1240×1754" },
  },
];

export const MIN_EDGE = 200;
export const MAX_EDGE = 4000;
export const MIN_FONT = 12;
/** Big poster type: a 1080px card takes a single 800px glyph edge to edge */
export const MAX_FONT = 800;

/** Page cap: a wall of text should be split by the user, not by an endless loop */
export const MAX_PAGES = 40;

/**
 * Canvas limits in practice: Chrome stops at 32767px on the long edge, so the
 * height ceiling stays well below it. The area budget is deliberately larger
 * than the 16M a phone can hold: a long article at a readable size needs the
 * height, and the paged mode remains the fallback for anything longer.
 */
export const MAX_AUTO_HEIGHT = 20000;
export const MAX_CANVAS_AREA = 24_000_000;

/** Tallest image a given width can produce without hitting those limits */
export function autoHeightCap(width: number): number {
  return Math.max(1000, Math.min(MAX_AUTO_HEIGHT, Math.floor(MAX_CANVAS_AREA / Math.max(1, width))));
}

/** Smallest size the auto-shrink will go to before giving up */
export const MIN_FIT_FONT = 10;

export function clampEdge(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(MAX_EDGE, Math.max(MIN_EDGE, Math.round(value)));
}

export function clampFont(value: number): number {
  if (!Number.isFinite(value)) return 32;
  return Math.min(MAX_FONT, Math.max(MIN_FONT, Math.round(value)));
}

/**
 * Line height is a multiple of the type size, so the floor is 1: anything
 * tighter and consecutive lines start to overlap.
 */
export const MIN_LINE_HEIGHT = 1;
export const MAX_LINE_HEIGHT = 3;

export function clampLineHeight(value: number): number {
  if (!Number.isFinite(value)) return 1.5;
  return Math.min(MAX_LINE_HEIGHT, Math.max(MIN_LINE_HEIGHT, Math.round(value * 100) / 100));
}

/** Padding in px; half the canvas width is already unusable, so 600 is plenty */
export const MIN_PADDING = 0;
export const MAX_PADDING = 600;

export function clampPadding(value: number): number {
  if (!Number.isFinite(value)) return 96;
  return Math.min(MAX_PADDING, Math.max(MIN_PADDING, Math.round(value)));
}

export type ThemeId = "paper" | "ink" | "mono" | "dusk" | "forest";

/** Only the colours matter to the painter, so a solid fill can stand in for a palette */
export interface ThemeColors {
  /** Background gradient, top-left to bottom-right; equal stops mean a flat fill */
  from: string;
  to: string;
  text: string;
  muted: string;
  accent: string;
}

export interface TextTheme extends ThemeColors {
  id: ThemeId;
  label: { zh: string; en: string };
}

export const TEXT_THEMES: TextTheme[] = [
  {
    id: "paper",
    label: { zh: "暖纸", en: "Paper" },
    from: "#fcfbf8",
    to: "#eee8dd",
    text: "#23201b",
    muted: "#6d6459",
    accent: "#b45309",
  },
  {
    id: "ink",
    label: { zh: "墨黑", en: "Ink" },
    from: "#14161b",
    to: "#20252d",
    text: "#f6f7f9",
    muted: "#a2a9b4",
    accent: "#6ea8fe",
  },
  {
    id: "mono",
    label: { zh: "素白", en: "Mono" },
    from: "#ffffff",
    to: "#f3f3f5",
    text: "#121316",
    muted: "#6b7280",
    accent: "#111827",
  },
  {
    id: "dusk",
    label: { zh: "靛霞", en: "Dusk" },
    from: "#312e81",
    to: "#0f766e",
    text: "#ffffff",
    muted: "#d6daf5",
    accent: "#fbbf24",
  },
  {
    id: "forest",
    label: { zh: "松绿", en: "Forest" },
    from: "#0b3b2e",
    to: "#14532d",
    text: "#eaf6ee",
    muted: "#a7c9b4",
    accent: "#fde68a",
  },
];

export function textTheme(id: ThemeId): TextTheme {
  return TEXT_THEMES.find((item) => item.id === id) ?? TEXT_THEMES[0];
}

/** Expand `#abc` / `#AABBCC` to a lowercase six-digit hex, or null if unusable */
export function normalizeHex(value: string): string | null {
  const body = value.trim().replace(/^#/, "").replace(/^0x/i, "");
  if (/^[0-9a-f]{3}$/i.test(body)) {
    const expanded = Array.from(body)
      .map((char) => char + char)
      .join("");
    return `#${expanded.toLowerCase()}`;
  }
  if (/^[0-9a-f]{6}$/i.test(body)) return `#${body.toLowerCase()}`;
  return null;
}

/** WCAG relative luminance, used to decide which way the text should go */
export function relativeLuminance(hex: string): number {
  const normalized = normalizeHex(hex) ?? "#ffffff";
  const channels = [1, 3, 5].map((offset) => {
    const value = Number.parseInt(normalized.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/**
 * A flat background still needs legible type: pick ink or paper from the
 * background's luminance instead of inheriting the palette's text colour, which
 * would be invisible on half of the swatches.
 */
export function solidTheme(background: string): ThemeColors {
  const fill = normalizeHex(background) ?? "#ffffff";
  const light = relativeLuminance(fill) > 0.179;
  return {
    from: fill,
    to: fill,
    text: light ? "#14161b" : "#f6f7f9",
    muted: light ? "#5b6472" : "#a8b0bd",
    accent: light ? "#b45309" : "#fbbf24",
  };
}

export type ParseMode = "smart" | "plain";

const PLAIN_STYLE: RunStyle = { bold: false, italic: false, code: false, strike: false };

function plainRun(text: string): InlineRun {
  return { text, ...PLAIN_STYLE };
}

/**
 * Inline Markdown for a single line: `code`, **bold**, *italic* and ~~struck~~.
 * Underscores are left alone on purpose — `snake_case_name` in a pasted code
 * sample should not come out in italics. Anything unmatched stays literal.
 */
export function parseInline(text: string): InlineRun[] {
  if (!text) return [];

  const pattern = /`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*|~~([^~]+)~~/g;
  const runs: InlineRun[] = [];
  let end = 0;

  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start > end) runs.push(plainRun(text.slice(end, start)));

    runs.push({
      text: match[1] ?? match[2] ?? match[3] ?? match[4] ?? "",
      bold: match[2] !== undefined,
      italic: match[3] !== undefined,
      code: match[1] !== undefined,
      strike: match[4] !== undefined,
    });
    end = start + match[0].length;
  }

  if (end < text.length) runs.push(plainRun(text.slice(end)));
  return runs;
}

/** A line made only of three or more dashes, stars or underscores */
const HORIZONTAL_RULE = /^(?:-{3,}|\*{3,}|_{3,})$/;

/**
 * Split source text into styled blocks.
 *
 * `smart` honours line-leading markers (`#`, `###`, `>`, `-`, `1.`, `---`) and
 * inline emphasis (bold, italic, code, strikethrough). `plain` treats every
 * line as body text, so markers and asterisks that belong to the content
 * survive verbatim.
 */
export function parseBlocks(source: string, mode: ParseMode = "smart"): Block[] {
  const blocks: Block[] = [];
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const plain = mode === "plain";

  const push = (kind: BlockKind, text: string) => {
    const runs = plain ? [plainRun(text)] : parseInline(text);
    // The block keeps the words without their markers, so callers never have to
    // strip anything themselves
    blocks.push({ kind, text: runs.map((run) => run.text).join(""), runs });
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      if (blocks.length > 0 && blocks[blocks.length - 1].kind !== "space") {
        blocks.push({ kind: "space", text: "", runs: [] });
      }
      continue;
    }

    if (plain) {
      push("body", line);
    } else if (HORIZONTAL_RULE.test(line)) {
      push("hr", "");
    } else if (/^#{3,6}\s+/.test(line)) {
      push("h3", line.replace(/^#{3,6}\s+/, ""));
    } else if (/^##\s+/.test(line)) {
      push("h2", line.replace(/^##\s+/, ""));
    } else if (/^#\s+/.test(line)) {
      push("h1", line.replace(/^#\s+/, ""));
    } else if (/^>\s?/.test(line)) {
      push("quote", line.replace(/^>\s?/, ""));
    } else if (/^\d{1,3}[.)]\s+/.test(line)) {
      push("ordered", line);
    } else if (/^[-*+]\s+/.test(line)) {
      push("bullet", `• ${line.replace(/^[-*+]\s+/, "")}`);
    } else {
      push("body", line);
    }
  }

  while (blocks.length > 0 && blocks[blocks.length - 1].kind === "space") blocks.pop();
  return blocks;
}

/** Wide glyphs break between characters; Latin words only break at spaces */
const WIDE = /[\u2E80-\u9FFF\u3000-\u303F\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFFEF]/;

/** Punctuation that may not begin a line */
const NO_LINE_START = "、。，．,.!?！？；;：:）)］]｝}】》」』”’…—·%";

/** Punctuation that may not end a line */
const NO_LINE_END = "（(［[｛{【《「『“‘";

function tokenize(text: string): string[] {
  const tokens: string[] = [];
  let word = "";

  for (const char of Array.from(text)) {
    if (char === " " || char === "\t") {
      // Keep the space attached to the word it follows so widths stay exact
      if (word) {
        tokens.push(`${word} `);
        word = "";
      } else if (tokens.length > 0) {
        tokens.push(" ");
      }
      continue;
    }
    if (WIDE.test(char)) {
      if (word) {
        tokens.push(word);
        word = "";
      }
      tokens.push(char);
      continue;
    }
    word += char;
  }

  if (word) tokens.push(word);
  return tokens;
}

export type Measure = (text: string, font: string) => number;

/**
 * Cut a token that is wider than a whole line into character-level chunks.
 * Used for URLs and hashes, which have no space to break at.
 */
function breakToken(token: string, maxWidth: number, measure: (value: string) => number): string[] {
  const chunks: string[] = [];
  let chunk = "";

  for (const char of Array.from(token)) {
    if (chunk === "" || measure(chunk + char) <= maxWidth) {
      chunk += char;
      continue;
    }
    chunks.push(chunk);
    chunk = char;
  }

  if (chunk) chunks.push(chunk);
  return chunks;
}

/**
 * Greedy line breaking over tokens, with the two CJK line-break rules that
 * matter most: closing punctuation never starts a line and opening brackets
 * never end one. A token wider than the line on its own is split by character
 * so a pasted URL cannot overflow the canvas.
 */
export function wrapText(text: string, maxWidth: number, measure: (value: string) => number): string[] {
  if (!text.trim() || maxWidth <= 0) return [];

  const tokens = tokenize(text);
  const lines: string[] = [];
  let line = "";

  /**
   * Put a token on a fresh line, cutting it up if it is too wide for one.
   * Every chunk but the last is closed immediately; the last stays open so the
   * next token can still share the line.
   */
  const startLine = (token: string) => {
    if (measure(token) <= maxWidth) {
      line = token;
      return;
    }
    const chunks = breakToken(token, maxWidth, measure);
    lines.push(...chunks.slice(0, -1));
    line = chunks[chunks.length - 1] ?? "";
  };

  for (const token of tokens) {
    const candidate = line + token;
    if (measure(candidate) <= maxWidth) {
      line = candidate;
      continue;
    }

    // Nothing on this line yet, so the token itself has to be cut
    if (line.trim() === "") {
      startLine(token);
      continue;
    }

    // Closing punctuation stays with the line it closes, even if it overflows
    if (NO_LINE_START.includes(Array.from(token)[0])) {
      line = candidate;
      continue;
    }

    let rest = token;
    let head = line;
    const chars = Array.from(head);
    if (NO_LINE_END.includes(chars[chars.length - 1])) {
      rest = chars[chars.length - 1] + rest;
      head = chars.slice(0, -1).join("");
    }

    if (head.trim()) lines.push(head.trimEnd());
    // A token moved to its own line may still be wider than that line — a URL
    // after a sentence used to be pushed out whole and overflow the canvas
    startLine(rest.trimStart());
  }

  if (line.trim()) lines.push(line.trimEnd());
  return lines;
}

interface StyledToken {
  text: string;
  style: RunStyle;
}

/** Flatten runs into the word and character tokens wrapText breaks on */
function styledTokens(runs: InlineRun[]): StyledToken[] {
  const tokens: StyledToken[] = [];
  for (const run of runs) {
    // Only the flags, so merging a token back cannot carry the run's text along
    const style: RunStyle = { bold: run.bold, italic: run.italic, code: run.code, strike: run.strike };
    for (const token of tokenize(run.text)) tokens.push({ text: token, style });
  }
  return tokens;
}

/** Fold neighbouring tokens back into as few runs as the styling allows */
function mergeTokens(tokens: StyledToken[]): InlineRun[] {
  const runs: InlineRun[] = [];

  for (const token of tokens) {
    const last = runs[runs.length - 1];
    const same =
      last &&
      last.bold === token.style.bold &&
      last.italic === token.style.italic &&
      last.code === token.style.code &&
      last.strike === token.style.strike;

    if (same) last.text += token.text;
    else runs.push({ text: token.text, ...token.style });
  }

  // The space carried along with the last word does not belong to the line
  const tail = runs[runs.length - 1];
  if (tail) tail.text = tail.text.replace(/\s+$/, "");
  return runs.filter((run) => run.text !== "");
}

/**
 * The same greedy line breaking as `wrapText`, but every token keeps the style
 * it was written with, so bold and italic survive a line break.
 */
export function wrapRuns(
  runs: InlineRun[],
  maxWidth: number,
  fontFor: (style: RunStyle) => string,
  measure: Measure
): InlineRun[][] {
  if (maxWidth <= 0) return [];

  const tokens = styledTokens(runs);
  if (tokens.length === 0) return [];

  const widthOf = (token: StyledToken) => measure(token.text, fontFor(token.style));
  const widthOfLine = (line: StyledToken[]) => line.reduce((total, token) => total + widthOf(token), 0);

  const lines: InlineRun[][] = [];
  let line: StyledToken[] = [];

  const flush = () => {
    const merged = mergeTokens(line);
    if (merged.length > 0) lines.push(merged);
    line = [];
  };

  /** Cut a token that is wider than a whole line into character chunks */
  const chunksOf = (token: StyledToken): StyledToken[] => {
    const font = fontFor(token.style);
    const chunks = breakToken(token.text, maxWidth, (value) => measure(value, font));
    return chunks.map((text) => ({ text, style: token.style }));
  };

  /** Open a line with a token, closing every chunk but the last as its own line */
  const startLine = (token: StyledToken) => {
    const chunks = chunksOf(token);
    const last = chunks.pop();
    for (const chunk of chunks) lines.push(mergeTokens([chunk]));
    line = last ? [last] : [];
  };

  for (const token of tokens) {
    if (widthOfLine([...line, token]) <= maxWidth) {
      line.push(token);
      continue;
    }

    if (line.length === 0) {
      startLine(token);
      continue;
    }

    // Closing punctuation stays with the line it closes, even if it overflows
    if (NO_LINE_START.includes(Array.from(token.text)[0])) {
      line.push(token);
      continue;
    }

    let rest = token;
    const tail = line[line.length - 1];
    const chars = Array.from(tail.text);
    if (NO_LINE_END.includes(chars[chars.length - 1])) {
      const opened = chars.pop() ?? "";
      rest = { text: opened + token.text, style: token.style };
      line = [...line.slice(0, -1), { text: chars.join(""), style: tail.style }];
    }

    flush();
    // A token moved to its own line may still be too wide there
    startLine(rest);
  }

  flush();
  return lines;
}

export interface LayoutOptions {
  /** Base body size in px; every other block scales from it */
  size: number;
  /** Body line height multiplier */
  lineHeight: number;
  /** Content width inside the page padding */
  width: number;
  /** Content height inside the page padding */
  height: number;
  /** Full CSS font family list */
  fontFamily: string;
}

export interface TextStyleSpec {
  font: string;
  size: number;
  weight: number;
  lineHeight: number;
  indent: number;
  spaceBefore: number;
  spaceAfter: number;
  /** Extra room a heading needs below it so it never sits alone at a page foot */
  keepWithNext: number;
}

function fontSpec(weight: number, size: number, family: string): string {
  return `${weight} ${Math.round(size)}px ${family}`;
}

/** Font a run is drawn with: inline code switches to monospace, bold lifts the weight */
export function runFont(size: number, weight: number, family: string, style: RunStyle): string {
  const face = style.code ? CODE_FAMILY : family;
  const lifted = style.bold ? Math.max(700, weight) : weight;
  return `${style.italic ? "italic " : ""}${lifted} ${Math.round(size)}px ${face}`;
}

export function styleFor(kind: BlockKind, options: LayoutOptions): TextStyleSpec {
  const base = options.size;
  const family = options.fontFamily;
  const body = Math.round(base * options.lineHeight);

  switch (kind) {
    case "h1": {
      const size = Math.round(base * 1.7);
      return {
        font: fontSpec(700, size, family),
        size,
        weight: 700,
        lineHeight: Math.round(size * 1.22),
        indent: 0,
        spaceBefore: Math.round(base * 0.55),
        spaceAfter: Math.round(base * 0.3),
        keepWithNext: Math.round(body * 1.1),
      };
    }
    case "h2": {
      const size = Math.round(base * 1.24);
      return {
        font: fontSpec(600, size, family),
        size,
        weight: 600,
        lineHeight: Math.round(size * 1.34),
        indent: 0,
        spaceBefore: Math.round(base * 0.34),
        spaceAfter: Math.round(base * 0.16),
        keepWithNext: Math.round(body * 1.1),
      };
    }
    case "h3": {
      const size = Math.round(base * 1.1);
      return {
        font: fontSpec(600, size, family),
        size,
        weight: 600,
        lineHeight: Math.round(size * 1.42),
        indent: 0,
        spaceBefore: Math.round(base * 0.3),
        spaceAfter: Math.round(base * 0.12),
        keepWithNext: Math.round(body * 1.05),
      };
    }
    case "quote": {
      const size = Math.round(base * 0.96);
      return {
        font: fontSpec(400, size, family),
        size,
        weight: 400,
        lineHeight: Math.round(size * 1.62),
        indent: Math.round(base * 0.85),
        spaceBefore: Math.round(base * 0.24),
        spaceAfter: Math.round(base * 0.5),
        keepWithNext: 0,
      };
    }
    case "bullet":
    case "ordered":
      return {
        font: fontSpec(400, base, family),
        size: Math.round(base),
        weight: 400,
        lineHeight: body,
        indent: 0,
        spaceBefore: 0,
        spaceAfter: Math.round(base * 0.22),
        keepWithNext: 0,
      };
    case "hr":
      // No text: the line box only reserves room for the drawn rule
      return {
        font: "",
        size: 0,
        weight: 400,
        lineHeight: Math.round(base * 1.3),
        indent: 0,
        spaceBefore: Math.round(base * 0.4),
        spaceAfter: Math.round(base * 0.4),
        keepWithNext: 0,
      };
    case "space":
      return {
        font: "",
        size: 0,
        weight: 400,
        lineHeight: Math.round(base * 0.58),
        indent: 0,
        spaceBefore: 0,
        spaceAfter: 0,
        keepWithNext: 0,
      };
    case "body":
    default:
      return {
        font: fontSpec(400, base, family),
        size: Math.round(base),
        weight: 400,
        lineHeight: body,
        indent: 0,
        spaceBefore: 0,
        spaceAfter: Math.round(base * 0.52),
        keepWithNext: 0,
      };
  }
}

/** One laid-out line, already cut to the content width */
export interface PlacedLine {
  /** Styled pieces of the line, in reading order */
  runs: InlineRun[];
  /** The same text unstyled, for measuring and for tests */
  text: string;
  kind: BlockKind;
  size: number;
  weight: number;
  /** Font of an unstyled run */
  font: string;
  /** Distance from the content top to the top of this line box */
  top: number;
  lineHeight: number;
  indent: number;
  /** Quote blocks draw a vertical rule to the left of the indent */
  rule: boolean;
  /**
   * Where the rule starts and ends. The first and last line of a quote hug the
   * glyphs, so the bar reads as tall as the text; the lines in between run the
   * full box so the pieces join into one continuous bar.
   */
  ruleFromText?: boolean;
  ruleToText?: boolean;
}

/**
 * Wrap and paginate every block. Pages are returned in reading order; a block
 * that does not fit starts a new page, and headings keep one body line below
 * them so they never dangle at the bottom.
 */
export function layoutPages(
  blocks: Block[],
  options: LayoutOptions,
  measure: Measure
): PlacedLine[][] {
  const pages: PlacedLine[][] = [[]];
  let y = 0;

  const current = () => pages[pages.length - 1];

  for (const block of blocks) {
    if (block.kind === "space") {
      if (current().length > 0) y += styleFor("space", options).lineHeight;
      continue;
    }

    const spec = styleFor(block.kind, options);
    const fontFor = (style: RunStyle) => runFont(spec.size, spec.weight, options.fontFamily, style);
    // A rule carries no text: one empty line is enough to hold the drawn line
    const lines =
      block.kind === "hr"
        ? [[]]
        : wrapRuns(block.runs, options.width - spec.indent, fontFor, measure);

    lines.forEach((runs, index) => {
      let gap = index === 0 && current().length > 0 ? spec.spaceBefore : 0;
      const reserve = index === 0 ? spec.keepWithNext : 0;

      if (current().length > 0 && y + gap + spec.lineHeight + reserve > options.height) {
        pages.push([]);
        y = 0;
        gap = 0;
      }

      y += gap;
      current().push({
        runs,
        text: runs.map((run) => run.text).join(""),
        kind: block.kind,
        size: spec.size,
        weight: spec.weight,
        font: spec.font,
        top: y,
        lineHeight: spec.lineHeight,
        indent: spec.indent,
        rule: block.kind === "quote",
        ruleFromText: block.kind === "quote" && index === 0,
        ruleToText: block.kind === "quote" && index === lines.length - 1,
      });
      y += spec.lineHeight;
    });

    if (lines.length > 0) y += spec.spaceAfter;
  }

  while (pages.length > 1 && pages[pages.length - 1].length === 0) pages.pop();
  if (pages.length > MAX_PAGES) throw codedError("textimg.long", String(MAX_PAGES));
  return pages;
}

/** Total height a page actually uses, for vertical centring */
export function usedHeight(page: PlacedLine[]): number {
  if (page.length === 0) return 0;
  const last = page[page.length - 1];
  return last.top + last.lineHeight;
}

/** Tall enough that the paginator never breaks, so the flow comes back whole */
const UNBOUNDED = 1e7;

function onePage(blocks: Block[], options: LayoutOptions, measure: Measure): PlacedLine[] {
  return layoutPages(blocks, { ...options, height: UNBOUNDED }, measure)[0] ?? [];
}

export interface SingleLayout {
  lines: PlacedLine[];
  /** Content height actually used, padding excluded */
  height: number;
  /** Body size that was used, smaller than requested when the type was scaled */
  size: number;
  /** True when the type was scaled down to keep everything on one image */
  shrunk: boolean;
}

/**
 * Lay the whole document out on a single canvas.
 *
 * Height is whatever the text needs, so nothing is ever paged away. When that
 * would exceed the canvas limits the body size is reduced instead — the last
 * resort, because unreadably small text is still worse than a tall image.
 */
export function layoutSingle(
  blocks: Block[],
  options: LayoutOptions,
  measure: Measure,
  maxHeight: number
): SingleLayout {
  const natural = onePage(blocks, options, measure);
  const naturalHeight = usedHeight(natural);
  if (naturalHeight <= maxHeight) {
    return { lines: natural, height: naturalHeight, size: options.size, shrunk: false };
  }

  // Binary search the largest size that still fits the cap
  let low = Math.min(MIN_FIT_FONT, options.size);
  let high = options.size;
  let best: SingleLayout | null = null;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const lines = onePage(blocks, { ...options, size: mid }, measure);
    const height = usedHeight(lines);
    if (height <= maxHeight) {
      best = { lines, height, size: mid, shrunk: true };
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  if (best) return best;
  throw codedError("textimg.overflow");
}
