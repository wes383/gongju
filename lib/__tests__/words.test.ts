import { describe, expect, it } from "vitest";
import {
  buildGlossary,
  frequency,
  glossaryTsv,
  latinWords,
  hanCharacters,
  parseKnownWords,
  splitSentences,
} from "@/lib/words";
import { isCodedError } from "@/lib/errors";

function codeOf(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return isCodedError(error) ? error.code : "uncoded";
  }
  return "no-error";
}

describe("splitSentences", () => {
  it("breaks on both Latin and CJK punctuation", () => {
    expect(splitSentences("One. Two! Three?")).toHaveLength(3);
    expect(splitSentences("第一句。第二句！第三句？")).toHaveLength(3);
  });

  it("keeps a line break as a boundary", () => {
    expect(splitSentences("first line\nsecond line")).toEqual(["first line", "second line"]);
  });
});

describe("tokenisers", () => {
  it("lowercases Latin words and keeps inner apostrophes", () => {
    expect(latinWords("Don't STOP, it's fine.")).toEqual(["don't", "stop", "it's", "fine"]);
  });

  it("skips Han runs when counting Latin words", () => {
    expect(latinWords("hello 世界 world")).toEqual(["hello", "world"]);
  });

  it("counts Han characters one by one", () => {
    expect(hanCharacters("你好，世界")).toEqual(["你", "好", "世", "界"]);
  });
});

describe("frequency", () => {
  const text = "The sea was calm. The sea was cold. The wind rose.";

  it("sorts by count and drops stopwords", () => {
    const result = frequency(text);
    expect(result.entries[0]).toMatchObject({ word: "sea", count: 2 });
    expect(result.entries.map((entry) => entry.word)).not.toContain("the");
    expect(result.entries.map((entry) => entry.word)).not.toContain("was");
  });

  it("reports totals before and after filtering", () => {
    const result = frequency(text);
    // 11 tokens before filtering; sea x2, calm, cold, wind, rose survive
    expect(result.total).toBe(11);
    expect(result.tokens).toBe(6);
    expect(result.unique).toBe(5);
  });

  it("shares add up to one", () => {
    const result = frequency(text);
    const sum = result.entries.reduce((total, entry) => total + entry.share, 0);
    expect(sum).toBeCloseTo(1, 10);
  });

  it("attaches the first sentence as context", () => {
    const result = frequency(text);
    expect(result.entries.find((entry) => entry.word === "calm")?.context).toBe(
      "The sea was calm."
    );
  });

  it("honours the minimum length", () => {
    const result = frequency("Go see the sea, run far", { minLength: 3 });
    expect(result.entries.map((entry) => entry.word)).toEqual(["far", "run", "sea", "see"]);
  });

  it("counts Han characters and drops the most common ones", () => {
    const result = frequency("我们的海很蓝，我们的天很蓝。", { mode: "cjk" });
    expect(result.entries[0]).toMatchObject({ word: "蓝", count: 2 });
    expect(result.entries.map((entry) => entry.word)).not.toContain("的");
  });

  it("refuses to score text with no words", () => {
    expect(codeOf(() => frequency("!!! 123 ???"))).toBe("words.empty");
  });
});

describe("parseKnownWords", () => {
  it("accepts commas, spaces and newlines", () => {
    expect([...parseKnownWords("sea, wind\nrose river")].sort()).toEqual([
      "river",
      "rose",
      "sea",
      "wind",
    ]);
  });
});

describe("buildGlossary", () => {
  const text = "The sea was calm. The sea was cold. The wind rose over the calm sea.";

  it("removes words the reader already knows", () => {
    const result = buildGlossary(text, { known: "sea, calm" });
    expect(result.entries.map((entry) => entry.word)).not.toContain("sea");
    expect(result.entries.map((entry) => entry.word)).not.toContain("calm");
    expect(result.knownSkipped).toBe(2);
  });

  it("applies a minimum count", () => {
    const result = buildGlossary(text, { minCount: 3 });
    // Only "sea" appears three times
    expect(result.entries.map((entry) => entry.word)).toEqual(["sea"]);
    expect(result.rareSkipped).toBeGreaterThan(0);
  });

  it("explains when the known list swallowed everything", () => {
    expect(codeOf(() => buildGlossary("sea sea sea", { known: "sea" }))).toBe("words.allKnown");
  });

  it("explains when the minimum is too high", () => {
    expect(codeOf(() => buildGlossary("sea wind", { minCount: 5 }))).toBe("words.belowMin");
  });
});

describe("glossaryTsv", () => {
  it("puts word, count and context on one row", () => {
    const result = buildGlossary("The lighthouse keeper climbed slowly.");
    expect(glossaryTsv(result.entries)).toContain("lighthouse\t1\t");
  });
});
