import { describe, expect, it } from "vitest";
import { serializeJsonLd, siteJsonLd, toolJsonLd } from "@/lib/structured-data";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { allTools, getTool } from "@/lib/tools";

const base64 = getTool("base64")!;

function graph(node: Record<string, unknown>): Record<string, unknown>[] {
  return node["@graph"] as Record<string, unknown>[];
}

describe("site graph", () => {
  it("declares the website and its publisher", () => {
    const node = siteJsonLd();
    expect(node["@context"]).toBe("https://schema.org");
    const [org, site] = graph(node);
    expect(org["@type"]).toBe("Organization");
    expect(org["@id"]).toBe(`${SITE_URL}/#organization`);
    expect(site["@type"]).toBe("WebSite");
    expect(site.url).toBe(SITE_URL);
    expect(site.name).toBe(SITE_NAME);
    expect(site.inLanguage).toBe("zh-CN");
    expect(site.publisher).toEqual({ "@id": `${SITE_URL}/#organization` });
  });
});

describe("tool graph", () => {
  it("describes the tool as a free browser application", () => {
    const [app] = graph(toolJsonLd(base64));
    expect(app["@type"]).toBe("WebApplication");
    expect(app.name).toBe(base64.name.zh);
    expect(app.alternateName).toBe(base64.name.en);
    expect(app.url).toBe(`${SITE_URL}/tools/base64`);
    expect(app.applicationCategory).toBe("UtilitiesApplication");
    expect(app.isAccessibleForFree).toBe(true);
    expect(app.offers).toMatchObject({ "@type": "Offer", price: "0", priceCurrency: "CNY" });
    expect(app.isPartOf).toEqual({ "@id": `${SITE_URL}/#website` });
  });

  it("links the tool back to the home page with a breadcrumb", () => {
    const [, crumbs] = graph(toolJsonLd(base64));
    expect(crumbs["@type"]).toBe("BreadcrumbList");
    const items = crumbs.itemListElement as Record<string, unknown>[];
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ position: 1, item: SITE_URL });
    expect(items[1]).toMatchObject({ position: 2, name: base64.name.zh });
  });

  it("gives every tool a distinct @id", () => {
    const ids = new Set<string>();
    for (const tool of [base64, getTool("json-format")!, getTool("og-image")!]) {
      const [app] = graph(toolJsonLd(tool));
      ids.add(String(app["@id"]));
    }
    expect(ids.size).toBe(3);
  });

  it("emits a FAQPage node mirroring the on-page questions", () => {
    const faq = graph(toolJsonLd(base64)).find((node) => node["@type"] === "FAQPage");
    expect(faq).toBeDefined();
    expect(faq!["@id"]).toBe(`${SITE_URL}/tools/base64#faq`);
    expect(faq!.inLanguage).toBe("zh-CN");
    const questions = faq!.mainEntity as Record<string, unknown>[];
    expect(questions).toHaveLength(base64.faq!.length);
    expect(questions[0]).toMatchObject({
      "@type": "Question",
      name: base64.faq![0].q.zh,
      acceptedAnswer: { "@type": "Answer", text: base64.faq![0].a.zh },
    });
  });

  it("omits FAQPage for tools without FAQs", () => {
    const tool = allTools.find((t) => !t.faq)!;
    expect(graph(toolJsonLd(tool)).some((node) => node["@type"] === "FAQPage")).toBe(false);
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
