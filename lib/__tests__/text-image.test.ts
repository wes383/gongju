import { describe, expect, it } from "vitest";
import { isCodedError } from "@/lib/errors";
import {
  MAX_AUTO_HEIGHT,
  MAX_LINE_HEIGHT,
  MAX_PADDING,
  MIN_FIT_FONT,
  MAX_PAGES,
  MAX_FONT,
  MIN_FONT,
  MIN_LINE_HEIGHT,
  MIN_PADDING,
  autoHeightCap,
  clampFont,
  clampLineHeight,
  clampPadding,
  layoutPages,
  layoutSingle,
  normalizeHex,
  parseBlocks,
  parseInline,
  relativeLuminance,
  solidTheme,
  styleFor,
  textTheme,
  usedHeight,
  wrapRuns,
  wrapText,
  type LayoutOptions,
  type Measure,
} from "../text-image";

/* Every character is 10px wide, which keeps the expected line breaks readable */
const measure: Measure = (text) => text.length * 10;
const narrow = (text: string) => text.length * 10;

const OPTIONS: LayoutOptions = {
  size: 20,
  lineHeight: 1.5,
  width: 1000,
  height: 100,
  fontFamily: "sans-serif",
};

describe("parseBlocks", () => {
  it("reads the line-leading markers and nothing else", () => {
    const blocks = parseBlocks("# 标题\n## 小标题\n> 引用\n- 条目\n普通正文\n**加粗**");

    expect(blocks.map((block) => block.kind)).toEqual([
      "h1",
      "h2",
      "quote",
      "bullet",
      "body",
      "body",
    ]);
    expect(blocks[0].text).toBe("标题");
    expect(blocks[3].text).toBe("• 条目");
    // Inline emphasis keeps its text and hands the styling to the runs
    expect(blocks[5].text).toBe("加粗");
    expect(blocks[5].runs).toEqual([
      { text: "加粗", bold: true, italic: false, code: false, strike: false },
    ]);
  });

  it("keeps three heading levels apart", () => {
    const blocks = parseBlocks("# 一级\n## 二级\n### 三级\n#### 四级");
    expect(blocks.map((block) => block.kind)).toEqual(["h1", "h2", "h3", "h3"]);
    expect(blocks[3].text).toBe("四级");
  });

  it("numbers ordered items and leaves the digits as typed", () => {
    const blocks = parseBlocks("1. 第一步\n2) 第二步\n2024 年是年份");
    expect(blocks.map((block) => block.kind)).toEqual(["ordered", "ordered", "body"]);
    expect(blocks[0].text).toBe("1. 第一步");
    expect(blocks[1].text).toBe("2) 第二步");
  });

  it("reads a line of dashes as a rule", () => {
    const blocks = parseBlocks("上文\n\n---\n\n下文");
    expect(blocks.map((block) => block.kind)).toEqual(["body", "space", "hr", "space", "body"]);
    // A dash that is part of the copy is not a rule
    expect(parseBlocks("-- 只是两个短横")[0].kind).toBe("body");
  });

  it("collapses runs of blank lines and drops them at the end", () => {
    const blocks = parseBlocks("a\n\n\n\nb\n\n\n");
    expect(blocks.map((block) => block.kind)).toEqual(["body", "space", "body"]);
  });

  it("returns nothing for whitespace-only input", () => {
    expect(parseBlocks("   \n\n  ")).toEqual([]);
  });
});

describe("parseInline", () => {
  it("splits bold, italic, code and strikethrough out of one line", () => {
    const runs = parseInline("普通**加粗**与*斜体*和`代码`以及~~删除~~");
    expect(runs.map((run) => [run.text, run.bold, run.italic, run.code, run.strike])).toEqual([
      ["普通", false, false, false, false],
      ["加粗", true, false, false, false],
      ["与", false, false, false, false],
      ["斜体", false, true, false, false],
      ["和", false, false, false, false],
      ["代码", false, false, true, false],
      ["以及", false, false, false, false],
      ["删除", false, false, false, true],
    ]);
  });

  it("leaves unmatched markers and snake_case alone", () => {
    expect(parseInline("3 * 4 = 12")).toEqual([
      { text: "3 * 4 = 12", bold: false, italic: false, code: false, strike: false },
    ]);
    expect(parseInline("user_name_here")[0].italic).toBe(false);
  });

  it("does not read markers inside a code span", () => {
    const runs = parseInline("`a ** b`");
    expect(runs).toEqual([{ text: "a ** b", bold: false, italic: false, code: true, strike: false }]);
  });
});

describe("wrapText", () => {
  it("breaks between CJK characters", () => {
    expect(wrapText("中文测试一下", 30, narrow)).toEqual(["中文测", "试一下"]);
  });

  it("never starts a line with closing punctuation", () => {
    const lines = wrapText("你好世界。再见", 20, narrow);
    expect(lines[0]).toBe("你好");
    // The full stop would have started line two, so it stays on line one
    expect(lines[1].startsWith("。")).toBe(false);
    expect(lines.join("")).toBe("你好世界。再见");
  });

  it("never ends a line with an opening bracket", () => {
    const lines = wrapText("说明（后续内容", 20, narrow);
    expect(lines[0].endsWith("（")).toBe(false);
    expect(lines.join("")).toBe("说明（后续内容");
  });

  it("keeps Latin words whole while they fit", () => {
    expect(wrapText("hello world again", 60, narrow)).toEqual(["hello", "world", "again"]);
  });

  it("splits a word wider than the line instead of overflowing", () => {
    const lines = wrapText("https://example.com/abcdef", 40, narrow);
    expect(lines.every((line) => narrow(line) <= 40)).toBe(true);
    expect(lines.join("")).toBe("https://example.com/abcdef");
  });

  it("splits an over-long URL that follows ordinary text", () => {
    // The URL is not the first token, so it lands on a line of its own and
    // used to be pushed out whole — the case that overflowed the canvas
    const url = "https://crd.ndl.go.jp/reference/entry/index.php?id=1000300187&page=ref_view";
    const lines = wrapText(`参考：${url}`, 200, narrow);

    expect(lines.every((line) => narrow(line) <= 200)).toBe(true);
    expect(lines.join("")).toBe(`参考：${url}`);
    expect(lines[0]).toBe("参考：");
  });

  it("splits an over-long token that follows a full line", () => {
    const token = "0123456789abcdefghijklmnopqrstuvwxyz";
    const lines = wrapText(`hello world ${token}`, 60, narrow);

    expect(lines.every((line) => narrow(line) <= 60)).toBe(true);
    expect(lines[0]).toBe("hello");
    // The word that was pushed off, then every slice of the long token
    expect(lines.slice(1).join("")).toBe(`world${token}`);
  });

  it("returns no lines for empty input", () => {
    expect(wrapText("   ", 100, narrow)).toEqual([]);
  });
});

describe("wrapRuns", () => {
  const font = () => "400 20px sans-serif";

  it("carries bold across a line break", () => {
    const lines = wrapRuns(parseInline("普通**加粗很长的一段**"), 60, font, narrow);
    const text = lines.map((line) => line.map((run) => run.text).join("")).join("");

    expect(lines.length).toBeGreaterThan(1);
    expect(text).toBe("普通加粗很长的一段");
    expect(lines.flat().some((run) => run.bold)).toBe(true);
  });

  it("never overflows the width, even mid-word", () => {
    const lines = wrapRuns(parseInline("`https://example.com/abcdef`"), 40, font, narrow);
    expect(lines.every((line) => narrow(line.map((run) => run.text).join("")) <= 40)).toBe(true);
    expect(lines.flat().every((run) => run.code)).toBe(true);
  });

  it("returns nothing for empty text or no room", () => {
    expect(wrapRuns([], 100, font, narrow)).toEqual([]);
    expect(wrapRuns(parseInline("文字"), 0, font, narrow)).toEqual([]);
  });
});

describe("styleFor", () => {
  it("scales headings off the body size", () => {
    const h1 = styleFor("h1", OPTIONS);
    expect(h1.size).toBe(34);
    expect(h1.lineHeight).toBe(41);
    expect(h1.keepWithNext).toBe(33);
    expect(styleFor("body", OPTIONS)).toMatchObject({ size: 20, lineHeight: 30, spaceAfter: 10 });
  });

  it("reserves an indent for quotes so the rule has room", () => {
    expect(styleFor("quote", OPTIONS).indent).toBeGreaterThan(0);
    expect(styleFor("space", OPTIONS).lineHeight).toBe(12);
  });
});

describe("layoutPages", () => {
  it("pages a flow that runs past the bottom", () => {
    const pages = layoutPages(parseBlocks("# 标题\n正文一\n正文二"), OPTIONS, measure);

    expect(pages).toHaveLength(2);
    expect(pages[0].map((line) => line.kind)).toEqual(["h1", "body"]);
    expect(pages[0][0].top).toBe(0);
    expect(pages[0][1].top).toBe(47);
    expect(pages[1][0]).toMatchObject({ text: "正文二", top: 0 });
  });

  it("pushes a heading to the next page rather than leaving it at the foot", () => {
    const pages = layoutPages(parseBlocks("正文一\n# 标题\n正文二"), OPTIONS, measure);

    expect(pages).toHaveLength(2);
    expect(pages[0].map((line) => line.kind)).toEqual(["body"]);
    expect(pages[1][0].kind).toBe("h1");
  });

  it("keeps every page inside the content height", () => {
    const source = Array.from({ length: 12 }, (_, index) => `第 ${index} 段`).join("\n");
    const pages = layoutPages(parseBlocks(source), OPTIONS, measure);

    expect(pages.length).toBeGreaterThan(1);
    pages.forEach((page) => expect(usedHeight(page)).toBeLessThanOrEqual(OPTIONS.height));
    expect(pages.flat()).toHaveLength(12);
  });

  it("adds a gap for a blank line but not at the top of a page", () => {
    const pages = layoutPages(parseBlocks("a\n\nb"), OPTIONS, measure);
    // Paragraph spacing, then the blank line's own gap on top of it
    expect(pages[0][1].top).toBe(pages[0][0].top + 30 + 10 + 12);
  });

  it("marks quote lines for the rule and indents them", () => {
    const pages = layoutPages(parseBlocks("> 一句引用"), OPTIONS, measure);
    expect(pages[0][0]).toMatchObject({ kind: "quote", rule: true, indent: 17, top: 0 });
  });

  it("hugs the text at both ends of a wrapped quote so the bar stays one piece", () => {
    const pages = layoutPages(parseBlocks(`> ${"引".repeat(200)}`), OPTIONS, measure);
    const lines = pages[0];

    expect(lines.length).toBe(3);
    expect(lines[0]).toMatchObject({ ruleFromText: true, ruleToText: false });
    expect(lines[1]).toMatchObject({ ruleFromText: false, ruleToText: false });
    expect(lines[2]).toMatchObject({ ruleFromText: false, ruleToText: true });
  });

  it("keeps the rule off body lines", () => {
    const pages = layoutPages(parseBlocks("普通正文"), OPTIONS, measure);
    expect(pages[0][0]).toMatchObject({ rule: false, ruleFromText: false, ruleToText: false });
  });

  it("gives a rule its own empty line box", () => {
    const pages = layoutPages(parseBlocks("a\n---\nb"), { ...OPTIONS, height: 400 }, measure);
    expect(pages[0].map((line) => line.kind)).toEqual(["body", "hr", "body"]);
    expect(pages[0][1].runs).toEqual([]);
    expect(pages[0][1].text).toBe("");
  });

  it("lays ordered items out like bullets", () => {
    const pages = layoutPages(parseBlocks("1. 第一步"), OPTIONS, measure);
    expect(pages[0][0]).toMatchObject({ kind: "ordered", text: "1. 第一步", indent: 0 });
  });

  it("returns one empty page for empty input", () => {
    const pages = layoutPages([], OPTIONS, measure);
    expect(pages).toEqual([[]]);
  });

  it("refuses a document that would need an endless number of pages", () => {
    const source = Array.from({ length: MAX_PAGES * 4 }, (_, index) => `行 ${index}`).join("\n");
    try {
      layoutPages(parseBlocks(source), OPTIONS, measure);
      throw new Error("expected a coded error");
    } catch (error) {
      expect(isCodedError(error)).toBe(true);
      if (isCodedError(error)) expect(error.code).toBe("textimg.long");
    }
  });
});

describe("textTheme", () => {
  it("falls back to the first palette for an unknown id", () => {
    expect(textTheme("paper").id).toBe("paper");
    expect(textTheme("nope" as "paper").id).toBe("paper");
  });
});

describe("reference lists", () => {
  /** The report that started this: three numbered entries, each ending in a long URL */
  const SOURCE = [
    "1. Kitakyushu City Library, reference record on the 1952 Japanese release of Gone with the Wind, NDL Collaborative Reference Database. https://crd.ndl.go.jp/reference/entry/index.php?id=1000300187&page=ref_view",
    "2. Shueisha Online, interview with Natsuko Toda on Gone with the Wind, 10 Sep 2022. https://shueisha.online/articles/-/51060",
    "3. Michael Schaller, UA Prof. Michael Schaller: Gone with the Wind viewed in 1939 Brooklyn, Berlin & Tokyo, Arizona Daily Star, 2019. https://tucson.com/opinion/local/ua-prof-michael-schaller-gone-with-the-wind-viewed-in-1939-brooklyn-berlin-tokyo/article_f6dd3a0d-8bc6-54c7-bbe6-3fd53014e4aa.html",
  ].join("\n");

  it("wraps every line inside the content width", () => {
    const options: LayoutOptions = { ...OPTIONS, size: 32, width: 888, height: 20000 };
    const result = layoutSingle(parseBlocks(SOURCE, "plain"), options, measure, 20000);

    expect(result.lines.length).toBeGreaterThan(3);
    for (const line of result.lines) {
      expect(narrow(line.text)).toBeLessThanOrEqual(options.width - line.indent);
    }
    // The URLs survive the split intact
    const joined = result.lines.map((line) => line.text).join("");
    expect(joined).toContain("page=ref_view");
    expect(joined).toContain("article_f6dd3a0d-8bc6-54c7-bbe6-3fd53014e4aa.html");
  });
});

describe("layoutSingle", () => {
  it("keeps a short document whole at the requested size", () => {
    const result = layoutSingle(parseBlocks("第一段\n第二段"), OPTIONS, measure, 1000);

    expect(result.shrunk).toBe(false);
    expect(result.size).toBe(20);
    expect(result.lines).toHaveLength(2);
    expect(result.height).toBe(usedHeight(result.lines));
  });

  it("scales the type down until everything fits a tight cap", () => {
    const source = Array.from({ length: 10 }, (_, index) => `第 ${index} 段`).join("\n");
    const result = layoutSingle(parseBlocks(source), OPTIONS, measure, 300);

    expect(result.shrunk).toBe(true);
    expect(result.size).toBeLessThan(20);
    expect(result.size).toBeGreaterThanOrEqual(MIN_FIT_FONT);
    expect(result.height).toBeLessThanOrEqual(300);
    // Nothing is dropped on the way: one line per paragraph, all ten of them
    expect(result.lines).toHaveLength(10);
  });

  it("grows past the frame instead of paging when height is free", () => {
    const source = Array.from({ length: 10 }, (_, index) => `第 ${index} 段`).join("\n");
    const result = layoutSingle(parseBlocks(source), OPTIONS, measure, 100000);

    expect(result.shrunk).toBe(false);
    expect(result.lines).toHaveLength(10);
    expect(result.height).toBeGreaterThan(OPTIONS.height);
  });

  it("reports overflow rather than silently clipping", () => {
    const source = Array.from({ length: 10 }, (_, index) => `第 ${index} 段`).join("\n");
    try {
      layoutSingle(parseBlocks(source), OPTIONS, measure, 20);
      throw new Error("expected a coded error");
    } catch (error) {
      expect(isCodedError(error)).toBe(true);
      if (isCodedError(error)) expect(error.code).toBe("textimg.overflow");
    }
  });
});

describe("autoHeightCap", () => {
  it("stays inside the canvas area limit", () => {
    expect(autoHeightCap(1080)).toBe(MAX_AUTO_HEIGHT);
    expect(autoHeightCap(3000)).toBe(8000);
    expect(autoHeightCap(4000)).toBe(6000);
  });

  it("never grows past the long edge ceiling", () => {
    // Area alone would allow a 120000px strip at this width
    expect(autoHeightCap(200)).toBe(MAX_AUTO_HEIGHT);
  });
});

describe("parseBlocks in plain mode", () => {
  it("keeps markers that belong to the content", () => {
    const blocks = parseBlocks("# not a heading\n> not a quote\n- not a bullet", "plain");

    expect(blocks.map((block) => block.kind)).toEqual(["body", "body", "body"]);
    expect(blocks[0].text).toBe("# not a heading");
    expect(blocks[2].text).toBe("- not a bullet");
  });

  it("still turns a blank line into a gap", () => {
    const blocks = parseBlocks("a\n\nb", "plain");
    expect(blocks.map((block) => block.kind)).toEqual(["body", "space", "body"]);
  });

  it("defaults to smart parsing", () => {
    expect(parseBlocks("# heading")[0].kind).toBe("h1");
  });
});

describe("normalizeHex", () => {
  it("expands shorthand and lowercases", () => {
    expect(normalizeHex("#ABC")).toBe("#aabbcc");
    expect(normalizeHex("0x1A2B3C")).toBe("#1a2b3c");
    expect(normalizeHex("  #FFF  ")).toBe("#ffffff");
  });

  it("rejects anything that is not a colour", () => {
    expect(normalizeHex("red")).toBeNull();
    expect(normalizeHex("#abcd")).toBeNull();
    expect(normalizeHex("")).toBeNull();
  });
});

describe("solidTheme", () => {
  it("puts light type on a dark fill and dark type on a light one", () => {
    expect(solidTheme("#111827").text).toBe("#f6f7f9");
    expect(solidTheme("#ffffff").text).toBe("#14161b");
    expect(solidTheme("#134e4a").text).toBe("#f6f7f9");
    expect(solidTheme("#fef3c7").text).toBe("#14161b");
  });

  it("marks the background flat so the painter skips the gradient", () => {
    const theme = solidTheme("#0f766e");
    expect(theme.from).toBe("#0f766e");
    expect(theme.to).toBe(theme.from);
  });

  it("falls back to white for an unusable value", () => {
    expect(solidTheme("nope").from).toBe("#ffffff");
  });
});

describe("relativeLuminance", () => {
  it("spans black to white", () => {
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 5);
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 5);
  });

  it("keeps mid grey on the dark-text side of the threshold", () => {
    expect(relativeLuminance("#808080")).toBeGreaterThan(0.179);
  });
});

describe("clampFont", () => {
  it("lets poster-sized type through", () => {
    expect(clampFont(600)).toBe(600);
    expect(clampFont(MAX_FONT)).toBe(MAX_FONT);
  });

  it("still refuses sizes a canvas cannot draw", () => {
    expect(clampFont(5000)).toBe(MAX_FONT);
    expect(clampFont(1)).toBe(MIN_FONT);
    expect(clampFont(Number.NaN)).toBe(32);
  });
});

describe("clampLineHeight", () => {
  it("keeps two decimals of a custom leading", () => {
    expect(clampLineHeight(1.65)).toBe(1.65);
    expect(clampLineHeight(1.234)).toBe(1.23);
  });

  it("stays between one and three times the type size", () => {
    expect(clampLineHeight(0.4)).toBe(MIN_LINE_HEIGHT);
    expect(clampLineHeight(9)).toBe(MAX_LINE_HEIGHT);
    // An empty or unparsable field falls back to the standard leading
    expect(clampLineHeight(Number.NaN)).toBe(1.5);
  });
});

describe("clampPadding", () => {
  it("rounds a custom margin to whole pixels", () => {
    expect(clampPadding(132.6)).toBe(133);
  });

  it("stops at the edges a layout can still use", () => {
    expect(clampPadding(1200)).toBe(MAX_PADDING);
    expect(clampPadding(-20)).toBe(MIN_PADDING);
    expect(clampPadding(Number.NaN)).toBe(96);
  });
});
