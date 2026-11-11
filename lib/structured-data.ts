/**
 * JSON-LD for the site itself, per locale.
 *
 * Two shapes are emitted: each locale's home page declares the WebSite and
 * the Organization that publishes it, and every tool page declares the tool
 * as a free `WebApplication` inside that site, plus a breadcrumb trail back
 * home. The nodes reference each other by `@id` so crawlers merge them into
 * one graph instead of treating each page as an unrelated entity. The two
 * locale graphs share the Organization but keep separate WebSite @ids.
 *
 * Everything here is plain data so it can be unit tested; the component that
 * renders it lives in `components/site/json-ld.tsx`.
 */

import { htmlLang, localePath, otherLocale, type Locale } from "./i18n";
import { SITE_COPY, SITE_NAME, SITE_URL, absoluteUrl } from "./site";
import type { ToolMeta } from "./tools";

export type JsonLdNode = Record<string, unknown>;

const ORGANIZATION_ID = `${SITE_URL}/#organization`;

export function organizationId(): string {
  return ORGANIZATION_ID;
}

export function websiteId(locale: Locale): string {
  return `${SITE_URL}${localePath(locale, "/")}#website`;
}

export function siteJsonLd(locale: Locale): JsonLdNode {
  const copy = SITE_COPY[locale];

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ORGANIZATION_ID,
        name: SITE_NAME,
        url: SITE_URL,
      },
      {
        "@type": "WebSite",
        "@id": websiteId(locale),
        url: absoluteUrl(localePath(locale, "/")),
        name: SITE_NAME,
        alternateName: copy.title,
        description: copy.description,
        inLanguage: htmlLang[locale],
        publisher: { "@id": ORGANIZATION_ID },
      },
    ],
  };
}

export function toolJsonLd(tool: ToolMeta, locale: Locale): JsonLdNode {
  const url = absoluteUrl(localePath(locale, `/tools/${tool.slug}`));

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": `${url}#webapp`,
        name: tool.name[locale],
        alternateName: tool.name[otherLocale(locale)],
        description: tool.description[locale],
        url,
        applicationCategory: "UtilitiesApplication",
        // The tool runs entirely in the browser: no install, no account
        operatingSystem: "Any",
        browserRequirements: "Requires JavaScript",
        isAccessibleForFree: true,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "CNY",
        },
        inLanguage: htmlLang[locale],
        isPartOf: { "@id": websiteId(locale) },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: SITE_NAME,
            item: absoluteUrl(localePath(locale, "/")),
          },
          {
            "@type": "ListItem",
            position: 2,
            name: tool.name[locale],
            item: url,
          },
        ],
      },
      // FAQ markup mirrors the HTML that crawlers receive for this locale
      ...(tool.faq?.length
        ? [
            {
              "@type": "FAQPage",
              "@id": `${url}#faq`,
              inLanguage: htmlLang[locale],
              mainEntity: tool.faq.map((item) => ({
                "@type": "Question",
                name: item.q[locale],
                acceptedAnswer: { "@type": "Answer", text: item.a[locale] },
              })),
            },
          ]
        : []),
    ],
  };
}

/**
 * JSON.stringify, then escape the three characters that could break out of the
 * surrounding <script> element. `<\/script>` inside a string literal would end
 * the tag early and turn the rest of the data into markup.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}