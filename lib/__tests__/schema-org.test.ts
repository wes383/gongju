import { describe, expect, it } from "vitest";
import {
  availabilityUrl,
  buildSchema,
  isAbsoluteUrl,
  isIsoDate,
  parseBreadcrumb,
  parseFaq,
  schemaJson,
  schemaType,
  validateSchema,
} from "@/lib/schema-org";

describe("structured data building", () => {
  it("wraps an article with author, publisher and canonical page", () => {
    const schema = buildSchema("article", {
      headline: "Token 计数",
      description: "估算与精确计数",
      url: "https://example.com/a",
      author: "张三",
      publisher: "GongJu",
      datePublished: "2026-11-04",
    });

    expect(schema["@context"]).toBe("https://schema.org");
    expect(schema["@type"]).toBe("Article");
    expect(schema.author).toEqual({ "@type": "Person", name: "张三" });
    expect(schema.publisher).toEqual({ "@type": "Organization", name: "GongJu" });
    expect(schema.mainEntityOfPage).toEqual({ "@type": "WebPage", "@id": "https://example.com/a" });
  });

  it("drops empty fields instead of emitting blank strings", () => {
    const schema = buildSchema("article", { headline: "Hi", description: "   " });
    expect(schema).not.toHaveProperty("description");
    expect(schema).not.toHaveProperty("author");
  });

  it("maps a product to an offer with a schema.org availability URL", () => {
    const schema = buildSchema("product", {
      name: "键盘",
      price: "199",
      currency: "cny",
      availability: "out",
      url: "https://example.com/p",
    });
    expect(schema.offers).toEqual({
      "@type": "Offer",
      price: "199",
      priceCurrency: "CNY",
      availability: "https://schema.org/OutOfStock",
      url: "https://example.com/p",
    });
  });

  it("builds an FAQ page from blank-line separated pairs", () => {
    const schema = buildSchema("faq", {
      faq: "会不会上传数据？\n不会，全在浏览器里。\n\n支持哪些浏览器？\n主流浏览器都行。",
    });
    const items = schema.mainEntity as Record<string, unknown>[];
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({
      "@type": "Question",
      name: "会不会上传数据？",
      acceptedAnswer: { "@type": "Answer", text: "不会，全在浏览器里。" },
    });
  });

  it("numbers breadcrumb levels from one", () => {
    const schema = buildSchema("breadcrumb", {
      breadcrumb: "首页 | https://example.com\n文档 | https://example.com/docs",
    });
    const items = schema.itemListElement as Record<string, unknown>[];
    expect(items.map((item) => item.position)).toEqual([1, 2]);
    expect(items[1].item).toBe("https://example.com/docs");
  });

  it("splits organisation profiles on new lines", () => {
    const schema = buildSchema("organization", {
      name: "GongJu",
      sameAs: "https://x.com/a\nhttps://github.com/b",
    });
    expect(schema.sameAs).toEqual(["https://x.com/a", "https://github.com/b"]);
  });

  it("serialises to valid, indented JSON", () => {
    const json = schemaJson("organization", { name: "GongJu" });
    expect(json).toContain('\n  "@context"');
    expect(JSON.parse(json)["@type"]).toBe("Organization");
  });
});

describe("structured data validation", () => {
  it("reports missing required fields", () => {
    expect(validateSchema("article", {})).toEqual([{ key: "headline", kind: "required" }]);
  });

  it("rejects relative URLs, bad dates and non-numeric prices", () => {
    const issues = validateSchema("article", {
      headline: "x",
      url: "/a",
      datePublished: "2026-13-40",
    });
    expect(issues).toEqual([
      { key: "url", kind: "url" },
      { key: "datePublished", kind: "date" },
    ]);
    expect(validateSchema("product", { name: "a", price: "free" })).toEqual([
      { key: "price", kind: "number" },
    ]);
  });

  it("flags FAQ questions without an answer", () => {
    expect(validateSchema("faq", { faq: "只有问题\n\n第二问\n第二答" })).toEqual([
      { key: "faq", kind: "pair" },
    ]);
  });

  it("accepts absolute URLs and plain ISO dates", () => {
    expect(isAbsoluteUrl("https://example.com")).toBe(true);
    expect(isAbsoluteUrl("ftp://example.com")).toBe(false);
    expect(isIsoDate("2026-11-04")).toBe(true);
    expect(isIsoDate("2026-02-31")).toBe(false);
  });

  it("falls back to InStock for unknown availability values", () => {
    expect(availabilityUrl("whatever")).toBe("https://schema.org/InStock");
    expect(availabilityUrl("Pre Order")).toBe("https://schema.org/PreOrder");
  });

  it("falls back to the first type for an unknown id", () => {
    expect(schemaType("nope" as never).id).toBe("article");
  });
});

describe("list parsing", () => {
  it("keeps multi-line answers with their question", () => {
    const pairs = parseFaq("问一\n答一第一行\n答一第二行\n\n问二\n答二");
    expect(pairs).toEqual([
      { question: "问一", answer: "答一第一行 答一第二行" },
      { question: "问二", answer: "答二" },
    ]);
  });

  it("accepts full-width pipes and tabs in breadcrumbs", () => {
    expect(parseBreadcrumb("首页｜https://a.com\n文档\thttps://a.com/d")).toEqual([
      { name: "首页", url: "https://a.com" },
      { name: "文档", url: "https://a.com/d" },
    ]);
  });
});
