/**
 * Token counting and context budgeting without a tokenizer vocabulary.
 *
 * A real BPE vocabulary (cl100k_base, o200k_base) is one to two megabytes of
 * merge ranks even compressed, which is far too much weight for a tool page.
 * Instead this module models the text the way BPE behaves: Latin words collapse
 * to roughly one token per five characters, CJK characters are close to one
 * token each but differ a lot between tokenizers, digits pack about three per
 * token, and punctuation costs half a token on average.
 *
 * The constants below were calibrated against reference tokenizations, and the
 * result usually lands within about ten percent. That is fine for context
 * budgeting and cost sanity checks, but it is an estimate — the only exact
 * answer comes from the model's own tokenizer.
 */

export type TokenizerFamily = "o200k" | "cl100k" | "claude" | "gemini" | "llama";

export interface TokenizerProfile {
  id: TokenizerFamily;
  /** Human label, kept as a plain pair so this module stays React-free */
  label: { zh: string; en: string };
  /** Short label for segmented controls */
  short: { zh: string; en: string };
  /** Which tokenizer actually backs it, shown in the UI */
  detail: string;
  /** Average Latin characters per token */
  latin: number;
  /** Tokens per CJK character */
  cjk: number;
  /** Digits per token */
  digits: number;
}

export const TOKENIZERS: TokenizerProfile[] = [
  {
    id: "o200k",
    label: { zh: "GPT-4o / o 系列", en: "GPT-4o / o series" },
    short: { zh: "GPT-4o", en: "GPT-4o" },
    detail: "o200k_base",
    latin: 5.2,
    cjk: 0.72,
    digits: 3,
  },
  {
    id: "cl100k",
    label: { zh: "GPT-4 / GPT-3.5", en: "GPT-4 / GPT-3.5" },
    short: { zh: "GPT-4", en: "GPT-4" },
    detail: "cl100k_base",
    latin: 5,
    cjk: 1,
    digits: 3,
  },
  {
    id: "claude",
    label: { zh: "Claude", en: "Claude" },
    short: { zh: "Claude", en: "Claude" },
    detail: "Anthropic",
    latin: 5,
    cjk: 1.35,
    digits: 3,
  },
  {
    id: "gemini",
    label: { zh: "Gemini", en: "Gemini" },
    short: { zh: "Gemini", en: "Gemini" },
    detail: "SentencePiece",
    latin: 4.6,
    cjk: 1,
    digits: 3.2,
  },
  {
    id: "llama",
    label: { zh: "Llama / Mistral", en: "Llama / Mistral" },
    short: { zh: "Llama", en: "Llama" },
    detail: "SentencePiece BPE",
    latin: 4.2,
    cjk: 1.6,
    digits: 3,
  },
];

/** Segmented-control options for the tokenizer picker */
export function tokenizerChoices(locale: "zh" | "en"): { value: TokenizerFamily; label: string }[] {
  return TOKENIZERS.map((item) => ({ value: item.id, label: item.short[locale] }));
}

export const DEFAULT_TOKENIZER: TokenizerFamily = "o200k";

export interface TokenEstimate {
  /** Rounded total */
  total: number;
  /** Contribution of each kind, before rounding */
  cjk: number;
  latin: number;
  numeric: number;
  symbols: number;
  /** Code points, not UTF-16 units */
  chars: number;
  /** Latin and numeric word runs */
  words: number;
  /** Characters per token, useful as a sanity check */
  charsPerToken: number;
}

const CJK_CHAR = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Thai}]/u;
const LETTER_RUN = /^[\p{L}\p{M}]/u;
const DIGIT_RUN = /^\p{N}/u;

/**
 * One pass over the text. CJK comes before the generic letter alternative so
 * Chinese is not swallowed as a single "word"; the letter alternative allows
 * inner apostrophes and dashes so "it's" and "state-of-the-art" count as one.
 */
const SEGMENT =
  /\s+|[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Thai}]+|[\p{L}\p{M}]+(?:['’\u2010-\u2015-][\p{L}\p{M}]+)*|[\p{N}]+|./gu;

/** Half a token per punctuation mark: ", " is one token, "()" is one. */
const SYMBOL_COST = 0.5;

/**
 * Runs of whitespace are mostly absorbed into the following word's token, so a
 * single newline costs nothing and longer runs cost a fraction.
 */
function spaceCost(length: number): number {
  return Math.max(0, Math.ceil((length - 1) / 4));
}

export function tokenizerProfile(family: TokenizerFamily): TokenizerProfile {
  return TOKENIZERS.find((item) => item.id === family) ?? TOKENIZERS[0];
}

export function estimateTokens(
  text: string,
  family: TokenizerFamily = DEFAULT_TOKENIZER
): TokenEstimate {
  const profile = tokenizerProfile(family);
  const empty: TokenEstimate = {
    total: 0,
    cjk: 0,
    latin: 0,
    numeric: 0,
    symbols: 0,
    chars: 0,
    words: 0,
    charsPerToken: 0,
  };
  if (!text) return empty;

  let cjk = 0;
  let latin = 0;
  let numeric = 0;
  let symbols = 0;
  let words = 0;
  let chars = 0;
  let content = false;

  for (const segment of text.match(SEGMENT) ?? []) {
    const length = [...segment].length;
    chars += length;

    const first = segment[0];
    if (/\s/.test(first)) {
      symbols += spaceCost(length);
      continue;
    }

    content = true;

    if (CJK_CHAR.test(first)) {
      cjk += length * profile.cjk;
      words += length;
      continue;
    }

    if (LETTER_RUN.test(first)) {
      latin += Math.max(1, Math.ceil(length / profile.latin));
      words += 1;
      continue;
    }

    if (DIGIT_RUN.test(first)) {
      // Digits generally pack in groups of three: "123456" is two tokens
      numeric += Math.max(1, Math.ceil(length / profile.digits));
      words += 1;
      continue;
    }

    symbols += SYMBOL_COST;
  }

  const raw = cjk + latin + numeric + symbols;
  const total = content && raw > 0 ? Math.max(1, Math.round(raw)) : 0;

  return {
    total,
    cjk,
    latin,
    numeric,
    symbols,
    chars,
    words,
    charsPerToken: total > 0 ? chars / total : 0,
  };
}

/** Rough per-message framing cost added by chat formats, in tokens. */
export const MESSAGE_OVERHEAD = 4;
/** Tokens a chat template spends priming the reply. */
export const REPLY_PRIMING = 3;

export function chatOverhead(messages: number): number {
  if (!Number.isFinite(messages) || messages <= 0) return 0;
  return messages * MESSAGE_OVERHEAD + REPLY_PRIMING;
}

export interface ContextBudgetInput {
  /** Model context window in tokens */
  window: number;
  /** Tokens already taken by the prompt */
  used: number;
  /** Head room kept free for the model's answer */
  reserve: number;
  /** Answer length you are planning for */
  expected: number;
}

export interface ContextBudget {
  /** What is left for the prompt after the reserve */
  available: number;
  /** What is left after also fitting the planned answer */
  remaining: number;
  fits: boolean;
  /** Share of the window the prompt plus answer would take, 0–1 */
  usage: number;
  /** Tokens over the limit, 0 when it fits */
  overflow: number;
}

function clampTokens(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function contextBudget(input: ContextBudgetInput): ContextBudget {
  const window = clampTokens(input.window);
  const used = clampTokens(input.used);
  const reserve = clampTokens(input.reserve);
  const expected = clampTokens(input.expected);

  const available = Math.max(0, window - used - reserve);
  const remaining = available - expected;

  return {
    available,
    remaining,
    fits: window > 0 && remaining >= 0,
    usage: window > 0 ? Math.min(1, (used + expected) / window) : 0,
    overflow: Math.max(0, -remaining),
  };
}

/** Common context windows, used as quick presets in the UI. */
export const CONTEXT_PRESETS = [8_192, 32_768, 128_000, 200_000, 1_000_000];

/** 12345 → "12,345"; used in every stats row */
export function formatTokens(value: number, locale: string): string {
  if (!Number.isFinite(value)) return "—";
  return Math.round(value).toLocaleString(locale === "zh" ? "zh-CN" : "en-US");
}
