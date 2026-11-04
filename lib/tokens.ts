/**
 * Token counting and context budgeting without a tokenizer vocabulary.
 *
 * A real BPE vocabulary (cl100k_base, o200k_base) is one to two megabytes of
 * merge ranks even compressed, which is far too much weight for a tool page.
 * Instead this module models the text the way BPE behaves: a Latin word plus its
 * leading space is one token up to about nine characters and splits after that,
 * identifiers split at camelCase and underscores, CJK characters are close to one
 * token each but differ between tokenizers, digits pack about three per token,
 * and punctuation costs half a token on average.
 *
 * The constants were fitted against o200k_base and cl100k_base over English
 * prose, Chinese prose, source code and JSON: English prose lands within about
 * five percent, code runs roughly ten percent low (operators and newlines cost
 * more than the model admits), and Chinese drifts up to twenty percent either
 * way, because rare characters fall back to byte-level tokens while common
 * words merge into one. Emoji are counted once per grapheme cluster. This is
 * fine for context budgeting and cost sanity checks, but it is an estimate —
 * the only exact answer comes from the model's own tokenizer.
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
  /** Characters one Latin word holds before it needs a second token */
  word: number;
  /** Tokens per CJK character */
  cjk: number;
  /** Digits per token */
  digits: number;
  /** Tokens per emoji grapheme cluster */
  emoji: number;
}

export const TOKENIZERS: TokenizerProfile[] = [
  {
    id: "o200k",
    label: { zh: "GPT-6 / GPT-5.6 / GPT-4o", en: "GPT-6 / GPT-5.6 / GPT-4o" },
    short: { zh: "GPT-5", en: "GPT-5" },
    detail: "o200k_base",
    word: 9,
    cjk: 0.8,
    digits: 3,
    emoji: 2,
  },
  {
    id: "cl100k",
    label: { zh: "GPT-4 / GPT-3.5 / Embedding", en: "GPT-4 / GPT-3.5 / Embedding" },
    short: { zh: "GPT-4", en: "GPT-4" },
    detail: "cl100k_base",
    word: 9,
    cjk: 1.05,
    digits: 3,
    emoji: 3,
  },
  {
    id: "claude",
    label: { zh: "Claude 4.7+ / 5.x", en: "Claude 4.7+ / 5.x" },
    short: { zh: "Claude", en: "Claude" },
    detail: "Anthropic BPE",
    // Claude 4.7 swapped tokenizers and emits about 30% more tokens for the same
    // text, so these rates are fitted to land roughly a third above the pre-4.7
    // counts rather than scaled from the old constants.
    word: 6.6,
    cjk: 1.75,
    digits: 2.3,
    emoji: 3,
  },
  {
    id: "gemini",
    label: { zh: "Gemini 3.x", en: "Gemini 3.x" },
    short: { zh: "Gemini", en: "Gemini" },
    detail: "SentencePiece",
    word: 8.2,
    cjk: 1,
    digits: 3.2,
    emoji: 3,
  },
  {
    id: "llama",
    label: { zh: "Llama / Mistral", en: "Llama / Mistral" },
    short: { zh: "Llama", en: "Llama" },
    detail: "SentencePiece BPE",
    word: 7.6,
    cjk: 1.6,
    digits: 3,
    emoji: 3,
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

const CJK_CHAR =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Thai}]/u;
const LETTER_RUN = /^[\p{L}\p{M}]/u;
const DIGIT_RUN = /^\p{N}/u;
/** One pictograph plus any variation selector, skin tone or ZWJ joiners */
const EMOJI_RUN =
  /^\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?)*/u;

/**
 * One pass over the text. CJK comes before the generic letter alternative so
 * Chinese is not swallowed as a single "word"; the letter alternative allows
 * inner apostrophes, underscores and dashes so "it's", "MAX_BYTES" and
 * "state-of-the-art" stay one segment and then get split by `latinCost`.
 * The emoji alternative has to precede the catch-all so a cluster stays whole.
 */
const SEGMENT =
  /\s+|[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Thai}]+|\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?)*|[\p{L}\p{M}]+(?:['’_\u2010-\u2015-][\p{L}\p{M}]+)*|[\p{N}]+|./gu;

/** Half a token per punctuation mark: ", " is one token, "()" is one. */
const SYMBOL_COST = 0.5;

/** camelCase, snake_case and kebab-case boundaries, where BPE starts a new token */
const WORD_BREAK = /[_-]+|(?<=[a-z0-9])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])/;

/**
 * A word plus its leading space is one token until it gets long, then it falls
 * apart in chunks of roughly `profile.word` characters. Identifiers break at
 * camelCase and underscores first, which is what makes code come out closer.
 */
function latinCost(word: string, chunk: number): number {
  return word
    .split(WORD_BREAK)
    .filter(Boolean)
    .reduce((sum, part) => sum + Math.max(1, Math.ceil((part.length + 1) / chunk)), 0);
}

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

    if (EMOJI_RUN.test(segment)) {
      symbols += profile.emoji;
      continue;
    }

    if (LETTER_RUN.test(first)) {
      latin += latinCost(segment, profile.word);
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

/**
 * Common context windows, used as quick presets in the UI. 272K is OpenAI's
 * long-context step, 1.05M is the current flagship window, 1M covers Claude.
 */
export const CONTEXT_PRESETS = [8_192, 32_768, 128_000, 200_000, 272_000, 1_000_000, 1_050_000];

/** Input above this many tokens is billed at double for the whole request */
export const LONG_CONTEXT_THRESHOLD = 272_000;

/**
 * Whether a request of `tokens` would cross OpenAI's long-context step. Only the
 * o200k family is subject to it: GPT-4 and the embedding models never were.
 */
export function longContextSurcharge(family: TokenizerFamily, tokens: number): boolean {
  if (family !== "o200k") return false;
  return clampTokens(tokens) > LONG_CONTEXT_THRESHOLD;
}

/** 12345 → "12,345"; used in every stats row */
export function formatTokens(value: number, locale: string): string {
  if (!Number.isFinite(value)) return "—";
  return Math.round(value).toLocaleString(locale === "zh" ? "zh-CN" : "en-US");
}
