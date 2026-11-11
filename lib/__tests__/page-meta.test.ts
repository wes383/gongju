import { describe, expect, it } from "vitest";
import {
  homeMetadata,
  privacyMetadata,
  toolMetadata,
  toolShareTitle,
  toolUrl,
} from "@/lib/page-meta";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { allTools, getTool } from "@/lib/tools";

const base64 = getTool("base64")!;

describe("tool metadata", () => {
  it("writes the full open graph object rather than only a title", () => {
    const meta = toolMetadata(base64, "en");
    expect(meta.openGraph).toEqual({
      type: "website",
      siteName: SITE_NAME,
      title: `${base64.name.en} · ${SITE_NAME}`,
      description: base64.description.en,
      url: `${SITE_URL}/tools/base64`,
      locale: "en_US",
      alternateLocale: ["zh_CN"],
      images: [{ url: `${SITE_URL}/og/base64`, alt: base64.name.en, width: 1200, height: 630 }],
    });
    expect(meta.twitter).toEqual({
      card: "summary_large_image",
      title: `${base64.name.en} · ${SITE_NAME}`,
      description: base64.description.en,
      images: [`${SITE_URL}/og/base64`],
    });
  });

  it("keeps the browser title short and the share title branded", () => {
    expect(toolMetadata(base64, "en").title).toBe(base64.name.en);
    expect(toolShareTitle(base64, "zh")).toContain(SITE_NAME);
  });

  it("points the canonical at the locale's tool path, not the home page", () => {
    expect(toolMetadata(base64, "en").alternates?.canonical).toBe("/tools/base64");
    expect(toolMetadata(base64, "zh").alternates?.canonical).toBe("/zh/tools/base64");
  });

  it("declares hreflang alternates including x-default", () => {
    expect(toolMetadata(base64, "zh").alternates?.languages).toEqual({
      en: "/tools/base64",
      "zh-CN": "/zh/tools/base64",
      "x-default": "/tools/base64",
    });
  });

  it("builds absolute share urls per locale", () => {
    expect(toolUrl("base64", "en")).toBe(`${SITE_URL}/tools/base64`);
    expect(toolUrl("base64", "zh")).toBe(`${SITE_URL}/zh/tools/base64`);
  });

  it("carries the registry keywords through", () => {
    expect(toolMetadata(base64, "en").keywords).toEqual(base64.keywords);
  });

  it("is complete for every registered tool in both locales", () => {
    for (const tool of allTools) {
      for (const locale of ["en", "zh"] as const) {
        const meta = toolMetadata(tool, locale);
        expect(meta.openGraph, tool.slug).toMatchObject({
          siteName: SITE_NAME,
          url: toolUrl(tool.slug, locale),
        });
        expect(meta.description, tool.slug).toBe(tool.description[locale]);
        expect(meta.description).not.toBe("");
      }
    }
  });
});

describe("home and privacy metadata", () => {
  it("canonicals each locale home separately", () => {
    expect(homeMetadata("en").alternates?.canonical).toBe("/");
    expect(homeMetadata("zh").alternates?.canonical).toBe("/zh");
  });

  it("localizes the privacy page", () => {
    expect(privacyMetadata("en").title).toBe("Privacy Policy");
    expect(privacyMetadata("zh").alternates?.canonical).toBe("/zh/privacy");
  });
});