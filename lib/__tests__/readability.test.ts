import { describe, expect, it } from "vitest";
import { countSyllables, readability, readingLevel } from "@/lib/readability";
import { isCodedError } from "@/lib/errors";

describe("countSyllables", () => {
  it("handles the easy cases", () => {
    expect(countSyllables("cat")).toBe(1);
    expect(countSyllables("the")).toBe(1);
    expect(countSyllables("water")).toBe(2);
    expect(countSyllables("table")).toBe(2);
    expect(countSyllables("little")).toBe(2);
    expect(countSyllables("beautiful")).toBe(3);
    expect(countSyllables("university")).toBe(5);
  });

  it("knows the words the vowel heuristic gets wrong", () => {
    expect(countSyllables("people")).toBe(2);
    expect(countSyllables("science")).toBe(2);
    expect(countSyllables("queue")).toBe(1);
    expect(countSyllables("rhythm")).toBe(2);
    expect(countSyllables("idea")).toBe(3);
  });

  it("ignores punctuation and digits", () => {
    expect(countSyllables("cat's")).toBe(1);
    expect(countSyllables("2026")).toBe(0);
    expect(countSyllables("")).toBe(0);
  });
});

describe("readability", () => {
  const easy = "The cat sat on the mat. The dog ran. A boy saw it.";
  const hard =
    "Notwithstanding the considerable ambiguity inherent in the committee's recommendations, implementation necessitates a comprehensive reconsideration of the underlying infrastructure.";

  it("counts words, sentences and syllables", () => {
    const result = readability(easy);
    expect(result.english).toMatchObject({ words: 13, sentences: 3 });
    expect(result.english?.syllables).toBe(13);
  });

  it("scores a simple passage as easier than a dense one", () => {
    const simple = readability(easy).english!;
    const dense = readability(hard).english!;
    expect(simple.scores.flesch).toBeGreaterThan(100);
    expect(dense.scores.flesch).toBeLessThan(30);
    expect(readingLevel(simple.scores.flesch)).toBe("veryEasy");
    expect(readingLevel(dense.scores.flesch)).toBe("veryHard");
  });

  it("leaves SMOG empty below three sentences", () => {
    expect(readability("One short sentence.").english!.scores.smog).toBeNull();
    expect(readability(easy).english!.scores.smog).not.toBeNull();
  });

  it("reports Chinese text by shape instead of inventing a score", () => {
    const result = readability("今天天气很好。我们去海边走走吧。海风很凉。");
    expect(result.english).toBeNull();
    expect(result.cjk.characters).toBe(18);
    expect(result.cjk.sentences).toBe(3);
    expect(result.cjk.unique).toBeLessThan(18);
  });

  it("mixes both sides for a bilingual passage", () => {
    const result = readability("海风很凉。The wind is cold today.");
    expect(result.english?.words).toBe(5);
    expect(result.cjk.characters).toBe(4);
  });

  it("refuses text with nothing to measure", () => {
    try {
      readability("   \n  ");
      throw new Error("expected a coded error");
    } catch (error) {
      expect(isCodedError(error) && error.code).toBe("read.empty");
    }
  });
});

describe("readingLevel", () => {
  it("follows the Flesch bands", () => {
    expect(readingLevel(95)).toBe("veryEasy");
    expect(readingLevel(85)).toBe("easy");
    expect(readingLevel(75)).toBe("fairlyEasy");
    expect(readingLevel(65)).toBe("plain");
    expect(readingLevel(55)).toBe("fairlyHard");
    expect(readingLevel(40)).toBe("hard");
    expect(readingLevel(10)).toBe("veryHard");
  });
});
