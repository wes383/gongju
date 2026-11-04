import { describe, expect, it } from "vitest";
import { joinCues, studySheet } from "@/lib/study";
import type { Cue } from "@/lib/subtitle";

const cue = (start: number, end: number, text: string): Cue => ({ start, end, text });

const CUES: Cue[] = [
  cue(1000, 4200, "The tide comes in twice a day."),
  cue(4400, 7800, "We walked along the waterline\nand picked up what the sea left behind."),
  cue(8000, 11600, "Most of it was ordinary: shells and driftwood."),
  cue(12000, 16400, "The tide comes in again."),
];

describe("joinCues", () => {
  it("joins a wrapped line into one sentence", () => {
    const text = joinCues([cue(0, 1000, "I think we should"), cue(1100, 2000, "go now.")]);
    expect(text).toBe("I think we should go now.");
  });

  it("starts a new line after a full stop", () => {
    const text = joinCues([cue(0, 1000, "First one."), cue(1100, 2000, "Second one.")]);
    expect(text).toBe("First one.\nSecond one.");
  });

  it("starts a new line after a long pause even without punctuation", () => {
    const text = joinCues([cue(0, 1000, "a long pause"), cue(3000, 4000, "followed by more")]);
    expect(text).toContain("\n");
  });

  it("flattens newlines inside a cue", () => {
    expect(joinCues([cue(0, 1000, "one\ntwo")])).toBe("one two");
  });
});

describe("studySheet", () => {
  it("lists cues with short timecodes", () => {
    const sheet = studySheet(CUES);
    expect(sheet.lines[0]).toMatchObject({ time: "00:01", text: "The tide comes in twice a day." });
    expect(sheet.cues).toBe(4);
    expect(sheet.duration).toBe(16400);
  });

  it("builds a vocabulary list without the function words", () => {
    const sheet = studySheet(CUES);
    const words = sheet.glossary.map((entry) => entry.word);
    expect(words).toContain("tide");
    expect(words).not.toContain("the");
    expect(sheet.glossary.find((entry) => entry.word === "tide")?.count).toBe(2);
  });

  it("honours the minimum count and the limit", () => {
    expect(studySheet(CUES, { minCount: 2 }).glossary.map((entry) => entry.word)).toEqual(["comes", "tide"]);
    expect(studySheet(CUES, { limit: 2 }).glossary).toHaveLength(2);
  });

  it("counts Han characters when the subtitle is Chinese", () => {
    const sheet = studySheet([cue(0, 2000, "海风很凉。"), cue(2200, 4000, "我们回家吧。")]);
    expect(sheet.glossary.some((entry) => entry.word === "海")).toBe(true);
    expect(sheet.lines[0].length).toBe(4);
  });

  it("writes a markdown sheet with both sections", () => {
    const sheet = studySheet(CUES, { title: "My notes" });
    expect(sheet.markdown).toContain("# My notes");
    expect(sheet.markdown).toContain("## 台词 / Transcript");
    expect(sheet.markdown).toContain("`00:01` The tide comes in twice a day.");
    expect(sheet.markdown).toContain("## 生词 / Vocabulary");
    expect(sheet.markdown).toContain("| tide |");
  });

  it("escapes pipes so the markdown table survives", () => {
    const sheet = studySheet([cue(0, 1000, "either | or. Another sentence here.")]);
    expect(sheet.markdown).toContain("\\|");
  });

  it("writes a csv with a header", () => {
    const sheet = studySheet(CUES);
    expect(sheet.csv.startsWith("word,count,context")).toBe(true);
    expect(sheet.csv).toContain("tide,2,");
  });

  it("survives a subtitle with nothing but numbers", () => {
    const sheet = studySheet([cue(0, 1000, "12345")]);
    expect(sheet.glossary).toEqual([]);
    expect(sheet.lines).toHaveLength(1);
  });
});
