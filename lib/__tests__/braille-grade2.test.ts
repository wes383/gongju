import { describe, expect, it } from "vitest";
import { fromGrade2Braille, toGrade2Braille } from "@/lib/braille-grade2";

describe("grade 2 whole-word signs", () => {
  it("uses alphabetic wordsigns", () => {
    expect(toGrade2Braille("but")).toBe("⠃");
    expect(toGrade2Braille("can")).toBe("⠉");
    expect(toGrade2Braille("people")).toBe("⠏");
    expect(toGrade2Braille("it")).toBe("⠭");
  });

  it("uses strong contractions", () => {
    expect(toGrade2Braille("the")).toBe("⠮");
    expect(toGrade2Braille("and")).toBe("⠯");
    expect(toGrade2Braille("with")).toBe("⠾");
  });

  it("uses strong wordsigns only when standing alone", () => {
    expect(toGrade2Braille("child")).toBe("⠡");
    expect(toGrade2Braille("this")).toBe("⠹");
    // inside a word the same cell is the groupsign ch / th
    expect(toGrade2Braille("children")).not.toBe("⠡");
  });

  it("uses two-cell initial-letter contractions", () => {
    expect(toGrade2Braille("there")).toBe("⠐⠮");
    expect(toGrade2Braille("cannot")).toBe("⠸⠉");
    expect(toGrade2Braille("these")).toBe("⠘⠮");
  });

  it("uses shortforms", () => {
    expect(toGrade2Braille("about")).toBe("⠁⠃");
    expect(toGrade2Braille("because")).toBe("⠃⠑⠉");
    expect(toGrade2Braille("together")).toBe("⠞⠛⠗");
  });
});

describe("grade 2 inside words", () => {
  it("applies groupsigns by position", () => {
    expect(toGrade2Braille("running")).toBe("⠗⠥⠝⠝⠬");
    expect(toGrade2Braille("shopping")).toBe("⠩⠕⠏⠏⠬");
  });

  it("keeps a final-letter groupsign at the end of a word", () => {
    // -tion / -ment / -ity
    expect(toGrade2Braille("action")).toBe("⠁⠉⠰⠝");
    expect(toGrade2Braille("movement")).toBe("⠍⠕⠧⠑⠰⠞");
  });

  it("does not elide letters at the wrong position", () => {
    // "en" is a lower groupsign, so it cannot open a word
    expect(toGrade2Braille("enemy")).toBe("⠑⠝⠑⠍⠽");
  });
});

describe("grade 2 caps, digits and punctuation", () => {
  it("marks capitals", () => {
    expect(toGrade2Braille("The")).toBe("⠠⠮");
    expect(toGrade2Braille("BUT")).toBe("⠠⠠⠃");
  });

  it("switches to digits", () => {
    expect(toGrade2Braille("2026")).toBe("⠼⠃⠚⠃⠋");
  });

  it("keeps punctuation", () => {
    expect(toGrade2Braille("a, b.")).toBe("⠁⠂ ⠃⠲");
  });
});

describe("grade 2 decoding", () => {
  it("expands whole words", () => {
    expect(fromGrade2Braille("⠮")).toBe("the");
    expect(fromGrade2Braille("⠐⠮")).toBe("there");
    expect(fromGrade2Braille("⠁⠃")).toBe("about");
  });

  it("restores capitals and punctuation", () => {
    expect(fromGrade2Braille("⠮ ⠉⠁⠞ ⠯ ⠮ ⠙⠕⠛")).toBe("the cat and the dog");
    expect(fromGrade2Braille("⠠⠮ ⠉⠁⠞")).toBe("The cat");
  });

  it("round-trips a plain sentence closely", () => {
    const text = "The cat and the dog";
    expect(fromGrade2Braille(toGrade2Braille(text))).toBe(text);
  });
});
