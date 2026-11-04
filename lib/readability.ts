/**
 * Readability metrics for a passage.
 *
 * The English indexes are the standard textbook formulas (Flesch, Flesch–
 * Kincaid, Gunning Fog, ARI, Coleman–Liau, SMOG). They all rest on three
 * counts — words, sentences and syllables — so the syllable heuristic is the
 * part that decides the accuracy of everything else.
 *
 * Chinese has no equivalent index without a word list, so the CJK side reports
 * the raw shape of the text (characters, sentence length, character variety)
 * and the UI labels it as such instead of inventing a score.
 */

import { codedError } from "./errors";
import { hanCharacters, latinWords, splitSentences } from "./words";

/**
 * Words the vowel-group heuristic gets wrong. Kept short on purpose: every
 * entry is a claim about one word, and a wrong claim skews six scores at once.
 */
const SYLLABLE_EXCEPTIONS: Record<string, number> = {
  people: 2,
  business: 2,
  science: 2,
  quiet: 2,
  poem: 2,
  poet: 2,
  create: 2,
  being: 2,
  doing: 2,
  going: 2,
  seeing: 2,
  idea: 3,
  area: 3,
  every: 2,
  different: 3,
  evening: 2,
  favourite: 3,
  favorite: 3,
  rhythm: 2,
  queue: 1,
  hour: 1,
  our: 1,
  fire: 1,
};

/** Syllables in a word; digits and punctuation contribute nothing */
export function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length === 0) return 0;
  const known = SYLLABLE_EXCEPTIONS[w];
  if (known !== undefined) return known;
  if (w.length <= 3) return 1;

  let groups = 0;
  let previousVowel = false;
  for (const char of w) {
    const vowel = "aeiouy".includes(char);
    if (vowel && !previousVowel) groups += 1;
    previousVowel = vowel;
  }

  // A final silent "e" closes the last syllable instead of adding one, except
  // in "-le" endings ("table" is ta-ble) and "-ee" ("agree" is a-gree)
  if (groups > 1 && w.endsWith("e") && !w.endsWith("le") && !w.endsWith("ee")) {
    groups -= 1;
  }
  return Math.max(1, groups);
}

export interface ReadabilityScores {
  /** 0–100, higher is easier */
  flesch: number;
  /** US school grade */
  fk: number;
  fog: number;
  /** Automated Readability Index */
  ari: number;
  colemanLiau: number;
  /** Needs at least 3 sentences, otherwise null */
  smog: number | null;
}

export interface EnglishMetrics {
  words: number;
  sentences: number;
  syllables: number;
  letters: number;
  /** Three or more syllables, the Gunning Fog input */
  complexWords: number;
  avgSentence: number;
  avgSyllables: number;
  scores: ReadabilityScores;
}

export interface CjkMetrics {
  characters: number;
  sentences: number;
  avgSentence: number;
  unique: number;
}

export interface Readability {
  english: EnglishMetrics | null;
  cjk: CjkMetrics;
}

export type ReadingLevel = "veryEasy" | "easy" | "fairlyEasy" | "plain" | "fairlyHard" | "hard" | "veryHard";

/** The usual Flesch bands, handed back as an id so the UI can translate it */
export function readingLevel(flesch: number): ReadingLevel {
  if (flesch >= 90) return "veryEasy";
  if (flesch >= 80) return "easy";
  if (flesch >= 70) return "fairlyEasy";
  if (flesch >= 60) return "plain";
  if (flesch >= 50) return "fairlyHard";
  if (flesch >= 30) return "hard";
  return "veryHard";
}

const round = (value: number, digits = 2) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

/**
 * Analyse a passage. Throws `read.empty` when there is nothing to measure, so
 * the caller can show a translated message instead of a page of zeros.
 */
export function readability(text: string): Readability {
  const sentences = splitSentences(text);
  const englishSentences = sentences.filter((sentence) => /[A-Za-z]/.test(sentence)).length;
  const words = latinWords(text);
  const chars = hanCharacters(text);

  const cjkSentences =
    sentences.filter((sentence) => /[\u3400-\u9fff]/.test(sentence)).length || (chars.length > 0 ? 1 : 0);

  const cjk: CjkMetrics = {
    characters: chars.length,
    sentences: cjkSentences,
    avgSentence: cjkSentences > 0 ? round(chars.length / cjkSentences, 1) : 0,
    unique: new Set(chars).size,
  };

  if (words.length === 0) {
    if (chars.length === 0) throw codedError("read.empty");
    return { english: null, cjk };
  }

  const syllables = words.reduce((sum, word) => sum + countSyllables(word), 0);
  const letters = words.reduce((sum, word) => sum + word.replace(/[^a-z]/gi, "").length, 0);
  const complexWords = words.filter(
    (word) => countSyllables(word) >= 3 && !/(ed|es)$/.test(word)
  ).length;
  const sentenceCount = Math.max(1, englishSentences);
  const avgSentence = words.length / sentenceCount;
  const avgSyllables = syllables / words.length;

  const scores: ReadabilityScores = {
    flesch: 206.835 - 1.015 * avgSentence - 84.6 * avgSyllables,
    fk: 0.39 * avgSentence + 11.8 * avgSyllables - 15.59,
    fog: 0.4 * (avgSentence + (100 * complexWords) / words.length),
    ari: 4.71 * (letters / words.length) + 0.5 * avgSentence - 21.43,
    colemanLiau: 0.0588 * ((letters / words.length) * 100) - 0.296 * ((sentenceCount / words.length) * 100) - 15.8,
    smog:
      sentenceCount >= 3
        ? 1.043 * Math.sqrt((complexWords * 30) / sentenceCount) + 3.1291
        : null,
  };

  return {
    english: {
      words: words.length,
      sentences: englishSentences,
      syllables,
      letters,
      complexWords,
      avgSentence: round(avgSentence, 1),
      avgSyllables: round(avgSyllables, 2),
      scores: {
        flesch: round(scores.flesch, 1),
        fk: round(scores.fk, 1),
        fog: round(scores.fog, 1),
        ari: round(scores.ari, 1),
        colemanLiau: round(scores.colemanLiau, 1),
        smog: scores.smog === null ? null : round(scores.smog, 1),
      },
    },
    cjk,
  };
}
