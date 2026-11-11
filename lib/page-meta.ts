/**
 * Page-level metadata builders, per locale.
 *
 * Next merges metadata shallowly: a page that sets `openGraph` replaces the
 * whole object from the layout rather than merging into it. Setting only
 * `title` and `description` on a tool page therefore keeps the site-wide
 * Open Graph title, which is what every shared tool link used to show. The
 * builders below always write the full object so a share card describes the
 * page it points at.
 *
 * Canonicals and hreflang alternates are page-level on purpose: a layout-level
 * canonical or language set would be inherited by every route and fold all
 * tool pages into the home page in search results.
 *
 * Note this is unrelated to `lib/metadata.ts`, which strips metadata out of
 * uploaded images and PDFs.
 */

import type { Metadata } from "next";
import { DEFAULT_LOCALE, localePath, otherLocale, type Locale } from "./i18n";
import { OG_LOCALE, SITE_COPY, SITE_NAME, SITE_URL, absoluteUrl } from "./site";
import type { ToolMeta } from "./tools";

export const TOOL_PATH = "/tools/";

export function toolPath(slug: string, locale: Locale): string {
  return localePath(locale, `${TOOL_PATH}${slug}`);
}

export function toolUrl(slug: string, locale: Locale): string {
  return `${SITE_URL}${toolPath(slug, locale)}`;
}

/** Share-card title: the browser title template only applies to <title> */
export function toolShareTitle(tool: ToolMeta, locale: Locale): string {
  return `${tool.name[locale]} · ${SITE_NAME}`;
}

function languageAlternates(path: string): Record<string, string> {
  return {
    en: localePath("en", path),
    "zh-CN": localePath("zh", path),
    "x-default": localePath(DEFAULT_LOCALE, path),
  };
}

/**
 * Share cards point at the stable /og/<slug> route with absolute URLs: a
 * page-level openGraph object replaces the inherited one wholesale, so
 * images contributed by metadata files would be dropped on every page that
 * sets its own openGraph.
 */
function shareGraph(
  locale: Locale,
  title: string,
  description: string,
  url: string,
  image: { url: string; alt: string }
) {
  return {
    type: "website" as const,
    siteName: SITE_NAME,
    title,
    description,
    url,
    locale: OG_LOCALE[locale],
    alternateLocale: [OG_LOCALE[otherLocale(locale)]],
    images: [{ ...image, width: 1200, height: 630 }],
  };
}

function twitterCard(title: string, description: string, image: { url: string }) {
  return {
    card: "summary_large_image" as const,
    title,
    description,
    images: [image.url],
  };
}

export function toolMetadata(tool: ToolMeta, locale: Locale): Metadata {
  const title = toolShareTitle(tool, locale);
  const description = tool.description[locale];
  const path = toolPath(tool.slug, locale);
  const image = { url: absoluteUrl(`/og/${tool.slug}`), alt: tool.name.en };

  return {
    title: tool.name[locale],
    description,
    keywords: tool.keywords,
    alternates: {
      canonical: path,
      languages: languageAlternates(`${TOOL_PATH}${tool.slug}`),
    },
    openGraph: shareGraph(locale, title, description, `${SITE_URL}${path}`, image),
    twitter: twitterCard(title, description, image),
  };
}

/** Root-layout metadata; deliberately carries no canonical or alternates */
export function siteMetadata(locale: Locale): Metadata {
  const copy = SITE_COPY[locale];
  const image = { url: absoluteUrl("/og/home"), alt: copy.title };

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: copy.title,
      template: `%s · ${SITE_NAME}`,
    },
    description: copy.description,
    applicationName: SITE_NAME,
    keywords: copy.keywords,
    openGraph: shareGraph(
      locale,
      copy.title,
      copy.description,
      `${SITE_URL}${localePath(locale, "/")}`,
      image
    ),
    twitter: twitterCard(copy.title, copy.description, image),
  };
}

export function homeMetadata(locale: Locale): Metadata {
  const copy = SITE_COPY[locale];
  const image = { url: absoluteUrl("/og/home"), alt: copy.title };

  return {
    alternates: {
      canonical: localePath(locale, "/"),
      languages: languageAlternates("/"),
    },
    openGraph: shareGraph(
      locale,
      copy.title,
      copy.description,
      `${SITE_URL}${localePath(locale, "/")}`,
      image
    ),
    twitter: twitterCard(copy.title, copy.description, image),
  };
}

const PRIVACY_COPY: Record<Locale, { title: string; description: string }> = {
  en: {
    title: "Privacy Policy",
    description:
      "GongJu privacy policy: pure browser-side processing, data stays on your device; no accounts, no cookies, no tracking, with local storage and device permissions explained item by item.",
  },
  zh: {
    title: "隐私政策",
    description:
      "GongJu 隐私政策：纯浏览器端处理，数据不出本机；无账号、无 Cookie、无追踪，本地存储与设备权限逐项说明。",
  },
};

export function privacyMetadata(locale: Locale): Metadata {
  const { title, description } = PRIVACY_COPY[locale];
  const path = localePath(locale, "/privacy");
  const shareTitle = `${title} · ${SITE_NAME}`;
  const image = { url: absoluteUrl("/og/privacy"), alt: title };

  return {
    title,
    description,
    keywords:
      locale === "zh"
        ? ["隐私政策", "隐私", "数据保护", "本地处理", "privacy policy"]
        : ["privacy policy", "privacy", "data protection", "local processing"],
    alternates: {
      canonical: path,
      languages: languageAlternates("/privacy"),
    },
    openGraph: shareGraph(locale, shareTitle, description, `${SITE_URL}${path}`, image),
    twitter: twitterCard(shareTitle, description, image),
  };
}