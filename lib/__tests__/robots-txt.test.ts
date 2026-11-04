import { describe, expect, it } from "vitest";
import {
  buildRobots,
  buildSitemap,
  escapeXml,
  normalizeLoc,
  normalizeRobotPath,
  parseSitemapLines,
} from "@/lib/robots-txt";

describe("robots.txt", () => {
  it("lists the agent, the rules and the sitemap", () => {
    const text = buildRobots({
      userAgent: "*",
      allow: [],
      disallow: ["/admin", "private"],
      sitemaps: ["https://example.com/sitemap.xml"],
    });

    expect(text).toBe(
      [
        "User-agent: *",
        "Disallow: /admin",
        "Disallow: /private",
        "",
        "Sitemap: https://example.com/sitemap.xml",
        "",
      ].join("\n")
    );
  });

  it("splits several agents and skips a non-numeric crawl delay", () => {
    const text = buildRobots({
      userAgent: "Googlebot, Bingbot",
      allow: ["/public"],
      disallow: [],
      crawlDelay: "soon",
      sitemaps: [],
    });
    expect(text).toContain("User-agent: Googlebot\nUser-agent: Bingbot");
    expect(text).toContain("Allow: /public");
    expect(text).not.toContain("Crawl-delay");
  });

  it("keeps a numeric crawl delay and the host line", () => {
    const text = buildRobots({
      userAgent: "*",
      allow: [],
      disallow: [],
      crawlDelay: "2",
      sitemaps: [],
      host: "https://example.com",
    });
    expect(text).toContain("Crawl-delay: 2");
    expect(text).toContain("Host: https://example.com");
  });

  it("only accepts absolute sitemap URLs", () => {
    const text = buildRobots({
      userAgent: "*",
      allow: [],
      disallow: [],
      sitemaps: ["/sitemap.xml", "https://example.com/map.xml"],
    });
    expect(text).not.toContain("Sitemap: /sitemap.xml");
    expect(text).toContain("Sitemap: https://example.com/map.xml");
  });

  it("adds the leading slash robots.txt expects", () => {
    expect(normalizeRobotPath("admin")).toBe("/admin");
    expect(normalizeRobotPath("/admin")).toBe("/admin");
    expect(normalizeRobotPath("")).toBe("");
  });
});

describe("sitemap.xml", () => {
  it("joins relative paths onto the base and passes absolute ones through", () => {
    expect(normalizeLoc("https://example.com/", "/docs")).toBe("https://example.com/docs");
    expect(normalizeLoc("https://example.com", "a/b")).toBe("https://example.com/a/b");
    expect(normalizeLoc("https://example.com", "https://other.dev/x")).toBe("https://other.dev/x");
    expect(normalizeLoc("example.com", "a")).toBeNull();
    expect(normalizeLoc("https://example.com", "  ")).toBeNull();
  });

  it("reads optional fields and reports what it skipped", () => {
    const { entries, skipped } = parseSitemapLines(
      ["/a | 2026-01-02 | weekly | 0.8", "/b", "not a url | 2026-01-01", "/a"].join("\n"),
      "https://example.com"
    );

    expect(entries).toEqual([
      { loc: "https://example.com/a", lastmod: "2026-01-02", changefreq: "weekly", priority: "0.8" },
      { loc: "https://example.com/b" },
    ]);
    // a loc with spaces cannot be a URL, and the second /a is a duplicate
    expect(skipped).toEqual(["not a url | 2026-01-01"]);
  });

  it("skips everything when the base URL is unusable", () => {
    const { entries, skipped } = parseSitemapLines("/a\n/b", "localhost");
    expect(entries).toEqual([]);
    expect(skipped).toEqual(["/a", "/b"]);
  });

  it("clamps out-of-range priorities and unknown frequencies", () => {
    const { entries } = parseSitemapLines(
      "/a | 2026-01-01 | sometimes | 3",
      "https://example.com"
    );
    expect(entries[0].priority).toBeUndefined();
    expect(entries[0].changefreq).toBeUndefined();
  });

  it("escapes ampersands and quotes", () => {
    expect(escapeXml('a&b<c>"d"')).toBe("a&amp;b&lt;c&gt;&quot;d&quot;");
  });

  it("writes a urlset with one url per entry", () => {
    const xml = buildSitemap([
      { loc: "https://example.com/?a=1&b=2", lastmod: "2026-01-01" },
      { loc: "https://example.com/b" },
    ]);

    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain("<loc>https://example.com/?a=1&amp;b=2</loc>");
    expect(xml.match(/<url>/g)).toHaveLength(2);
    expect(xml.endsWith("</urlset>\n")).toBe(true);
  });

  it("still writes a valid document when there is nothing to list", () => {
    const xml = buildSitemap([]);
    expect(xml).toBe(
      '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>\n'
    );
  });
});
