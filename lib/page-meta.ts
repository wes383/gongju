/**
 * Page-level metadata builders.
 *
 * Next merges metadata shallowly: a page that sets `openGraph` replaces the
 * whole object from the layout rather than merging into it. Setting only
 * `title` and `description` on a tool page therefore keeps the site-wide
 * Open Graph title, which is what every shared tool link used to show. The
 * builder below always writes the full object so a share card describes the
 * page it points at.
 *
 * Note this is unrelated to `lib/metadata.ts`, which strips metadata out of
 * uploaded images and PDFs.
 */

import type { Metadata } from "next";
import { SITE_NAME, SITE_OG_LOCALE, SITE_URL } from "./site";
import type { ToolMeta } from "./tools";

export const TOOL_PATH = "/tools/";

export function toolUrl(slug: string): string {
  return `${SITE_URL}${TOOL_PATH}${slug}`;
}

/** Share-card title: the browser title template only applies to <title> */
export function toolShareTitle(tool: ToolMeta): string {
  return `${tool.name.zh} · ${SITE_NAME}`;
}

export function toolMetadata(tool: ToolMeta): Metadata {
  const title = toolShareTitle(tool);
  const description = tool.description.zh;
  const url = toolUrl(tool.slug);

  return {
    title: tool.name.zh,
    description,
    keywords: tool.keywords,
    alternates: { canonical: `${TOOL_PATH}${tool.slug}` },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description,
      url,
      locale: SITE_OG_LOCALE,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}
