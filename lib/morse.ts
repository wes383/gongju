/**
 * International Morse code.
 *
 * Letters are separated by a space and words by a slash, which is the layout
 * every other encoder uses and what people paste in from elsewhere.
 */

const TABLE: Record<string, string> = {
  A: ".-",
  B: "-...",
  C: "-.-.",
  D: "-..",
  E: ".",
  F: "..-.",
  G: "--.",
  H: "....",
  I: "..",
  J: ".---",
  K: "-.-",
  L: ".-..",
  M: "--",
  N: "-.",
  O: "---",
  P: ".--.",
  Q: "--.-",
  R: ".-.",
  S: "...",
  T: "-",
  U: "..-",
  V: "...-",
  W: ".--",
  X: "-..-",
  Y: "-.--",
  Z: "--..",
  "0": "-----",
  "1": ".----",
  "2": "..---",
  "3": "...--",
  "4": "....-",
  "5": ".....",
  "6": "-....",
  "7": "--...",
  "8": "---..",
  "9": "----.",
  ".": ".-.-.-",
  ",": "--..--",
  "?": "..--..",
  "'": ".----.",
  "!": "-.-.--",
  "/": "-..-.",
  "(": "-.--.",
  ")": "-.--.-",
  "&": ".-...",
  ":": "---...",
  ";": "-.-.-.",
  "=": "-...-",
  "+": ".-.-.",
  "-": "-....-",
  _: "..--.-",
  '"': ".-..-.",
  $: "...-..-",
  "@": ".--.-.",
  // Full-width punctuation is decoded back as its ASCII counterpart.
  "，": "--..--",
  "。": ".-.-.-",
  "？": "..--..",
  "！": "-.-.--",
  "：": "---...",
  "；": "-.-.-.",
  "（": "-.--.",
  "）": "-.--.-",
};

const REVERSE = new Map<string, string>(
  Object.entries(TABLE).map(([char, code]) => [code, char])
);

export interface MorseEncoded {
  code: string;
  unsupported: string[];
}

export interface MorseDecoded {
  text: string;
  unsupported: string[];
}

export function encodeMorse(text: string): MorseEncoded {
  const unsupported: string[] = [];

  const code = text
    .split(/\r?\n/)
    .map((line) =>
      line
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((word) =>
          [...word.toUpperCase()]
            .map((char) => {
              const symbol = TABLE[char];
              if (!symbol) {
                unsupported.push(char);
                return "";
              }
              return symbol;
            })
            .filter(Boolean)
            .join(" ")
        )
        // A word made only of unsupported characters would leave an empty slot
        .filter(Boolean)
        .join(" / ")
    )
    .join("\n");

  return { code, unsupported: [...new Set(unsupported)] };
}

export function decodeMorse(code: string): MorseDecoded {
  const unsupported: string[] = [];

  const text = code
    .split(/\r?\n/)
    .map((line) =>
      line
        .trim()
        .split(/\s*\/\s*/)
        .filter(Boolean)
        .map((word) =>
          word
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .map((symbol) => {
              const char = REVERSE.get(symbol);
              if (!char) {
                unsupported.push(symbol);
                return "";
              }
              return char;
            })
            .join("")
        )
        .join(" ")
    )
    .join("\n");

  return { text, unsupported: [...new Set(unsupported)] };
}

/** A rough duration estimate in seconds for the player, at `wpm` words per minute. */
export function morseDuration(code: string, wpm = 12): number {
  const unit = 1.2 / Math.max(wpm, 1);
  let units = 0;
  for (const char of code) {
    if (char === ".") units += 1;
    else if (char === "-") units += 3;
    else if (char === " ") units += 3;
    else if (char === "/") units += 7;
  }
  return units * unit;
}
