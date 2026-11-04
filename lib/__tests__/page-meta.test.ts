import { describe, expect, it } from "vitest";
import { toolMetadata, toolShareTitle, toolUrl } from "@/lib/page-meta";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { allTools, getTool } from "@/lib/tools";

const base64 = getTool("base64")!;

describe("tool metadata", () => {
  it("writes the full open graph object rather than only a title", () => {
    const meta = toolMetadata(base64);
    expect(meta.openGraph).toEqual({
      type: "website",
      siteName: SITE_NAME,
      title: `${base64.name.zh} · ${SITE_NAME}`,
      description: base64.description.zh,
      url: `${SITE_URL}/tools/base64`,
      locale: "zh_CN",
      alternateLocale: ["en"],
    });
    expect(meta.twitter).toEqual({
      card: "summary_large_image",
      title: `${base64.name.zh} · ${SITE_NAME}`,
      description: base64.description.zh,
    });
  });

  it("keeps the browser title short and the share title branded", () => {
    const meta = toolMetadata(base64);
    expect(meta.title).toBe(base64.name.zh);
    expect(toolShareTitle(base64)).toContain(SITE_NAME);
  });

  it("points the canonical at the tool, not the home page", () => {
    const meta = toolMetadata(base64);
    expect(meta.alternates?.canonical).toBe("/tools/base64");
  });

  it("builds absolute share urls", () => {
    expect(toolUrl("base64")).toBe(`${SITE_URL}/tools/base64`);
    expect(toolUrl("base64").startsWith("http")).toBe(true);
  });

  it("carries the registry keywords through", () => {
    expect(toolMetadata(base64).keywords).toEqual(base64.keywords);
  });

  it("is complete for every registered tool", () => {
    for (const tool of allTools) {
      const meta = toolMetadata(tool);
      expect(meta.openGraph, tool.slug).toMatchObject({
        siteName: SITE_NAME,
        url: `${SITE_URL}/tools/${tool.slug}`,
      });
      expect(meta.description, tool.slug).toBe(tool.description.zh);
      expect(meta.description).not.toBe("");
    }
  });
});
