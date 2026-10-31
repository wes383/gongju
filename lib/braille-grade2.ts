/**
 * Unified English Braille, Grade 2 (contracted).
 *
 * The tables cover all 181 UEB contractions. Conversion applies the position
 * rules a contraction needs (whole word, start, middle, end), but does not
 * model grade 1 mode, syllable bridging, hyphenated compounds or the
 * "best contraction" preference rules. The result is a faithful teaching
 * transcription rather than a press-quality one, and decoding is a best-effort
 * expansion because most cells carry more than one reading.
 */

import {
  CAPITAL_SIGN,
  EN_BY_DOTS,
  EN_LETTERS,
  EN_PUNCT,
  NUMBER_SIGN,
  cellFromDots,
  cellsFromDots,
  digitLetter,
  dotsFromCell,
  letterDigit,
} from "./braille-cells";

/* -------------------------------------------------------------------- tables */

/** Alphabetic wordsigns: a single letter standing for a whole word */
const ALPHABETIC: Record<string, string> = {
  but: "12",
  can: "14",
  do: "145",
  every: "15",
  from: "124",
  go: "1245",
  have: "125",
  just: "245",
  knowledge: "13",
  like: "123",
  more: "134",
  not: "1345",
  people: "1234",
  quite: "12345",
  rather: "1235",
  so: "234",
  that: "2345",
  us: "136",
  very: "1236",
  will: "2456",
  it: "1346",
  you: "13456",
  as: "1356",
};

/** Strong contractions: wordsign and groupsign at the same time */
const STRONG: Record<string, string> = {
  and: "12346",
  for: "123456",
  of: "12356",
  the: "2346",
  with: "23456",
};

/** Strong wordsigns that only stand alone */
const STRONG_WORDSIGNS: Record<string, string> = {
  child: "16",
  shall: "146",
  this: "1456",
  which: "156",
  out: "1256",
  still: "34",
};

/** Strong groupsigns that only appear inside a word */
const STRONG_GROUPSIGNS: Record<string, string> = {
  ch: "16",
  sh: "146",
  th: "1456",
  wh: "156",
  ou: "1256",
  st: "34",
  ar: "345",
  ing: "346",
  er: "12456",
  gh: "126",
  ed: "1246",
  ow: "246",
};

/** Lower wordsigns that only stand alone */
const LOWER_WORDSIGNS: Record<string, string> = {
  enough: "26",
  were: "2356",
  his: "236",
  was: "356",
};

/** Lower groupsigns, mostly restricted to the middle of a word */
const LOWER_GROUPSIGNS: Record<string, string> = {
  be: "23",
  con: "25",
  dis: "256",
  in: "35",
  en: "26",
  ea: "2",
  bb: "23",
  cc: "25",
  ff: "256",
  gg: "2356",
};

/** Initial-letter contractions: a dot-5 prefix plus the letter's cell */
const INITIAL: Record<string, string> = {
  day: "5 145",
  ever: "5 15",
  father: "5 124",
  here: "5 125",
  know: "5 13",
  lord: "5 123",
  mother: "5 134",
  name: "5 1345",
  one: "5 135",
  part: "5 1234",
  question: "5 12345",
  right: "5 1235",
  some: "5 234",
  time: "5 2345",
  under: "5 136",
  work: "5 2456",
  young: "5 13456",
  there: "5 2346",
  character: "5 16",
  through: "5 1456",
  where: "5 156",
  ought: "5 1256",
  upon: "45 136",
  these: "45 2346",
  those: "45 1456",
  whose: "45 156",
  word: "45 2456",
  cannot: "456 14",
  had: "456 125",
  many: "456 134",
  spirit: "456 234",
  their: "456 2346",
  world: "456 2456",
};

/** Final-letter groupsigns: dots 46 / 56 plus the letter's cell */
const FINAL: Record<string, string> = {
  ound: "46 145",
  ount: "46 2345",
  ance: "46 15",
  less: "46 234",
  sion: "46 1345",
  ence: "56 15",
  ong: "56 1245",
  ful: "56 123",
  tion: "56 1345",
  ness: "56 234",
  ment: "56 2345",
  ity: "56 13456",
};

/** Shortforms: a shortened letter sequence standing for a whole word */
const SHORTFORMS: Record<string, string> = {
  about: "ab",
  above: "abv",
  according: "ac",
  across: "acr",
  after: "af",
  afternoon: "afn",
  afterward: "afw",
  again: "ag",
  against: "agst",
  almost: "alm",
  already: "alr",
  also: "al",
  although: "alth",
  altogether: "alt",
  always: "alw",
  because: "bec",
  before: "bef",
  behind: "beh",
  below: "bel",
  beneath: "ben",
  beside: "bes",
  between: "bet",
  beyond: "bey",
  blind: "bl",
  braille: "brl",
  children: "chn",
  conceive: "concv",
  conceiving: "concvg",
  could: "cd",
  deceive: "dcv",
  deceiving: "dcvg",
  declare: "dcl",
  declaring: "dclg",
  either: "ei",
  first: "fst",
  friend: "fr",
  good: "gd",
  great: "grt",
  herself: "herf",
  him: "hm",
  himself: "hmf",
  immediate: "imm",
  its: "xs",
  itself: "xf",
  letter: "lr",
  little: "ll",
  much: "mch",
  must: "mst",
  myself: "myf",
  necessary: "nec",
  neither: "nei",
  oneself: "onef",
  ourselves: "ourvs",
  paid: "pd",
  perceive: "perc",
  perceiving: "percvg",
  perhaps: "perh",
  quick: "qk",
  receive: "rcv",
  receiving: "rcvg",
  rejoice: "rjc",
  rejoicing: "rjcg",
  said: "sd",
  should: "shd",
  such: "sch",
  themselves: "themvs",
  thyself: "thyf",
  today: "td",
  together: "tgr",
  tomorrow: "tm",
  tonight: "tn",
  would: "wd",
  your: "yr",
  yourself: "yrf",
  yourselves: "yrvs",
};

/** Every sign that can stand alone as a word */
const WORDSIGNS: Record<string, string> = {
  ...ALPHABETIC,
  ...STRONG,
  ...STRONG_WORDSIGNS,
  ...LOWER_WORDSIGNS,
  ...INITIAL,
};

type Position = "any" | "start" | "middle" | "end";

interface GroupSign {
  text: string;
  dots: string;
  position: Position;
}

const GROUPSIGNS: GroupSign[] = [
  ...Object.entries(STRONG_GROUPSIGNS).map(([text, dots]) => ({
    text,
    dots,
    position: "any" as Position,
  })),
  ...Object.entries(STRONG).map(([text, dots]) => ({
    text,
    dots,
    position: "any" as Position,
  })),
  ...Object.entries(LOWER_GROUPSIGNS).map(([text, dots]) => ({
    text,
    dots,
    position: (["be", "con", "dis"].includes(text) ? "start" : "middle") as Position,
  })),
  ...Object.entries(INITIAL).map(([text, dots]) => ({
    text,
    dots,
    position: "any" as Position,
  })),
  ...Object.entries(FINAL).map(([text, dots]) => ({
    text,
    dots,
    position: "end" as Position,
  })),
].sort((a, b) => b.text.length - a.text.length || b.dots.split(" ").length - a.dots.split(" ").length);

/* ------------------------------------------------------------------- encode */

function cellSequence(dots: string): string {
  return cellsFromDots(dots);
}

function letterCells(text: string): string {
  return Array.from(text)
    .map((char) => cellFromDots(EN_LETTERS[char] ?? "3"))
    .join("");
}

function capitalPrefix(word: string): string {
  if (!/[A-Z]/.test(word)) return "";
  const capital = cellFromDots(CAPITAL_SIGN);
  if (word.length > 1 && word === word.toUpperCase()) return capital + capital;
  return capital;
}

function positionFits(position: Position, start: number, end: number, length: number): boolean {
  switch (position) {
    case "start":
      return start === 0;
    case "middle":
      return start > 0 && end < length;
    case "end":
      return end === length && start > 0;
    default:
      return true;
  }
}

function groupSignAt(word: string, index: number): GroupSign | null {
  for (const sign of GROUPSIGNS) {
    if (!word.startsWith(sign.text, index)) continue;
    if (!positionFits(sign.position, index, index + sign.text.length, word.length)) continue;
    return sign;
  }
  return null;
}

function spellWord(word: string): string {
  const out: string[] = [];
  let index = 0;

  while (index < word.length) {
    const sign = groupSignAt(word, index);
    if (sign) {
      out.push(cellSequence(sign.dots));
      index += sign.text.length;
      continue;
    }

    const char = word[index];
    if (char === "'") {
      out.push(cellFromDots(EN_PUNCT["'"]));
    } else if (EN_LETTERS[char]) {
      out.push(cellFromDots(EN_LETTERS[char]));
    } else {
      out.push(char);
    }
    index += 1;
  }

  return out.join("");
}

function wordToken(word: string): string {
  const lower = word.toLowerCase();
  const prefix = capitalPrefix(word);

  const whole = WORDSIGNS[lower];
  if (whole) return prefix + cellSequence(whole);

  const shortform = SHORTFORMS[lower];
  if (shortform) return prefix + letterCells(shortform);

  return prefix + spellWord(lower);
}

export function toGrade2Braille(text: string): string {
  const out: string[] = [];
  let number = false;

  for (let index = 0; index < text.length; ) {
    const char = text[index];

    if (char >= "0" && char <= "9") {
      if (!number) {
        out.push(cellFromDots(NUMBER_SIGN));
        number = true;
      }
      out.push(cellFromDots(EN_LETTERS[digitLetter(Number(char))]));
      index += 1;
      continue;
    }

    number = false;

    if (char === " " || char === "\n") {
      out.push(char);
      index += 1;
      continue;
    }

    if (char === "(") {
      out.push(cellFromDots("5"), cellFromDots("126"));
      index += 1;
      continue;
    }

    if (char === ")") {
      out.push(cellFromDots("5"), cellFromDots("345"));
      index += 1;
      continue;
    }

    if (/[A-Za-z']/.test(char)) {
      let end = index;
      while (end < text.length && /[A-Za-z']/.test(text[end])) end += 1;
      out.push(wordToken(text.slice(index, end)));
      index = end;
      continue;
    }

    if (EN_PUNCT[char]) {
      out.push(cellFromDots(EN_PUNCT[char]));
      index += 1;
      continue;
    }

    out.push(char);
    index += 1;
  }

  return out.join("");
}

/* ------------------------------------------------------------------- decode */

const WORDSIGN_BY_DOTS: Record<string, string> = {};
for (const [word, dots] of Object.entries(WORDSIGNS)) {
  // Longer words win when two signs share a cell (this / th), keeping the
  // groupsign reading for the shorter form.
  if (!(dots in WORDSIGN_BY_DOTS)) WORDSIGN_BY_DOTS[dots] = word;
}

/** Groupsign readings used inside a word; first entry wins for shared cells */
const GROUPSIGN_BY_DOTS: Record<string, string> = {};
for (const sign of [...GROUPSIGNS].reverse()) {
  GROUPSIGN_BY_DOTS[sign.dots] = sign.text;
}

const PUNCT_BY_DOTS: Record<string, string> = Object.fromEntries(
  Object.entries(EN_PUNCT).map(([char, dots]) => [dots, char])
);

const FINAL_BY_DOTS: Record<string, string> = Object.fromEntries(
  Object.entries(FINAL).map(([text, dots]) => [dots, text])
);

const INITIAL_BY_DOTS: Record<string, string> = Object.fromEntries(
  Object.entries(INITIAL).map(([text, dots]) => [dots, text])
);

/** Cell sequence of every shortform, used to match a whole word */
const SHORTFORM_BY_CELLS: Record<string, string> = Object.fromEntries(
  Object.entries(SHORTFORMS).map(([word, letters]) => [
    Array.from(letterCells(letters))
      .map((cell) => dotsFromCell(cell))
      .join(" "),
    word,
  ])
);

function decodeCells(cells: string[]): string {
  const out: string[] = [];
  let number = false;
  let index = 0;

  while (index < cells.length) {
    const cell = cells[index];
    const dots = dotsFromCell(cell);

    if (!dots) {
      out.push(cell);
      index += 1;
      continue;
    }

    if (dots === NUMBER_SIGN) {
      number = true;
      index += 1;
      continue;
    }

    if (dots === CAPITAL_SIGN) {
      const next = index + 1 < cells.length ? cells[index + 1] : "";
      out.push(next.toUpperCase());
      index += 2;
      continue;
    }

    // Opening and closing parentheses are ⠐⠣ and ⠐⠜
    if (dots === "5") {
      const nextDots = dotsFromCell(cells[index + 1] ?? "");
      if (nextDots === "126") {
        out.push("(");
        index += 2;
        continue;
      }
      if (nextDots === "345") {
        out.push(")");
        index += 2;
        continue;
      }
    }

    const prefixed = `${dots} ${dotsFromCell(cells[index + 1] ?? "")}`;
    if (INITIAL_BY_DOTS[prefixed]) {
      out.push(INITIAL_BY_DOTS[prefixed]);
      index += 2;
      continue;
    }
    if (FINAL_BY_DOTS[prefixed]) {
      out.push(FINAL_BY_DOTS[prefixed]);
      index += 2;
      continue;
    }

    if (number) {
      const letter = EN_BY_DOTS[dots];
      const digit = letter ? letterDigit(letter) : -1;
      if (digit >= 0) {
        out.push(String(digit));
        index += 1;
        continue;
      }
      number = false;
    }

    const group = GROUPSIGN_BY_DOTS[dots];
    if (group) {
      // At either edge of a word a shared cell is far more likely punctuation
      // (⠂ comma vs ea, ⠲ period vs dis), so let punctuation win there.
      const edge = index === 0 || index === cells.length - 1;
      const punct = edge ? PUNCT_BY_DOTS[dots] : undefined;
      if (!punct) {
        out.push(group);
        index += 1;
        continue;
      }
    }

    const letter = EN_BY_DOTS[dots];
    if (letter) {
      out.push(letter);
      index += 1;
      continue;
    }

    const punct = PUNCT_BY_DOTS[dots];
    if (punct) {
      out.push(punct);
      index += 1;
      continue;
    }

    out.push(cell);
    index += 1;
  }

  return out.join("");
}

function decodeWord(raw: string): string {
  const cells = Array.from(raw);
  if (cells.length === 0) return raw;

  let index = 0;
  let capital = false;
  let capsWord = false;
  while (index < cells.length && dotsFromCell(cells[index]) === CAPITAL_SIGN) {
    if (index === 0) capital = true;
    else capsWord = true;
    index += 1;
  }

  const body = cells.slice(index);
  if (body.length === 0) return raw;

  const apply = (text: string) => {
    if (capsWord) return text.toUpperCase();
    if (capital) return text.charAt(0).toUpperCase() + text.slice(1);
    return text;
  };

  const key = body.map((cell) => dotsFromCell(cell)).join(" ");

  const shortform = SHORTFORM_BY_CELLS[key];
  if (shortform) return apply(shortform);

  if (body.length === 1) {
    const punct = PUNCT_BY_DOTS[key];
    if (punct) return apply(punct);
    const word = WORDSIGN_BY_DOTS[key];
    if (word) return apply(word);
  }

  const text = decodeCells(body);
  return apply(text);
}

export function fromGrade2Braille(text: string): string {
  return text
    .split(/(\s+)/)
    .map((part) => (part.trim() === "" ? part : decodeWord(part)))
    .join("");
}
