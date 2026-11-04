/**
 * Shared bits for the Open Graph card generator.
 *
 * The drawing itself happens on a canvas in the browser, so this module only
 * holds what can be decided without one: the canonical 1200x630 frame, the
 * palette presets, text hygiene and the title size ladder. Wrapping is done
 * against real `measureText` metrics in the component, because guessing glyph
 * widths would put line breaks in the wrong place for CJK titles.
 */

/** The size every crawler and chat client expects */
export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

export interface OgTheme {
  id: "light" | "dark" | "accent";
  label: { zh: string; en: string };
  /** Two stops of the background gradient, top-left to bottom-right */
  from: string;
  to: string;
  title: string;
  body: string;
  accent: string;
}

export const OG_THEMES: OgTheme[] = [
  {
    id: "light",
    label: { zh: "浅色", en: "Light" },
    from: "#fcfbfa",
    to: "#eef1f6",
    title: "#14161a",
    body: "#4b5563",
    accent: "#2563eb",
  },
  {
    id: "dark",
    label: { zh: "深色", en: "Dark" },
    from: "#14161a",
    to: "#23272f",
    title: "#f7f7f8",
    body: "#a1a7b3",
    accent: "#60a5fa",
  },
  {
    id: "accent",
    label: { zh: "彩色", en: "Vivid" },
    from: "#312e81",
    to: "#0f766e",
    title: "#ffffff",
    body: "#d7dbff",
    accent: "#fbbf24",
  },
];

export function ogTheme(id: OgTheme["id"]): OgTheme {
  return OG_THEMES.find((item) => item.id === id) ?? OG_THEMES[0];
}

/** Guards against a paste that turns a 1200x630 card into a wall of text */
export const OG_TITLE_LIMIT = 120;
export const OG_DESCRIPTION_LIMIT = 220;

/** Collapse newlines and runs of spaces, then cut at the limit */
export function cardText(value: string, limit: number): string {
  const flat = value.replace(/\s+/g, " ").trim();
  return flat.length > limit ? flat.slice(0, limit).trimEnd() : flat;
}

/**
 * Titles step down with length so a long headline still fits three lines.
 * Values are picked against the 1016px text column with a 1.15 line height.
 */
const TITLE_STEPS: { max: number; size: number }[] = [
  { max: 28, size: 84 },
  { max: 42, size: 72 },
  { max: 60, size: 62 },
  { max: 84, size: 54 },
  { max: Number.POSITIVE_INFINITY, size: 46 },
];

export function titleFontSize(title: string): number {
  const length = [...cardText(title, OG_TITLE_LIMIT)].length;
  return (TITLE_STEPS.find((step) => length <= step.max) ?? TITLE_STEPS[TITLE_STEPS.length - 1])
    .size;
}

/** Body copy steps down once the description is long enough to need a third line */
export function descriptionFontSize(description: string): number {
  const length = [...cardText(description, OG_DESCRIPTION_LIMIT)].length;
  return length > 140 ? 26 : 30;
}

/**
 * "https://example.com/a/b" → "example.com"; a bare domain passes through, and
 * anything unparseable comes back as given so the card never goes blank.
 */
export function displayHost(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  try {
    return new URL(raw.includes("://") ? raw : `https://${raw}`).host;
  } catch {
    return raw;
  }
}

const CJK = /[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/;

/**
 * Greedy wrap driven by a caller-supplied width function, which in the browser
 * is `ctx.measureText(...).width` at the font the text will be drawn in.
 * Passing the measurement in keeps this testable, but it also means the font
 * has to be set *before* calling: measure with one font and draw with another
 * and every line break lands in the wrong place.
 *
 * CJK breaks between any two characters; Latin breaks between words, and only
 * mid-word when a single word is wider than the column.
 */
export function wrapLines(
  text: string,
  maxWidth: number,
  maxLines: number,
  measure: (value: string) => number
): string[] {
  const tokens = text.match(
    /[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]|[^\s\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]+/g
  );
  if (!tokens) return [];

  const lines: string[] = [];
  let line = "";
  const push = () => {
    if (line) lines.push(line);
    line = "";
  };

  for (const token of tokens) {
    const glued = line && !CJK.test(token) && !CJK.test(line.slice(-1)) ? `${line} ${token}` : line + token;
    if (measure(glued) <= maxWidth) {
      line = glued;
      continue;
    }
    if (line) push();
    if (measure(token) <= maxWidth) {
      line = token;
      continue;
    }
    // A single token wider than the column: break it character by character
    for (const char of token) {
      if (measure(line + char) > maxWidth && line) push();
      line += char;
    }
  }
  push();

  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  let last = kept[maxLines - 1];
  while (last.length > 1 && measure(`${last}…`) > maxWidth) {
    last = last.slice(0, -1);
  }
  kept[maxLines - 1] = `${last.trimEnd()}…`;
  return kept;
}
