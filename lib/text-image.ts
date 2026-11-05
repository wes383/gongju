/**
 * Layout engine for the text-to-image tool.
 *
 * Everything here is pure: wrapping and pagination take a `measure` callback
 * instead of a canvas, so the rules can be unit tested with a stub and the
 * component can feed them real `measureText` values. Nothing in this module
 * touches the DOM.
 */

import { codedError } from "./errors";

export type BlockKind = "h1" | "h2" | "quote" | "body" | "bullet" | "space";

export interface Block {
  kind: BlockKind;
  text: string;
}

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
export const MAX_FONT = 160;

/** Page cap: a wall of text should be split by the user, not by an endless loop */
export const MAX_PAGES = 40;

/**
 * Canvas limits in practice: Chrome stops at 32767px on the long edge, and
 * mobile Safari caps the total area near 16M pixels. Staying inside both keeps
 * a single long image exportable on phones.
 */
export const MAX_AUTO_HEIGHT = 12000;
export const MAX_CANVAS_AREA = 16_000_000;

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

export interface TextTheme {
  id: "paper" | "ink" | "mono" | "dusk" | "forest";
  label: { zh: string; en: string };
  /** Background gradient, top-left to bottom-right */
  from: string;
  to: string;
  text: string;
  muted: string;
  accent: string;
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

export function textTheme(id: TextTheme["id"]): TextTheme {
  return TEXT_THEMES.find((item) => item.id === id) ?? TEXT_THEMES[0];
}

/**
 * Split source text into styled blocks. Only line-leading markers are honoured
 * (`#`, `##`, `>`, `-`); inline Markdown stays literal, because silently
 * stripping asterisks from pasted text would change what the user asked to
 * render.
 */
export function parseBlocks(source: string): Block[] {
  const blocks: Block[] = [];
  const lines = source.replace(/\r\n?/g, "\n").split("\n");

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      if (blocks.length > 0 && blocks[blocks.length - 1].kind !== "space") {
        blocks.push({ kind: "space", text: "" });
      }
      continue;
    }

    if (/^#{2,6}\s+/.test(line)) {
      blocks.push({ kind: "h2", text: line.replace(/^#{2,6}\s+/, "") });
    } else if (/^#\s+/.test(line)) {
      blocks.push({ kind: "h1", text: line.replace(/^#\s+/, "") });
    } else if (/^>\s?/.test(line)) {
      blocks.push({ kind: "quote", text: line.replace(/^>\s?/, "") });
    } else if (/^[-*+]\s+/.test(line)) {
      blocks.push({ kind: "bullet", text: `• ${line.replace(/^[-*+]\s+/, "")}` });
    } else {
      blocks.push({ kind: "body", text: line });
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

  for (const token of tokens) {
    const candidate = line + token;
    if (measure(candidate) <= maxWidth) {
      line = candidate;
      continue;
    }

    // A lone token that cannot fit is broken by character
    if (line.trim() === "") {
      let chunk = "";
      for (const char of Array.from(token)) {
        if (chunk && measure(chunk + char) > maxWidth) {
          lines.push(chunk);
          chunk = char;
        } else {
          chunk += char;
        }
      }
      line = chunk;
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
    line = rest.trimStart();
  }

  if (line.trim()) lines.push(line.trimEnd());
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
        lineHeight: Math.round(size * 1.34),
        indent: 0,
        spaceBefore: Math.round(base * 0.34),
        spaceAfter: Math.round(base * 0.16),
        keepWithNext: Math.round(body * 1.1),
      };
    }
    case "quote": {
      const size = Math.round(base * 0.96);
      return {
        font: fontSpec(400, size, family),
        size,
        lineHeight: Math.round(size * 1.62),
        indent: Math.round(base * 0.85),
        spaceBefore: Math.round(base * 0.24),
        spaceAfter: Math.round(base * 0.5),
        keepWithNext: 0,
      };
    }
    case "bullet":
      return {
        font: fontSpec(400, base, family),
        size: Math.round(base),
        lineHeight: body,
        indent: 0,
        spaceBefore: 0,
        spaceAfter: Math.round(base * 0.22),
        keepWithNext: 0,
      };
    case "space":
      return {
        font: "",
        size: 0,
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
        lineHeight: body,
        indent: 0,
        spaceBefore: 0,
        spaceAfter: Math.round(base * 0.52),
        keepWithNext: 0,
      };
  }
}

export interface PlacedLine {
  text: string;
  kind: BlockKind;
  size: number;
  font: string;
  /** Distance from the content top to the top of this line box */
  top: number;
  lineHeight: number;
  indent: number;
  /** Quote blocks draw a vertical rule to the left of the indent */
  rule: boolean;
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
    const lines = wrapText(block.text, options.width - spec.indent, (value) =>
      measure(value, spec.font)
    );

    lines.forEach((text, index) => {
      let gap = index === 0 && current().length > 0 ? spec.spaceBefore : 0;
      const reserve = index === 0 ? spec.keepWithNext : 0;

      if (current().length > 0 && y + gap + spec.lineHeight + reserve > options.height) {
        pages.push([]);
        y = 0;
        gap = 0;
      }

      y += gap;
      current().push({
        text,
        kind: block.kind,
        size: spec.size,
        font: spec.font,
        top: y,
        lineHeight: spec.lineHeight,
        indent: spec.indent,
        rule: block.kind === "quote",
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
