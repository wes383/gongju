/**
 * JSON-LD for the site itself.
 *
 * Two shapes are emitted: the home page declares the WebSite and the
 * Organization that publishes it, and every tool page declares the tool as a
 * free `WebApplication` inside that site, plus a breadcrumb trail back home.
 * The nodes reference each other by `@id` so crawlers merge them into one
 * graph instead of treating each page as an unrelated entity.
 *
 * Everything here is plain data so it can be unit tested; the component that
 * renders it lives in `components/site/json-ld.tsx`.
 */

import {
  SITE_DESCRIPTION,
  SITE_LANG,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
  absoluteUrl,
} from "./site";
import type { ToolMeta } from "./tools";

export type JsonLdNode = Record<string, unknown>;

const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

export function organizationId(): string {
  return ORGANIZATION_ID;
}

export function websiteId(): string {
  return WEBSITE_ID;
}

export function siteJsonLd(): JsonLdNode {
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
        "@id": WEBSITE_ID,
        url: SITE_URL,
        name: SITE_NAME,
        alternateName: SITE_TITLE,
        description: SITE_DESCRIPTION,
        inLanguage: SITE_LANG,
        publisher: { "@id": ORGANIZATION_ID },
      },
    ],
  };
}

export function toolJsonLd(tool: ToolMeta): JsonLdNode {
  const url = absoluteUrl(`/tools/${tool.slug}`);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": `${url}#webapp`,
        name: tool.name.zh,
        alternateName: tool.name.en,
        description: tool.description.zh,
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
        inLanguage: SITE_LANG,
        isPartOf: { "@id": WEBSITE_ID },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: SITE_NAME,
            item: SITE_URL,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: tool.name.zh,
            item: url,
          },
        ],
      },
      // FAQ markup mirrors the zh HTML that crawlers actually receive
      ...(tool.faq?.length
        ? [
            {
              "@type": "FAQPage",
              "@id": `${url}#faq`,
              inLanguage: SITE_LANG,
              mainEntity: tool.faq.map((item) => ({
                "@type": "Question",
                name: item.q.zh,
                acceptedAnswer: { "@type": "Answer", text: item.a.zh },
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
