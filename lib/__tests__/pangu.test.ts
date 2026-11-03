import { describe, expect, it } from "vitest";
import { addSpacing, pangu, PANGU_SAMPLE } from "@/lib/pangu";

describe("addSpacing", () => {
  it("puts a space between CJK and Latin text", () => {
    expect(addSpacing("在2024年用Next.js开发").text).toBe("在 2024 年用 Next.js 开发");
    expect(addSpacing("使用React组件").text).toBe("使用 React 组件");
  });

  it("does not double up existing spaces", () => {
    expect(addSpacing("使用 React 组件").text).toBe("使用 React 组件");
  });

  it("leaves URLs and e-mail addresses intact", () => {
    const input = "访问https://example.com/a?b=1或发邮件到dev@example.com";
    expect(addSpacing(input).text).toBe(input);
  });

  it("counts the inserted spaces", () => {
    expect(addSpacing("用Vue写页面").added).toBe(2);
  });
});

describe("pangu", () => {
  it("converts full-width letters and digits", () => {
    const result = pangu("ＡＢＣ１２３", { ...{ spacing: false, punctuation: false, quotes: false, fullwidth: true, halfwidthPunct: false, trim: false } });
    expect(result.text).toBe("ABC123");
  });

  it("converts punctuation next to Chinese when asked", () => {
    const result = pangu("你好,世界.", {
      spacing: false,
      punctuation: true,
      quotes: false,
      fullwidth: false,
      halfwidthPunct: false,
      trim: false,
    });
    expect(result.text).toBe("你好，世界。");
  });

  it("curls straight quotes in Chinese text", () => {
    const result = pangu('他说"没问题"', {
      spacing: false,
      punctuation: false,
      quotes: true,
      fullwidth: false,
      halfwidthPunct: false,
      trim: false,
    });
    expect(result.text).toBe("他说“没问题”");
  });

  it("keeps the decimal point inside numbers", () => {
    const result = pangu("版本 1.5 发布", {
      spacing: true,
      punctuation: true,
      quotes: false,
      fullwidth: false,
      halfwidthPunct: false,
      trim: false,
    });
    expect(result.text).toBe("版本 1.5 发布");
  });

  it("trims line ends and collapses blank lines", () => {
    const result = pangu("第一行   \n\n\n\n第二行", {
      spacing: false,
      punctuation: false,
      quotes: false,
      fullwidth: false,
      halfwidthPunct: false,
      trim: true,
    });
    expect(result.text).toBe("第一行\n\n第二行");
  });

  it("handles the built-in sample without breaking URLs", () => {
    const result = pangu(PANGU_SAMPLE);
    expect(result.text).toContain("https://example.com/docs?v=2");
    expect(result.text).toContain("2024 年");
  });
});
