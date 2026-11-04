/**
 * Word-level text analysis for language learners: tokenising, frequency
 * counting, and pulling a study list out of a passage.
 *
 * Two tokenisers cover the cases that matter here:
 *
 * - `latin` splits on letter runs (apostrophes and hyphens stay inside the
 *   word) and lowercases, so "Don't" and "don't" are the same entry.
 * - `cjk` counts single Han characters. Proper Chinese or Japanese word
 *   segmentation needs a dictionary, which would dwarf this site's bundle, so
 *   the character is the honest unit to count.
 */

import { codedError } from "./errors";

export type WordMode = "latin" | "cjk";

/** Everyday function words; they crowd out the words a learner actually needs */
const LATIN_STOPWORDS = new Set([
  "a", "about", "after", "again", "against", "all", "also", "am", "an", "and", "any", "are", "as",
  "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can",
  "could", "did", "do", "does", "doing", "don't", "down", "during", "each", "few", "for", "from",
  "further", "had", "has", "have", "having", "he", "her", "here", "hers", "herself", "him",
  "himself", "his", "how", "i", "if", "in", "into", "is", "it", "its", "itself", "just", "me",
  "more", "most", "my", "myself", "no", "nor", "not", "now", "of", "off", "on", "once", "only",
  "or", "other", "our", "ours", "ourselves", "out", "over", "own", "same", "she", "should", "so",
  "some", "such", "than", "that", "the", "their", "theirs", "them", "themselves", "then", "there",
  "these", "they", "this", "those", "through", "to", "too", "under", "until", "up", "very", "was",
  "we", "were", "what", "when", "where", "which", "while", "who", "whom", "why", "will", "with",
  "would", "you", "your", "yours", "yourself", "yourselves", "isn't", "aren't", "wasn't",
  "weren't", "hasn't", "haven't", "didn't", "doesn't", "don't", "can't", "couldn't", "won't",
  "wouldn't", "shouldn't", "it's", "i'm", "i've", "i'll", "i'd", "you're", "we're", "they're",
]);

/** Characters that appear so often in Chinese that counting them tells nothing */
const CJK_STOPCHARS = new Set([
  "的", "了", "是", "在", "我", "你", "他", "她", "它", "们", "这", "那", "有", "和", "就", "不",
  "人", "都", "一", "上", "也", "很", "到", "说", "要", "去", "会", "着", "没", "好", "自", "己",
  "等", "把", "被", "给", "让", "从", "对", "与", "及", "而", "或", "但", "因", "为", "所", "以",
  "于", "之", "其", "中", "下", "大", "来", "个", "又", "还", "能", "可", "只", "才", "更", "最",
  "呢", "吧", "啊", "吗", "呀", "嘛", "哦", "嗯", "地", "得", "过", "后", "前", "里", "外", "时",
  "年", "月", "日", "我", "么", "什", "怎", "如", "果", "样", "些", "多", "少", "两", "三",
]);

const WORD_RUN = /[\p{L}\p{M}]+(?:['’-][\p{L}\p{M}]+)*/gu;
const HAN_CHAR = /\p{Script=Han}/gu;
const CJK_SCRIPT = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;
const SENTENCE_CHUNK = /[^.!?。！？…\n]+[.!?。！？…]*/g;

export interface WordEntry {
  word: string;
  count: number;
  /** Share of the kept tokens, 0–1 */
  share: number;
  /** Ordinal of the first occurrence, useful for sorting by appearance */
  first: number;
  /** The sentence the word first appeared in, trimmed to a readable length */
  context: string;
}

export interface Frequency {
  mode: WordMode;
  /** Tokens kept after stopword and length filtering */
  tokens: number;
  /** Tokens before filtering, so the filter's effect is visible */
  total: number;
  unique: number;
  entries: WordEntry[];
}

export interface FrequencyOptions {
  mode?: WordMode;
  /** Ignore tokens shorter than this; 1 keeps everything */
  minLength?: number;
  /** Drop function words */
  stopwords?: boolean;
  /** Keep only the N most frequent entries; 0 keeps all */
  limit?: number;
}

interface Token {
  word: string;
  offset: number;
}

interface Range {
  start: number;
  end: number;
}

function sentenceRanges(text: string): Range[] {
  const ranges: Range[] = [];
  for (const match of text.matchAll(SENTENCE_CHUNK)) {
    const raw = match[0];
    const start = (match.index ?? 0) + (raw.length - raw.trimStart().length);
    const end = (match.index ?? 0) + raw.trimEnd().length;
    if (end > start) ranges.push({ start, end });
  }
  return ranges;
}

/** Sentences of a mixed text; CJK punctuation ends one just like a full stop */
export function splitSentences(text: string): string[] {
  return sentenceRanges(text).map((range) => text.slice(range.start, range.end));
}

function scanLatin(text: string): Token[] {
  const tokens: Token[] = [];
  for (const match of text.matchAll(WORD_RUN)) {
    const word = match[0].replace(/[’]/g, "'").toLowerCase();
    // A Han run also matches \p{L}; those belong to the other tokeniser
    if (CJK_SCRIPT.test(word)) continue;
    tokens.push({ word, offset: match.index ?? 0 });
  }
  return tokens;
}

function scanCjk(text: string): Token[] {
  const tokens: Token[] = [];
  for (const match of text.matchAll(HAN_CHAR)) {
    tokens.push({ word: match[0], offset: match.index ?? 0 });
  }
  return tokens;
}

function scan(text: string, mode: WordMode): Token[] {
  return mode === "cjk" ? scanCjk(text) : scanLatin(text);
}

/** Lowercased Latin words, in order; Han and other CJK runs are skipped */
export function latinWords(text: string): string[] {
  return scanLatin(text).map((token) => token.word);
}

/** Han characters in order, one entry per character */
export function hanCharacters(text: string): string[] {
  return scanCjk(text).map((token) => token.word);
}

function isStopword(word: string, mode: WordMode): boolean {
  return mode === "cjk" ? CJK_STOPCHARS.has(word) : LATIN_STOPWORDS.has(word);
}

function clip(value: string, max: number): string {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

function contextAt(text: string, ranges: Range[], offset: number, mode: WordMode): string {
  // Binary search over the ordered ranges; a per-token scan of the whole text
  // would make counting a novel quadratic.
  let low = 0;
  let high = ranges.length - 1;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (ranges[mid].end <= offset) low = mid + 1;
    else high = mid;
  }
  const range = ranges[low];
  if (!range) return "";
  return clip(text.slice(range.start, range.end), mode === "cjk" ? 42 : 120);
}

/**
 * Count how often each word appears.
 *
 * Entries come back sorted by count (descending) and then alphabetically, so
 * equal counts stay in a stable, predictable order.
 */
export function frequency(text: string, options: FrequencyOptions = {}): Frequency {
  const mode = options.mode ?? "latin";
  const minLength = Math.max(1, options.minLength ?? 1);
  const useStopwords = options.stopwords ?? true;
  const limit = options.limit ?? 0;

  const all = scan(text, mode);
  const ranges = sentenceRanges(text);
  const bucket = new Map<string, WordEntry>();
  let kept = 0;
  let ordinal = 0;

  for (const token of all) {
    if (token.word.length < minLength) continue;
    if (useStopwords && isStopword(token.word, mode)) continue;
    const existing = bucket.get(token.word);
    if (existing) {
      existing.count += 1;
    } else {
      bucket.set(token.word, {
        word: token.word,
        count: 1,
        share: 0,
        first: ordinal,
        context: contextAt(text, ranges, token.offset, mode),
      });
    }
    kept += 1;
    ordinal += 1;
  }

  if (kept === 0) throw codedError("words.empty");

  const entries = [...bucket.values()].sort(
    (a, b) => b.count - a.count || a.word.localeCompare(b.word)
  );
  for (const entry of entries) entry.share = entry.count / kept;

  return {
    mode,
    tokens: kept,
    total: all.length,
    unique: entries.length,
    entries: limit > 0 ? entries.slice(0, limit) : entries,
  };
}

/** One word per line, comma or space; anything else is ignored */
export function parseKnownWords(input: string): Set<string> {
  const words = input
    .toLowerCase()
    .split(/[\s,，、;；|]+/)
    .map((word) => word.trim())
    .filter(Boolean);
  return new Set(words);
}

export interface GlossaryOptions extends FrequencyOptions {
  /** Raw text of words the reader already knows */
  known?: string;
  /** Drop words that appear fewer times than this */
  minCount?: number;
}

export interface Glossary extends Frequency {
  /** Entries dropped because they were in the known list */
  knownSkipped: number;
  /** Entries dropped as too rare to be worth studying */
  rareSkipped: number;
}

/**
 * A study list: the same frequency table, minus the words already known and
 * minus anything that only appears once when a minimum is given.
 */
export function buildGlossary(text: string, options: GlossaryOptions = {}): Glossary {
  const known = parseKnownWords(options.known ?? "");
  const minCount = Math.max(1, options.minCount ?? 1);
  const base = frequency(text, { ...options, limit: 0 });

  const notKnown = options.known
    ? base.entries.filter((entry) => !known.has(entry.word))
    : base.entries;
  const entries = notKnown.filter((entry) => entry.count >= minCount);
  if (entries.length === 0) {
    throw codedError(notKnown.length > 0 ? "words.belowMin" : "words.allKnown", minCount);
  }

  const limit = options.limit ?? 0;
  return {
    ...base,
    entries: limit > 0 ? entries.slice(0, limit) : entries,
    knownSkipped: base.entries.length - notKnown.length,
    rareSkipped: notKnown.length - entries.length,
  };
}

/** Tab-separated rows for pasting into a spreadsheet or Anki */
export function glossaryTsv(entries: readonly WordEntry[], withContext = true): string {
  return entries
    .map((entry) =>
      withContext
        ? [entry.word, String(entry.count), entry.context].join("\t")
        : [entry.word, String(entry.count)].join("\t")
    )
    .join("\n");
}
