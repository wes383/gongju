import { describe, expect, it } from "vitest";
import { buildAnkiSheet, parseTermList } from "@/lib/anki";
import { isCodedError } from "@/lib/errors";

function codeOf(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return isCodedError(error) ? error.code : "uncoded";
  }
  return "no-error";
}

describe("parseTermList", () => {
  it("reads tab-separated rows", () => {
    expect(parseTermList("hello\thello\nworld\tworld")).toEqual([
      ["hello", "hello"],
      ["world", "world"],
    ]);
  });

  it("sniffs commas and semicolons", () => {
    expect(parseTermList("hello, hello")).toEqual([["hello", "hello"]]);
    expect(parseTermList("hello; hello; noun")).toEqual([["hello", "hello", "noun"]]);
  });

  it("skips blank lines", () => {
    expect(parseTermList("a\tb\n\n\nc\td")).toHaveLength(2);
  });
});

describe("buildAnkiSheet", () => {
  const input = "hello\thello\nworld\tthe world";

  it("writes the directives Anki reads", () => {
    const sheet = buildAnkiSheet(input, { deck: "English", notetype: "Basic" });
    expect(sheet.text.split("\n").slice(0, 4)).toEqual([
      "#separator:tab",
      "#html:true",
      "#deck:English",
      "#notetype:Basic",
    ]);
    expect(sheet.cards).toBe(2);
    expect(sheet.columns).toBe(2);
  });

  it("marks the tag column and leaves it out of the card fields", () => {
    const sheet = buildAnkiSheet("hello\thello\ngreeting\nworld\tthe world\tnoun", {
      tagsColumn: 2,
      separator: "comma",
    });
    expect(sheet.text).toContain("#separator:comma");
    expect(sheet.text).toContain("#tags column:3");
    expect(sheet.columns).toBe(2);
    expect(sheet.text).toContain("world,the world,noun");
  });

  it("turns comma-separated tags into space-separated ones", () => {
    const sheet = buildAnkiSheet("hello\thello\tnoun, greeting", { tagsColumn: 2 });
    expect(sheet.text).toContain("noun, greeting".replace(", ", " "));
  });

  it("escapes markup and turns line breaks into <br>", () => {
    const sheet = buildAnkiSheet('a < b\t"one\ntwo"');
    expect(sheet.text).toContain("a &lt; b");
    expect(sheet.text).toContain("one<br>two");
    expect(sheet.text).not.toContain("&amp;lt;");
  });

  it("drops duplicate rows when asked", () => {
    const sheet = buildAnkiSheet("hello\thello\nhello\thello\nworld\tthe world", {
      dedupe: true,
    });
    expect(sheet.cards).toBe(2);
    expect(sheet.skipped).toBe(1);
  });

  it("keeps duplicates when asked", () => {
    const sheet = buildAnkiSheet("hello\thello\nhello\thello", { dedupe: false });
    expect(sheet.cards).toBe(2);
  });

  it("quotes a field that contains the delimiter", () => {
    const sheet = buildAnkiSheet("a\tone, two, three", { separator: "comma" });
    expect(sheet.text).toContain('"one, two, three"');
  });

  it("rejects an empty list", () => {
    expect(codeOf(() => buildAnkiSheet("   "))).toBe("anki.empty");
  });

  it("rejects a single-column list", () => {
    expect(codeOf(() => buildAnkiSheet("hello\nworld"))).toBe("anki.columns");
  });
});
