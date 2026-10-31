import { describe, expect, it } from "vitest";
import { cleanText, convertCase, diffLines, splitWords, textStats } from "@/lib/text";

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
