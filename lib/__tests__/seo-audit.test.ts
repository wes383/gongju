import { describe, expect, it } from "vitest";
import { auditHtml, parseAttrs, scanTags, wordCount } from "@/lib/seo-audit";

const GOOD = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>在线工具：编码、格式化与转换</title>
    <meta name="description" content="纯浏览器端运行的开发者工具箱，支持编码解码、格式化、转换与加密，处理过程不上传任何数据，离线也能用。" />
    <link rel="canonical" href="https://example.com/" />
    <meta property="og:title" content="在线工具" />
    <meta property="og:description" content="开发者工具箱" />
    <meta property="og:image" content="https://example.com/og.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <script type="application/ld+json">{"@type":"WebSite"}</script>
  </head>
  <body>
    <h1>在线工具</h1>
    <h2>编码</h2>
    <img src="a.png" alt="示意图" />
    <a href="https://example.com/x" target="_blank" rel="noopener">外链</a>
    <label for="q">搜索</label>
    <input id="q" />
  </body>
</html>`;

const ids = (html: string) => auditHtml(html).issues.map((issue) => issue.id);

describe("html scan", () => {
  it("reads attributes with and without values", () => {
    expect(parseAttrs(' href="/a" data-flag disabled type=\'text\'')).toEqual({
      href: "/a",
      "data-flag": "",
      disabled: "",
      type: "text",
    });
  });

  it("lists tags in document order and ignores comments", () => {
    const tags = scanTags("<!-- <img> --><div><span id='a'></span></div>");
    expect(tags.map((tag) => tag.name)).toEqual(["div", "span"]);
  });

  it("counts CJK characters and Latin words separately", () => {
    expect(wordCount("<p>你好 world</p>")).toBe(3);
    expect(wordCount("<script>var a=1</script>")).toBe(0);
  });
});

describe("audit report", () => {
  it("passes a page that has everything", () => {
    const report = auditHtml(GOOD);
    expect(report.issues).toEqual([]);
    expect(report.counts).toEqual({ error: 0, warn: 0, info: 0 });
    expect(report.stats.h1).toBe(1);
    expect(report.stats.images).toBe(1);
  });

  it("reports the blocking problems on a bare fragment", () => {
    const found = ids("<h1>Hi</h1>");
    expect(found).toContain("htmlLang");
    expect(found).toContain("title.missing");
    expect(found).toContain("description.missing");
    expect(found).toContain("canonical.missing");
    expect(found).toContain("og.missing");
    expect(found).not.toContain("h1.missing");
  });

  it("flags titles and descriptions outside the usual length", () => {
    expect(ids("<title>短</title>")).toContain("title.short");
    expect(ids(`<title>${"x".repeat(70)}</title>`)).toContain("title.long");
    expect(ids('<meta name="description" content="太短">')).toContain("description.short");
  });

  it("counts images without alt and links that forget noopener", () => {
    const report = auditHtml('<img src="a"><img src="b" alt=""><a href="/x" target="_blank">x</a>');
    const alt = report.issues.find((issue) => issue.id === "img.alt");
    expect(alt?.detail).toBe("1");
    expect(report.issues.find((issue) => issue.id === "link.blank")?.detail).toBe("1");
  });

  it("catches heading jumps, duplicate ids and stray tabindex", () => {
    const found = ids(
      '<h1>a</h1><h3>b</h3><div id="x"></div><div id="x"></div><span tabindex="3"></span><iframe></iframe>'
    );
    expect(found).toContain("heading.skip");
    expect(found).toContain("a11y.duplicateId");
    expect(found).toContain("a11y.tabindex");
    expect(found).toContain("a11y.iframeTitle");
  });

  it("marks an input without label, id or aria-label", () => {
    const report = auditHtml('<input type="text">');
    expect(report.issues.find((issue) => issue.id === "a11y.inputLabel")?.detail).toBe("1");
  });

  it("surfaces noindex and a missing structured-data block as info", () => {
    const report = auditHtml('<meta name="robots" content="noindex, nofollow">');
    expect(report.issues.find((issue) => issue.id === "robots.noindex")?.level).toBe("info");
    expect(report.issues.find((issue) => issue.id === "jsonld.missing")?.level).toBe("info");
  });

  it("sorts errors before warnings and info", () => {
    const levels = auditHtml("<h1>Hi</h1>").issues.map((issue) => issue.level);
    const rank = { error: 0, warn: 1, info: 2 } as const;
    for (let i = 1; i < levels.length; i += 1) {
      expect(rank[levels[i]]).toBeGreaterThanOrEqual(rank[levels[i - 1]]);
    }
  });
});
