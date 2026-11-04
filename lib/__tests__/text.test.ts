import { describe, expect, it } from "vitest";
import { cleanText, convertCase, diffLines, diffWords, splitWords, textStats } from "@/lib/text";

describe("textStats", () => {
  it("counts characters, words, lines and bytes", () => {
    const stats = textStats("Hello world\nsecond line");
    expect(stats.lines).toBe(2);
    expect(stats.words).toBe(4);
    expect(stats.chars).toBe(23);
    expect(stats.bytes).toBe(23);
  });

  it("counts CJK characters separately from latin words", () => {
    const stats = textStats("中文 abc");
    expect(stats.cjk).toBe(2);
    expect(stats.words).toBe(3); // two CJK chars count as words plus "abc"
  });

  it("returns zero lines for empty input", () => {
    expect(textStats("").lines).toBe(0);
  });
});

describe("splitWords", () => {
  it("splits camelCase and separators", () => {
    expect(splitWords("helloWorld-foo_bar")).toEqual(["hello", "world", "foo", "bar"]);
  });
});

describe("convertCase", () => {
  it("converts between naming styles", () => {
    expect(convertCase("hello world", "camel")).toBe("helloWorld");
    expect(convertCase("hello world", "pascal")).toBe("HelloWorld");
    expect(convertCase("hello world", "snake")).toBe("hello_world");
    expect(convertCase("hello world", "kebab")).toBe("hello-world");
    expect(convertCase("hello world", "constant")).toBe("HELLO_WORLD");
  });

  it("keeps empty input empty", () => {
    expect(convertCase("", "camel")).toBe("");
  });
});

describe("cleanText", () => {
  it("trims, collapses and drops duplicates", () => {
    const input = "  a  \n\n  a  \n b ";
    const output = cleanText(input, {
      trimLines: true,
      collapseSpaces: true,
      removeEmptyLines: true,
      removeDuplicateLines: true,
    });
    expect(output).toBe("a\nb");
  });
});

describe("diffLines", () => {
  it("marks added and removed lines", () => {
    const rows = diffLines("a\nb\nc", "a\nB\nc\nd");
    const kinds = rows.map((row) => row.kind);
    expect(kinds).toContain("same");
    expect(kinds).toContain("added");
    expect(kinds).toContain("removed");
  });

  it("returns only unchanged rows for identical input", () => {
    const rows = diffLines("a\nb", "a\nb");
    expect(rows.every((row) => row.kind === "same")).toBe(true);
  });

  it("rejects input beyond the line limit", () => {
    const huge = Array.from({ length: 5000 }, (_, i) => `line ${i}`).join("\n");
    expect(() => diffLines(huge, huge)).toThrow();
  });
});

describe("diffWords", () => {
  it("keeps a single edited word instead of flagging the whole line", () => {
    const parts = diffWords("Summarise the report briefly.", "Summarise the report carefully.");

    const removed = parts.filter((part) => part.kind === "removed").map((part) => part.text);
    const added = parts.filter((part) => part.kind === "added").map((part) => part.text);
    expect(removed).toEqual(["briefly"]);
    expect(added).toEqual(["carefully"]);
  });

  it("diffs Chinese character by character", () => {
    const parts = diffWords("把这段文字改成摘要", "把这段文字改成要点");
    expect(parts.some((part) => part.kind === "removed" && part.text === "摘")).toBe(true);
    expect(parts.some((part) => part.kind === "added" && part.text === "点")).toBe(true);
  });

  it("merges neighbouring changes into one run", () => {
    const parts = diffWords("one two three", "one two four five");
    expect(parts.filter((part) => part.kind !== "same")).toEqual([
      { kind: "removed", text: "three" },
      { kind: "added", text: "four five" },
    ]);
  });

  it("reports a pure addition when one side is empty", () => {
    const parts = diffWords("", "hello world");
    expect(parts).toEqual([{ kind: "added", text: "hello world" }]);
  });

  it("rejects input beyond the word limit", () => {
    const huge = "word ".repeat(3000);
    expect(() => diffWords(huge, huge)).toThrow();
  });
});
