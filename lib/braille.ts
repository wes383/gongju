/**
 * Braille conversion for English and Chinese.
 *
 * English: Grade 1 writes one cell per letter, Grade 2 applies the UEB
 * contractions. `⠠` marks a capital letter and `⠼` switches the following
 * cells to digits.
 *
 * Chinese: follows the national scheme (GB/T 15720) — one initial, one final
 * and an optional tone cell per syllable. Tone cells are 1 (阴平), 2 (阳平),
 * 3 (上声) and 23 (去声); neutral tone is left unmarked. The national scheme
 * defines two tone levels: level 1 marks every syllable, level 2 additionally
 * omits the tones listed in its elision rules. Word spacing and abbreviations
 * are not applied, so the output is a faithful but literal transcription.
 */

import { pinyin } from "pinyin-pro";
import {
  CAPITAL_SIGN,
  EN_BY_DOTS,
  EN_LETTERS,
  EN_PUNCT,
  NUMBER_SIGN,
  cellFromDots,
  digitLetter,
  dotsFromCell,
  isBrailleCell,
  letterDigit,
} from "./braille-cells";
import { fromGrade2Braille, toGrade2Braille } from "./braille-grade2";

export {
  cellFromDots,
  dotsFromCell,
  isBrailleCell,
  cellsFromDots,
  EN_LETTERS,
  EN_PUNCT,
} from "./braille-cells";

/* ------------------------------------------------------------------ English */

export function toEnglishBraille(text: string): string {
  const out: string[] = [];
  let number = false;

  for (const char of text) {
    if (char >= "0" && char <= "9") {
      if (!number) {
        out.push(cellFromDots(NUMBER_SIGN));
        number = true;
      }
      out.push(cellFromDots(EN_LETTERS[digitLetter(Number(char))]));
      continue;
    }

    number = false;

    if (char === " " || char === "\n") {
      out.push(char);
    } else if (char === "(") {
      out.push(cellFromDots("5"), cellFromDots("126"));
    } else if (char === ")") {
      out.push(cellFromDots("5"), cellFromDots("345"));
    } else if (char >= "a" && char <= "z") {
      out.push(cellFromDots(EN_LETTERS[char]));
    } else if (char >= "A" && char <= "Z") {
      out.push(cellFromDots(CAPITAL_SIGN), cellFromDots(EN_LETTERS[char.toLowerCase()]));
    } else if (EN_PUNCT[char]) {
      out.push(cellFromDots(EN_PUNCT[char]));
    } else {
      out.push(char);
    }
  }

  return out.join("");
}

export function fromEnglishBraille(text: string): string {
  const cells = Array.from(text);
  const out: string[] = [];
  let number = false;
  let capital = false;

  for (let index = 0; index < cells.length; index += 1) {
    const cell = cells[index];

    if (cell === " " || cell === "\n") {
      number = false;
      capital = false;
      out.push(cell);
      continue;
    }

    const dots = dotsFromCell(cell);
    if (!dots) {
      out.push(cell);
      continue;
    }

    if (dots === NUMBER_SIGN) {
      number = true;
      continue;
    }

    if (dots === CAPITAL_SIGN) {
      capital = true;
      continue;
    }

    // Opening and closing parentheses are two cells: ⠐⠣ and ⠐⠜
    if (dots === "5") {
      const next = dotsFromCell(cells[index + 1] ?? "");
      if (next === "126") {
        out.push("(");
        index += 1;
        continue;
      }
      if (next === "345") {
        out.push(")");
        index += 1;
        continue;
      }
      continue;
    }

    const letter = EN_BY_DOTS[dots];
    if (letter) {
      if (number) {
        const digit = letterDigit(letter);
        if (digit >= 0) {
          out.push(String(digit));
          continue;
        }
        number = false;
      }
      out.push(capital ? letter.toUpperCase() : letter);
      capital = false;
      continue;
    }

    const punct = Object.entries(EN_PUNCT).find(([, value]) => value === dots);
    if (punct) {
      number = false;
      out.push(punct[0]);
      continue;
    }

    out.push(cell);
  }

  return out.join("");
}

/* ------------------------------------------------------------------ Chinese */

/** Capitals are shared by g/j, k/q and h/x — the final decides which one reads */
const ZH_INITIALS: Record<string, string> = {
  b: "12",
  p: "1234",
  m: "134",
  f: "124",
  d: "145",
  t: "2345",
  n: "1345",
  l: "123",
  g: "1245",
  k: "13",
  h: "125",
  j: "1245",
  q: "13",
  x: "125",
  zh: "34",
  ch: "12345",
  sh: "156",
  r: "245",
  z: "1356",
  c: "14",
  s: "234",
};

const ZH_FINALS: Record<string, string> = {
  a: "35",
  o: "26",
  e: "26",
  i: "24",
  u: "136",
  "ü": "346",
  er: "1235",
  ai: "246",
  ao: "235",
  ei: "2346",
  ou: "12356",
  ia: "1246",
  iao: "345",
  ie: "15",
  iou: "1256",
  ua: "123456",
  uai: "13456",
  uei: "2456",
  uo: "135",
  "üe": "23456",
  an: "1236",
  ang: "236",
  en: "356",
  eng: "3456",
  ian: "146",
  iang: "1346",
  in: "126",
  ing: "16",
  uan: "12456",
  uang: "2356",
  uen: "25",
  ong: "256",
  ueng: "256",
  "üan": "12346",
  "ün": "456",
  iong: "1456",
};

const ZH_TONES: Record<number, string> = { 1: "1", 2: "2", 3: "3", 4: "23" };

/* --------------------------------------------------------- Chinese tone levels */

export type ToneLevel = 1 | 2;

/**
 * Level 2 elision (国家通用盲文二级标调): every initial may drop one tone.
 * Level 1 keeps all of them, which is what an unmarked output means here.
 */
const TONE_ELISION: Record<string, number> = {
  // 阴平
  f: 1,
  // 阳平
  p: 2,
  m: 2,
  t: 2,
  n: 2,
  h: 2,
  q: 2,
  ch: 2,
  r: 2,
  c: 2,
  // 去声
  b: 4,
  d: 4,
  l: 4,
  g: 4,
  k: 4,
  j: 4,
  x: 4,
  zh: 4,
  sh: 4,
  z: 4,
  s: 4,
};

/** Syllables written with the initial alone (zhi, chi, shi, ri, zi, ci, si) */
const INITIAL_ONLY = new Set(["zh", "ch", "sh", "r", "z", "c", "s"]);

/** Zero-initial finals whose tones follow the five high-frequency syllables rule */
const FREQUENT_ZERO = new Set(["i", "er", "uo", "ie", "iou"]);

/**
 * Decide whether level 2 leaves this tone out. The rules are ordered the way
 * the national scheme numbers them: rule 4 elides every zero-initial 去声,
 * while rules 5 and 6 carve specific syllables out of it.
 */
function toneElided(parts: PinyinParts, next: PinyinParts | null): boolean {
  const { initial, final, tone } = parts;
  if (tone === 0) return false;

  if (!initial) {
    // Rule 6: o and e share a cell, so o drops the tone and e keeps it
    if (final === "e") return false;
    if (final === "o") return true;
    // Rule 5: yi / er / wo / ye / you mark 去声 only
    if (FREQUENT_ZERO.has(final)) return tone !== 4;
    // Rule 4
    return tone === 4;
  }

  // Rule 7: an initial-only syllable followed by a zero-initial one keeps its tone
  if (next && next.initial === "" && INITIAL_ONLY.has(initial) && final === "i") return false;

  // Exceptions listed under rules 2 and 3
  if (initial === "t" && final === "ou" && tone === 2) return false;
  if (initial === "l" && final === "e" && tone === 4) return false;
  if (initial === "z" && final === "i" && tone === 4) return false;

  return TONE_ELISION[initial] === tone;
}

function partsToBraille(parts: PinyinParts, toneLevel: ToneLevel, next: PinyinParts | null): string {
  const cells: string[] = [];
  if (parts.initial) cells.push(ZH_INITIALS[parts.initial]);
  cells.push(ZH_FINALS[parts.final]);

  const elided = toneLevel === 2 && toneElided(parts, next);
  if (!elided && ZH_TONES[parts.tone]) cells.push(ZH_TONES[parts.tone]);

  return cells.map(cellFromDots).join("");
}

/** Punctuation, dots separated by spaces because some signs take several cells */
export const ZH_PUNCT: Record<string, string> = {
  "。": "5 23",
  ".": "5 23",
  "，": "5",
  ",": "5",
  "、": "4",
  "；": "56",
  ";": "56",
  "？": "5 3",
  "?": "5 3",
  "！": "56 2",
  "!": "56 2",
  "：": "36",
  ":": "36",
  "“": "45 45",
  "”": "45 45",
  '"': "45 45",
  "（": "56 3",
  "(": "56 3",
  "）": "6 23",
  ")": "6 23",
  "—": "6 36",
  "–": "6 36",
  "-": "6 36",
  "…": "5 5 5",
};

const INITIAL_BY_DOTS: Record<string, string> = Object.fromEntries(
  Object.entries(ZH_INITIALS)
    .filter(([initial]) => !["j", "q", "x"].includes(initial))
    .map(([initial, dots]) => [dots, initial])
);

// Several finals share a cell (o/e, ong/ueng). Keeping the first spelling means
// the common one wins: e over o, ong over ueng.
const FINAL_BY_DOTS: Record<string, string> = {};
for (const [final, dots] of Object.entries(ZH_FINALS)) {
  if (!(dots in FINAL_BY_DOTS)) FINAL_BY_DOTS[dots] = final;
}

const TONE_BY_DOTS: Record<string, number> = Object.fromEntries(
  Object.entries(ZH_TONES).map(([tone, dots]) => [dots, Number(tone)])
);

/** pinyin-pro spells some finals with y/w when no initial is present */
const ZERO_INITIAL: Record<string, string> = {
  yi: "i",
  ya: "ia",
  ye: "ie",
  yao: "iao",
  you: "iou",
  yan: "ian",
  yin: "in",
  yang: "iang",
  ying: "ing",
  yong: "iong",
  yu: "ü",
  yue: "üe",
  yuan: "üan",
  yun: "ün",
  wu: "u",
  wa: "ua",
  wo: "uo",
  wai: "uai",
  wei: "uei",
  wan: "uan",
  wen: "uen",
  wang: "uang",
  weng: "ueng",
};

const INITIAL_ORDER = [
  "zh",
  "ch",
  "sh",
  "b",
  "p",
  "m",
  "f",
  "d",
  "t",
  "n",
  "l",
  "g",
  "k",
  "h",
  "j",
  "q",
  "x",
  "r",
  "z",
  "c",
  "s",
];

export interface PinyinParts {
  initial: string;
  final: string;
  /** 0 means neutral tone, which braille leaves unmarked */
  tone: number;
}

/** Split one numbered pinyin syllable ("zhuang1") into initial, final and tone */
export function splitPinyin(raw: string): PinyinParts | null {
  const match = /^([a-zA-ZüÜ]+)([0-5])?$/.exec(raw.trim());
  if (!match) return null;

  let body = match[1].toLowerCase();
  // pinyin-pro writes the neutral tone as 5 or 0; braille leaves it unmarked
  const tone =
    match[2] && match[2] !== "5" && match[2] !== "0" ? Number(match[2]) : 0;

  if (ZERO_INITIAL[body]) return { initial: "", final: ZERO_INITIAL[body], tone };

  let initial = "";
  for (const candidate of INITIAL_ORDER) {
    if (body.startsWith(candidate)) {
      initial = candidate;
      body = body.slice(candidate.length);
      break;
    }
  }

  let final = body;
  if (initial === "j" || initial === "q" || initial === "x") {
    if (final === "u") final = "ü";
    else if (final === "ue") final = "üe";
    else if (final === "uan") final = "üan";
    else if (final === "un") final = "ün";
  }
  if (final === "iu") final = "iou";
  else if (final === "ui") final = "uei";
  else if (final === "un" && initial !== "") final = "uen";

  if (!(final in ZH_FINALS)) return null;
  if (initial === "" && final === "") return null;

  return { initial, final, tone };
}

export function syllableToBraille(raw: string, toneLevel: ToneLevel = 1): string | null {
  const parts = splitPinyin(raw);
  if (!parts) return null;
  return partsToBraille(parts, toneLevel, null);
}

const HAN_RUN = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]+|[^\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]+/g;

function symbolsToBraille(text: string): string {
  const out: string[] = [];
  let number = false;

  for (const char of text) {
    if (char >= "0" && char <= "9") {
      if (!number) {
        out.push(cellFromDots(NUMBER_SIGN));
        number = true;
      }
      out.push(cellFromDots(EN_LETTERS[digitLetter(Number(char))]));
      continue;
    }

    number = false;

    if (char === " " || char === "\n") {
      out.push(char);
      continue;
    }

    const punct = ZH_PUNCT[char];
    if (punct) {
      for (const dots of punct.split(" ")) out.push(cellFromDots(dots));
      continue;
    }

    out.push(char);
  }

  return out.join("");
}

export function toChineseBraille(text: string, toneLevel: ToneLevel = 1): string {
  const out: string[] = [];

  for (const run of text.match(HAN_RUN) ?? []) {
    if (!/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(run[0])) {
      out.push(symbolsToBraille(run));
      continue;
    }

    const syllables = pinyin(run, { toneType: "num", type: "array" });
    const parts = syllables.map((syllable) => splitPinyin(syllable));

    syllables.forEach((syllable, index) => {
      const current = parts[index];
      if (!current) {
        out.push(syllable);
        return;
      }
      const next = index + 1 < parts.length ? parts[index + 1] : null;
      out.push(partsToBraille(current, toneLevel, next));
    });
  }

  return out.join("");
}

const TONE_MARKS: Record<string, string[]> = {
  a: ["ā", "á", "ǎ", "à"],
  o: ["ō", "ó", "ǒ", "ò"],
  e: ["ē", "é", "ě", "è"],
  i: ["ī", "í", "ǐ", "ì"],
  u: ["ū", "ú", "ǔ", "ù"],
  "ü": ["ǖ", "ǘ", "ǚ", "ǜ"],
};

function applyTone(syllable: string, tone: number): string {
  if (tone < 1 || tone > 4) return syllable;

  let index = -1;
  if (syllable.includes("a")) index = syllable.indexOf("a");
  else if (syllable.includes("o")) index = syllable.indexOf("o");
  else if (syllable.includes("e")) index = syllable.indexOf("e");
  else {
    const iu = syllable.indexOf("iu");
    if (iu >= 0) index = iu + 1;
    else {
      for (let cursor = syllable.length - 1; cursor >= 0; cursor -= 1) {
        if ("iuü".includes(syllable[cursor])) {
          index = cursor;
          break;
        }
      }
    }
  }

  if (index < 0) return syllable;
  const marked = TONE_MARKS[syllable[index]]?.[tone - 1];
  if (!marked) return syllable;
  return syllable.slice(0, index) + marked + syllable.slice(index + 1);
}

/** Spell a syllable the standard pinyin way, including zero-initial y/w forms */
function spellSyllable(initial: string, final: string, tone: number): string {
  let head = initial;

  if (head && "gkh".includes(head) && (final.startsWith("i") || final.startsWith("ü"))) {
    head = head === "g" ? "j" : head === "k" ? "q" : "x";
  }

  if (!head) {
    const zero =
      {
        i: "yi",
        ia: "ya",
        ie: "ye",
        iao: "yao",
        iou: "you",
        ian: "yan",
        in: "yin",
        iang: "yang",
        ing: "ying",
        iong: "yong",
        "ü": "yu",
        "üe": "yue",
        "üan": "yuan",
        "ün": "yun",
        u: "wu",
        ua: "wa",
        uo: "wo",
        uai: "wai",
        uei: "wei",
        uan: "wan",
        uen: "wen",
        uang: "wang",
        ueng: "weng",
      }[final] ?? final;
    return applyTone(zero, tone);
  }

  let tail = final;
  if (head === "j" || head === "q" || head === "x") tail = tail.replace(/^ü/, "u");
  if (tail === "iou") tail = "iu";
  else if (tail === "uei") tail = "ui";
  else if (tail === "uen") tail = "un";

  return applyTone(head + tail, tone);
}

interface PunctMatch {
  char: string;
  length: number;
}

const PUNCT_ENTRIES = Object.entries(ZH_PUNCT)
  .map(([char, dots]) => ({ char, cells: dots.split(" ") }))
  .sort((a, b) => b.cells.length - a.cells.length);

function matchPunct(cells: string[], start: number): PunctMatch | null {
  for (const entry of PUNCT_ENTRIES) {
    if (start + entry.cells.length > cells.length) continue;
    let hit = true;
    for (let offset = 0; offset < entry.cells.length; offset += 1) {
      if (dotsFromCell(cells[start + offset]) !== entry.cells[offset]) {
        hit = false;
        break;
      }
    }
    if (hit) return { char: entry.char, length: entry.cells.length };
  }
  return null;
}

function digitsAt(cells: string[], start: number): { text: string; length: number } {
  let text = "";
  let index = start;
  while (index < cells.length) {
    const dots = dotsFromCell(cells[index]);
    const letter = EN_BY_DOTS[dots];
    const digit = letter ? letterDigit(letter) : -1;
    if (digit < 0) break;
    text += String(digit);
    index += 1;
  }
  return { text, length: index - start };
}

export function fromChineseBraille(text: string): string {
  const cells = Array.from(text);
  const out: string[] = [];
  let initial: string | null = null;
  let index = 0;

  while (index < cells.length) {
    const cell = cells[index];

    if (cell === " " || cell === "\n") {
      initial = null;
      out.push(cell);
      index += 1;
      continue;
    }

    const punct = matchPunct(cells, index);
    if (punct) {
      out.push(punct.char);
      initial = null;
      index += punct.length;
      continue;
    }

    const dots = dotsFromCell(cell);
    if (!dots) {
      out.push(cell);
      index += 1;
      continue;
    }

    // 3456 is both the number sign and the final "eng" — a following a–j decides
    if (dots === NUMBER_SIGN) {
      const digits = digitsAt(cells, index + 1);
      if (digits.length > 0) {
        out.push(digits.text);
        index += digits.length + 1;
        continue;
      }
    }

    if (INITIAL_BY_DOTS[dots]) {
      initial = INITIAL_BY_DOTS[dots];
      index += 1;
      continue;
    }

    const final = FINAL_BY_DOTS[dots];
    if (final) {
      let tone = 0;
      const nextDots = index + 1 < cells.length ? dotsFromCell(cells[index + 1]) : "";
      if (nextDots && nextDots !== NUMBER_SIGN && TONE_BY_DOTS[nextDots]) {
        tone = TONE_BY_DOTS[nextDots];
        index += 1;
      }
      out.push(spellSyllable(initial ?? "", final, tone));
      initial = null;
      index += 1;
      continue;
    }

    if (TONE_BY_DOTS[dots] && initial) {
      index += 1;
      continue;
    }

    out.push(cell);
    index += 1;
  }

  return out.join("");
}

/* -------------------------------------------------------------------- shared */

export type BrailleMode = "en" | "zh";

export interface BrailleResult {
  output: string;
  direction: "encode" | "decode";
  /** Grade 2 decoding expands contractions and may not restore the original wording */
  approximate?: boolean;
}

export interface BrailleOptions {
  /** English contraction level, 1 (letter by letter) or 2 (UEB contracted) */
  grade?: 1 | 2;
  /** Chinese tone marking level, 1 (every syllable) or 2 (with elision) */
  toneLevel?: ToneLevel;
}

export function convertBraille(
  input: string,
  mode: BrailleMode,
  options: BrailleOptions = {}
): BrailleResult {
  const decode = Array.from(input).some(isBrailleCell);
  const grade = options.grade ?? 1;
  const toneLevel = options.toneLevel ?? 1;

  if (decode) {
    if (mode === "en") {
      if (grade === 2) {
        return {
          output: fromGrade2Braille(input),
          direction: "decode",
          approximate: true,
        };
      }
      return { output: fromEnglishBraille(input), direction: "decode" };
    }
    return { output: fromChineseBraille(input), direction: "decode" };
  }

  return {
    output:
      mode === "en"
        ? grade === 2
          ? toGrade2Braille(input)
          : toEnglishBraille(input)
        : toChineseBraille(input, toneLevel),
    direction: "encode",
  };
}

/** Append the dot numbers to every cell, e.g. `⠝(1345) ⠊(24)` */
export function annotateDots(braille: string): string {
  return braille
    .split("\n")
    .map((line) =>
      Array.from(line)
        .map((char) => {
          if (char === " ") return "";
          if (!isBrailleCell(char)) return char;
          const dots = dotsFromCell(char);
          return dots ? `${char}(${dots})` : char;
        })
        .filter(Boolean)
        .join(" ")
    )
    .join("\n");
}
