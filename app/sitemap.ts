import type { MetadataRoute } from "next";
import { allTools } from "@/lib/tools";
import { LOCALES, localePath } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";

/**
 * The site is fully static: home plus one page per registered tool, in every
 * locale. Tools are driven by the registry, so a new tool shows up here
 * automatically. Each locale URL is listed separately with the full hreflang
 * set, as search engines expect for alternate language versions.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const pages: {
    path: string;
    changeFrequency: "weekly" | "yearly" | "monthly";
    priority: number;
  }[] = [
    { path: "/", changeFrequency: "weekly", priority: 1 },
    { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
    ...allTools.map((tool) => ({
      path: `/tools/${tool.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];

  return pages.flatMap((page) =>
    LOCALES.map((locale) => ({
      url: `${SITE_URL}${localePath(locale, page.path)}`,
      lastModified,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
      alternates: {
        languages: {
          en: `${SITE_URL}${localePath("en", page.path)}`,
          "zh-CN": `${SITE_URL}${localePath("zh", page.path)}`,
        },
      },
    }))
  );
}