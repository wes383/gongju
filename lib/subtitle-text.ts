/**
 * Text-level cleanup for subtitle cues: line wrapping, merging short cues,
 * whitespace and markup removal, punctuation normalisation and readability
 * checks.
 *
 * Traditional/Simplified conversion is injected by the caller so this module
 * stays free of the ~1MB OpenCC dictionaries.
 */

import { normalizeCues, visibleLength, type Cue } from "@/lib/subtitle";

export type BreakMode = "char" | "word" | "width";
export type PunctuationMode = "none" | "cjk" | "latin";

export interface CleanOptions {
  /** Maximum characters per line; 0 disables wrapping */
  maxChars: number;
  /** Target number of lines per cue */
  maxLines: number;
  breakMode: BreakMode;
  /** Merge a cue into its neighbour when either lasts less than this (ms); 0 disables */
  mergeShortMs: number;
  collapseSpaces: boolean;
  stripTags: boolean;
  stripSdh: boolean;
  punctuation: PunctuationMode;
}

export const DEFAULT_CLEAN: CleanOptions = {
  maxChars: 18,
  maxLines: 2,
  breakMode: "char",
  mergeShortMs: 0,
  collapseSpaces: true,
  stripTags: false,
  stripSdh: false,
  punctuation: "none",
};

/* ------------------------------------------------------------- characters */

const WIDE =
  /[\u1100-\u115f\u2e80-\u303e\u3041-\u33ff\u3400-\u4dbf\u4e00-\u9fff\ua000-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe6f\uff00-\uff60\uffe0-\uffe6]/;

/** Column width, treating CJK and full-width forms as two columns */
export function displayWidth(text: string): number {
  let width = 0;
  for (const char of text) width += WIDE.test(char) ? 2 : 1;
  return width;
}

let segmenter: Intl.Segmenter | null = null;

function graphemes(text: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    segmenter ??= new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return [...segmenter.segment(text)].map((entry) => entry.segment);
  }
  return [...text];
}

/** Characters that must not open a line (避头) */
const NO_LINE_START = "，。、；：？！）】》」』”’·…—%";
/** Characters that must not close a line (避尾) */
const NO_LINE_END = "（【《「『“‘";

/* ----------------------------------------------------------------- markup */

export function stripMarkup(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/\{[^}]*\}/g, "")
    .replace(/<\/?(?:i|b|u|s|em|strong|font|span|ruby|rt|rp|v|c|lang)\b[^>]*>/gi, "")
    .replace(/\\N/g, "\n")
    .replace(/\\n/g, " ");
}

/** Remove sound-effect annotations and music notes (SDH / 听障字幕) */
export function stripSdh(text: string): string {
  return text
    .replace(/[♪♫]/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/^\s*[（(][^)）]*[)）]\s*$/gm, "")
    .replace(/^\s*>>+\s*/gm, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

const ASCII_TO_WIDE: Record<string, string> = {
  ",": "，",
  ".": "。",
  ";": "；",
  ":": "：",
  "?": "？",
  "!": "！",
};

const WIDE_TO_ASCII: Record<string, string> = {
  "，": ",",
  "。": ".",
  "；": ";",
  "：": ":",
  "？": "?",
  "！": "!",
};

/** Convert half-width punctuation next to CJK characters to full-width */
export function toCjkPunctuation(text: string): string {
  return text
    .replace(/([\u3400-\u9fff])([,.;:?!])(?=[\u3400-\u9fff]|$)/g, (_, lead, mark) => {
      return lead + (ASCII_TO_WIDE[mark] ?? mark);
    })
    .replace(/\.{3,}/g, "……")
    .replace(/([\u3400-\u9fff])…(?!…)/g, "$1……");
}

/** Convert full-width punctuation sandwiched between Latin letters to half-width */
export function toLatinPunctuation(text: string): string {
  return text.replace(
    /([A-Za-z0-9])([，。；：？！])(?=[A-Za-z0-9]|\s|$)/g,
    (_, lead, mark) => lead + (WIDE_TO_ASCII[mark] ?? mark)
  );
}

export function normalizePunctuation(text: string, mode: PunctuationMode): string {
  if (mode === "cjk") return toCjkPunctuation(text);
  if (mode === "latin") return toLatinPunctuation(text);
  return text;
}

/* ------------------------------------------------------------------ wrap */

interface WrapOptions {
  maxChars: number;
  maxLines: number;
  mode: BreakMode;
}

function measureFor(mode: BreakMode) {
  return mode === "width" ? displayWidth : (value: string) => graphemes(value).length;
}

/** Characters a line may break after, so phrases stay intact */
const BREAK_AFTER = "，。、；：？！,.;:?!";

function layoutChars(
  chars: string[],
  budget: number,
  measure: (s: string) => number,
  boundary: boolean
): string[] {
  const lines: string[] = [];
  let current = "";

  const flush = (text: string) => {
    const trimmed = text.trim();
    if (trimmed) lines.push(trimmed);
  };

  for (const char of chars) {
    if (char === "\n") {
      flush(current);
      current = "";
      continue;
    }

    if (!current || measure(current + char) <= budget) {
      current += char;
      continue;
    }

    // Closing punctuation may overflow by one cell rather than open a line
    if (NO_LINE_START.includes(char)) {
      current += char;
      continue;
    }

    let cut = current.length;
    const floor = Math.max(1, Math.floor(budget * 0.5));

    // Prefer a punctuation boundary, then a space, so words are not split
    if (boundary) {
      for (let i = current.length - 1; i >= floor; i -= 1) {
        if (BREAK_AFTER.includes(current[i])) {
          cut = i + 1;
          break;
        }
      }
      if (cut === current.length) {
        for (let i = current.length - 1; i >= floor; i -= 1) {
          if (current[i] === " ") {
            cut = i;
            break;
          }
        }
      }
      if (measure(current.slice(0, cut)) > budget) cut = current.length;
    }

    // Opening punctuation stays with the following text
    if (cut > 1 && NO_LINE_END.includes(current[cut - 1])) cut -= 1;
    if (cut <= 0) cut = current.length;

    flush(current.slice(0, cut));
    current = current.slice(cut).trimStart() + char;
  }

  flush(current);
  return lines;
}

let wordSegmenter: Intl.Segmenter | null = null;

/** Match whole words so CJK text breaks between words, not inside them */
function wordSegments(text: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    wordSegmenter ??= new Intl.Segmenter("zh", { granularity: "word" });
    return [...wordSegmenter.segment(text)].map((entry) => entry.segment);
  }
  return text.split(/(\s+)/).filter(Boolean);
}

function layoutWords(text: string, budget: number, measure: (s: string) => number): string[] {
  const lines: string[] = [];
  let line: string[] = [];

  const flush = () => {
    const value = line.join("").trimEnd();
    if (value) lines.push(value);
    line = [];
  };

  // Spaces stay attached to the word before them
  const chunks: string[] = [];
  for (const segment of wordSegments(text)) {
    if (segment.trim() === "") {
      if (chunks.length) chunks[chunks.length - 1] += segment;
      continue;
    }
    chunks.push(segment);
  }

  for (const token of chunks) {
    // A single unbreakable run longer than the budget is split by character
    if (measure(token.trimEnd()) > budget) {
      flush();
      lines.push(...layoutChars(graphemes(token.trimEnd()), budget, measure, false));
      continue;
    }

    if (line.length === 0 || measure((line.join("") + token).trimEnd()) <= budget) {
      line.push(token);
      continue;
    }

    // Never leave a single character dangling at the end of a line
    const carry =
      line.length > 1 && graphemes(line[line.length - 1].trimEnd()).length === 1
        ? [line.pop() as string]
        : [];
    flush();
    line = [...carry, token];
  }

  flush();
  return lines;
}

/**
 * Re-flow one cue's text into balanced lines.
 *
 * `maxLines` is a target: text that cannot fit is never truncated, it simply
 * spills onto additional lines.
 */
export function wrapText(text: string, options: WrapOptions): string {
  const flat = text.replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, " ").trim();
  if (!flat || options.maxChars <= 0) return flat;

  const measure = measureFor(options.mode);
  const limit = Math.max(1, Math.round(options.maxChars));
  const total = measure(flat);
  if (total <= limit) return flat;

  const targetLines = Math.max(1, Math.min(options.maxLines, Math.ceil(total / limit)));
  const perLine = Math.max(1, Math.ceil(total / targetLines));

  for (let budget = perLine; budget <= limit; budget += 1) {
    const lines = layout(flat, budget, options.mode, measure, true);
    if (lines.length <= targetLines) return lines.join("\n");
  }

  // No boundary-aligned split fits the requested line count: break mid-phrase
  for (let budget = perLine; budget <= limit; budget += 1) {
    const lines = layout(flat, budget, options.mode, measure, false);
    if (lines.length <= targetLines) return lines.join("\n");
  }

  return layout(flat, limit, options.mode, measure, false).join("\n");
}

function layout(
  text: string,
  budget: number,
  mode: BreakMode,
  measure: (s: string) => number,
  boundary: boolean
): string[] {
  if (mode === "word") return layoutWords(text, budget, measure);
  return layoutChars(graphemes(text), budget, measure, boundary);
}

/* ----------------------------------------------------------------- clean */

function fits(text: string, options: CleanOptions): boolean {
  if (options.maxChars <= 0) return true;
  return visibleLength(text) <= options.maxChars * Math.max(1, options.maxLines);
}

/** Merge cues that are too short to read into their neighbour */
export function mergeShortCues(
  cues: Cue[],
  thresholdMs: number,
  options: CleanOptions
): Cue[] {
  if (thresholdMs <= 0) return cues;

  const out: Cue[] = [];
  for (const cue of cues) {
    const previous = out[out.length - 1];
    const gap = previous ? cue.start - previous.end : Number.POSITIVE_INFINITY;
    const short = cue.end - cue.start < thresholdMs || (previous ? previous.end - previous.start < thresholdMs : false);
    const merged = previous ? `${previous.text} ${cue.text}`.trim() : "";

    if (previous && short && gap >= 0 && gap <= 800 && fits(merged, options)) {
      previous.text = merged;
      previous.end = cue.end;
      continue;
    }
    out.push({ ...cue });
  }
  return out;
}

export type Transform = (text: string) => string;

/**
 * Apply the cleanup pipeline: markup → SDH → whitespace → punctuation →
 * language conversion → short-cue merge → wrapping.
 */
export function cleanCues(
  cues: Cue[],
  options: CleanOptions,
  convert?: Transform
): Cue[] {
  let result = normalizeCues(cues).map((cue) => {
    let text = cue.text;
    if (options.stripTags) text = stripMarkup(text);
    if (options.stripSdh) text = stripSdh(text);
    if (options.collapseSpaces) {
      text = text
        .split("\n")
        .map((line) => line.replace(/[ \t]+/g, " ").trim())
        .filter(Boolean)
        .join("\n");
    }
    if (options.punctuation !== "none") text = normalizePunctuation(text, options.punctuation);
    if (convert) text = convert(text);
    return { ...cue, text };
  });

  result = mergeShortCues(result, options.mergeShortMs, options);

  return result.map((cue) => ({
    ...cue,
    text:
      options.maxChars > 0
        ? wrapText(cue.text, {
            maxChars: options.maxChars,
            maxLines: options.maxLines,
            mode: options.breakMode,
          })
        : cue.text.trim(),
  }));
}

export interface CueStats {
  cues: number;
  /** Cues whose reading speed exceeds `maxCps` */
  tooFast: number;
  /** Cues with a line longer than `maxChars` once wrapped */
  tooLong: number;
  averageCps: number;
  longestLine: number;
}

export function cueStats(cues: Cue[], maxCps = 20, maxChars = 0): CueStats {
  let fast = 0;
  let long = 0;
  let cpsSum = 0;
  let longest = 0;

  for (const cue of cues) {
    const seconds = (cue.end - cue.start) / 1000;
    const cps = seconds > 0 ? visibleLength(cue.text) / seconds : 0;
    cpsSum += cps;
    if (cps > maxCps) fast += 1;

    const lineLength = Math.max(0, ...cue.text.split("\n").map((line) => visibleLength(line)));
    longest = Math.max(longest, lineLength);
    if (maxChars > 0 && lineLength > maxChars) long += 1;
  }

  return {
    cues: cues.length,
    tooFast: fast,
    tooLong: long,
    averageCps: cues.length ? cpsSum / cues.length : 0,
    longestLine: longest,
  };
}
