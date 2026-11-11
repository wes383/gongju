import type { MetadataRoute } from "next";
import { allTools } from "@/lib/tools";
import { SITE_URL } from "@/lib/site";

/**
 * The site is fully static: the home page plus one page per registered tool.
 * Tools are driven by the registry, so a new tool shows up here automatically.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: SITE_URL,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    ...allTools.map((tool) => ({
      url: `${SITE_URL}/tools/${tool.slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
