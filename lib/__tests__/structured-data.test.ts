import { describe, expect, it } from "vitest";
import { serializeJsonLd, siteJsonLd, toolJsonLd, websiteId } from "@/lib/structured-data";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { allTools, getTool } from "@/lib/tools";

const base64 = getTool("base64")!;

function graph(node: Record<string, unknown>): Record<string, unknown>[] {
  return node["@graph"] as Record<string, unknown>[];
}

describe("site graph", () => {
  it("declares the website and its publisher per locale", () => {
    for (const locale of ["en", "zh"] as const) {
      const node = siteJsonLd(locale);
      expect(node["@context"]).toBe("https://schema.org");
      const [org, site] = graph(node);
      expect(org["@type"]).toBe("Organization");
      expect(org["@id"]).toBe(`${SITE_URL}/#organization`);
      expect(site["@type"]).toBe("WebSite");
      expect(site["@id"]).toBe(websiteId(locale));
      expect(site.name).toBe(SITE_NAME);
      expect(site.inLanguage).toBe(locale === "en" ? "en" : "zh-CN");
      expect(site.publisher).toEqual({ "@id": `${SITE_URL}/#organization` });
    }
  });

  it("keeps the two locale websites distinct but the publisher shared", () => {
    expect(websiteId("en")).toBe(`${SITE_URL}/#website`);
    expect(websiteId("zh")).toBe(`${SITE_URL}/zh#website`);
  });
});

describe("tool graph", () => {
  it("describes the tool as a free browser application in the page locale", () => {
    const [app] = graph(toolJsonLd(base64, "en"));
    expect(app["@type"]).toBe("WebApplication");
    expect(app.name).toBe(base64.name.en);
    expect(app.alternateName).toBe(base64.name.zh);
    expect(app.url).toBe(`${SITE_URL}/tools/base64`);
    expect(app.applicationCategory).toBe("UtilitiesApplication");
    expect(app.isAccessibleForFree).toBe(true);
    expect(app.offers).toMatchObject({ "@type": "Offer", price: "0", priceCurrency: "CNY" });
    expect(app.isPartOf).toEqual({ "@id": websiteId("en") });

    const [zhApp] = graph(toolJsonLd(base64, "zh"));
    expect(zhApp.name).toBe(base64.name.zh);
    expect(zhApp.url).toBe(`${SITE_URL}/zh/tools/base64`);
    expect(zhApp.isPartOf).toEqual({ "@id": websiteId("zh") });
  });

  it("links the tool back to the locale home with a breadcrumb", () => {
    const [, crumbs] = graph(toolJsonLd(base64, "zh"));
    expect(crumbs["@type"]).toBe("BreadcrumbList");
    const items = crumbs.itemListElement as Record<string, unknown>[];
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ position: 1, item: `${SITE_URL}/zh` });
    expect(items[1]).toMatchObject({ position: 2, name: base64.name.zh });
  });

  it("gives every tool a distinct @id", () => {
    const ids = new Set<string>();
    for (const tool of [base64, getTool("json-format")!, getTool("og-image")!]) {
      const [app] = graph(toolJsonLd(tool, "en"));
      ids.add(String(app["@id"]));
    }
    expect(ids.size).toBe(3);
  });

  it("emits a FAQPage node mirroring the on-page questions in each locale", () => {
    for (const locale of ["en", "zh"] as const) {
      const faq = graph(toolJsonLd(base64, locale)).find((n) => n["@type"] === "FAQPage");
      expect(faq).toBeDefined();
      expect(faq!.inLanguage).toBe(locale === "en" ? "en" : "zh-CN");
      const questions = faq!.mainEntity as Record<string, unknown>[];
      expect(questions).toHaveLength(base64.faq!.length);
      expect(questions[0]).toMatchObject({
        "@type": "Question",
        name: base64.faq![0].q[locale],
        acceptedAnswer: { "@type": "Answer", text: base64.faq![0].a[locale] },
      });
    }
  });

  it("omits FAQPage for tools without FAQs", () => {
    const tool = allTools.find((t) => !t.faq)!;
    expect(graph(toolJsonLd(tool, "en")).some((n) => n["@type"] === "FAQPage")).toBe(false);
  });
});

describe("faq content", () => {
  it("is bilingual and non-empty wherever present", () => {
    for (const tool of allTools) {
      for (const item of tool.faq ?? []) {
        expect(item.q.zh, tool.slug).not.toBe("");
        expect(item.q.en, tool.slug).not.toBe("");
        expect(item.a.zh, tool.slug).not.toBe("");
        expect(item.a.en, tool.slug).not.toBe("");
      }
    }
  });
});

describe("serialization", () => {
  it("escapes the characters that could close the script tag", () => {
    const out = serializeJsonLd({ name: "</script><img src=x onerror=alert(1)>", and: "a&b" });
    expect(out).not.toContain("</script>");
    expect(out).not.toContain("<img");
    expect(out).toContain("\\u003c");
    expect(out).toContain("\\u0026");
    // Escapes are JSON-legal, so the payload still parses back to the original
    expect(JSON.parse(out)).toEqual({
      name: "</script><img src=x onerror=alert(1)>",
      and: "a&b",
    });
  });
});