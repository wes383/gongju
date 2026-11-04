/**
 * Schema.org / JSON-LD builders.
 *
 * Only the handful of types a content site actually needs are modelled here,
 * and each one is assembled from flat form values so the UI can stay generic:
 * pick a type, fill the fields it declares, get JSON-LD back. Empty fields are
 * dropped rather than emitted as empty strings, because Google treats a blank
 * `description` as a broken rich result instead of a missing one.
 */

export type SchemaTypeId = "article" | "product" | "faq" | "breadcrumb" | "organization";

export type SchemaFieldKind = "text" | "url" | "date" | "number" | "multiline";

export interface SchemaField {
  key: string;
  label: { zh: string; en: string };
  /** A missing required field blocks the rich result outright */
  required?: boolean;
  kind?: SchemaFieldKind;
  placeholder?: { zh: string; en: string };
  help?: { zh: string; en: string };
}

export interface SchemaType {
  id: SchemaTypeId;
  label: { zh: string; en: string };
  description: { zh: string; en: string };
  fields: SchemaField[];
}

/** Placeholder text is shared so the forms do not repeat themselves */
const PH = {
  url: { zh: "https://example.com/page", en: "https://example.com/page" },
  image: { zh: "https://example.com/cover.jpg", en: "https://example.com/cover.jpg" },
  date: { zh: "2026-11-04", en: "2026-11-04" },
};

export const SCHEMA_TYPES: SchemaType[] = [
  {
    id: "article",
    label: { zh: "文章 / 博客", en: "Article" },
    description: {
      zh: "新闻报道、博客文章、教程页面",
      en: "News, blog posts and tutorial pages",
    },
    fields: [
      {
        key: "headline",
        label: { zh: "标题", en: "Headline" },
        required: true,
        help: { zh: "列表里展示的标题，建议 110 字符以内", en: "Up to 110 characters" },
      },
      { key: "description", label: { zh: "摘要", en: "Description" }, kind: "multiline" },
      { key: "url", label: { zh: "页面地址", en: "URL" }, kind: "url", placeholder: PH.url },
      { key: "image", label: { zh: "封面图", en: "Image" }, kind: "url", placeholder: PH.image },
      { key: "author", label: { zh: "作者", en: "Author" } },
      { key: "publisher", label: { zh: "发布方", en: "Publisher" } },
      {
        key: "datePublished",
        label: { zh: "发布时间", en: "Published" },
        kind: "date",
        placeholder: PH.date,
      },
      {
        key: "dateModified",
        label: { zh: "更新时间", en: "Modified" },
        kind: "date",
        placeholder: PH.date,
      },
    ],
  },
  {
    id: "product",
    label: { zh: "商品", en: "Product" },
    description: {
      zh: "商品详情页，带价格与库存状态",
      en: "Product pages with price and availability",
    },
    fields: [
      { key: "name", label: { zh: "商品名", en: "Name" }, required: true },
      { key: "description", label: { zh: "描述", en: "Description" }, kind: "multiline" },
      { key: "brand", label: { zh: "品牌", en: "Brand" } },
      { key: "sku", label: { zh: "SKU", en: "SKU" } },
      { key: "price", label: { zh: "价格", en: "Price" }, kind: "number", placeholder: { zh: "199.00", en: "199.00" } },
      { key: "currency", label: { zh: "币种", en: "Currency" }, placeholder: { zh: "CNY", en: "USD" } },
      {
        key: "availability",
        label: { zh: "库存状态（in / out）", en: "Availability (in / out / backorder)" },
        placeholder: { zh: "in", en: "in" },
      },
      { key: "url", label: { zh: "商品地址", en: "URL" }, kind: "url", placeholder: PH.url },
      { key: "image", label: { zh: "商品图", en: "Image" }, kind: "url", placeholder: PH.image },
    ],
  },
  {
    id: "faq",
    label: { zh: "FAQ 问答", en: "FAQ" },
    description: {
      zh: "常见问题，可直接拿到搜索结果里的折叠问答",
      en: "Question and answer pairs that can appear expanded in search",
    },
    fields: [
      {
        key: "faq",
        label: { zh: "问答（问题一行，回答另起，空行分隔）", en: "Pairs (question line, answer below, blank line between)" },
        required: true,
        kind: "multiline",
        placeholder: {
          zh: "这个工具会把数据上传吗？\n不会。所有处理都在浏览器里完成。\n\n支持哪些浏览器？\n最近两年的 Chrome、Edge、Firefox、Safari。",
          en: "Does this tool upload my data?\nNo. Everything runs in your browser.\n\nWhich browsers are supported?\nChrome, Edge, Firefox and Safari from the last two years.",
        },
      },
    ],
  },
  {
    id: "breadcrumb",
    label: { zh: "面包屑导航", en: "Breadcrumb" },
    description: {
      zh: "搜索结果里显示层级路径，替代裸链接",
      en: "Shows the path instead of a bare URL in results",
    },
    fields: [
      {
        key: "breadcrumb",
        label: { zh: "层级（名称 | 地址，每行一条）", en: "Levels (name | url, one per line)" },
        required: true,
        kind: "multiline",
        placeholder: {
          zh: "首页 | https://example.com\n文档 | https://example.com/docs\n入门 | https://example.com/docs/start",
          en: "Home | https://example.com\nDocs | https://example.com/docs\nGetting started | https://example.com/docs/start",
        },
      },
    ],
  },
  {
    id: "organization",
    label: { zh: "组织 / 品牌", en: "Organization" },
    description: {
      zh: "官网首页标识品牌、Logo 与社交账号",
      en: "Brand, logo and social profiles for a site's home page",
    },
    fields: [
      { key: "name", label: { zh: "名称", en: "Name" }, required: true },
      { key: "url", label: { zh: "官网", en: "URL" }, kind: "url", placeholder: PH.url },
      { key: "logo", label: { zh: "Logo", en: "Logo" }, kind: "url", placeholder: PH.image },
      { key: "description", label: { zh: "简介", en: "Description" }, kind: "multiline" },
      {
        key: "sameAs",
        label: { zh: "社交主页（每行一个）", en: "Profiles (one per line)" },
        kind: "multiline",
        placeholder: { zh: "https://x.com/xxx", en: "https://x.com/yourname" },
      },
    ],
  },
];

export function schemaType(id: SchemaTypeId): SchemaType {
  return SCHEMA_TYPES.find((item) => item.id === id) ?? SCHEMA_TYPES[0];
}

export type SchemaValues = Record<string, string>;

export interface SchemaIssue {
  key: string;
  kind: "required" | "url" | "date" | "number" | "pair";
}

const URL_RE = /^https?:\/\/[^\s]+$/i;

export function isAbsoluteUrl(value: string): boolean {
  return URL_RE.test(value.trim());
}

export function isIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  // Date.UTC rolls 2026-02-31 over into March, so compare the parts back
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

/** "In stock" style input reduced to the schema.org enum URL */
const AVAILABILITY: Record<string, string> = {
  in: "https://schema.org/InStock",
  instock: "https://schema.org/InStock",
  out: "https://schema.org/OutOfStock",
  outofstock: "https://schema.org/OutOfStock",
  preorder: "https://schema.org/PreOrder",
  backorder: "https://schema.org/BackOrder",
};

export function availabilityUrl(value: string): string {
  const key = value.trim().toLowerCase().replace(/[\s_-]+/g, "");
  return AVAILABILITY[key] ?? "https://schema.org/InStock";
}

export interface FaqPair {
  question: string;
  answer: string;
}

/** Blocks separated by a blank line: first line asks, the rest answers. */
export function parseFaq(text: string): FaqPair[] {
  return text
    .split(/\n\s*\n/)
    .map((block) => {
      const lines = block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      if (lines.length === 0) return null;
      return { question: lines[0], answer: lines.slice(1).join(" ") };
    })
    .filter((pair): pair is FaqPair => pair !== null && pair.question.length > 0);
}

export interface CrumbEntry {
  name: string;
  url: string;
}

/** One level per line, `name | url`; a trailing "|" leaves the last URL out. */
export function parseBreadcrumb(text: string): CrumbEntry[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, ...rest] = line.split(/[|｜\t]/);
      return { name: name.trim(), url: rest.join("|").trim() };
    })
    .filter((crumb) => crumb.name.length > 0);
}

function listOf(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

/** Empty strings are dropped so the output never carries blank properties */
function put(target: Record<string, unknown>, key: string, value: string | undefined): void {
  const trimmed = value?.trim();
  if (trimmed) target[key] = trimmed;
}

export function validateSchema(type: SchemaTypeId, values: SchemaValues): SchemaIssue[] {
  const issues: SchemaIssue[] = [];
  for (const field of schemaType(type).fields) {
    const raw = (values[field.key] ?? "").trim();
    if (!raw) {
      if (field.required) issues.push({ key: field.key, kind: "required" });
      continue;
    }
    if (field.kind === "url" && !isAbsoluteUrl(raw)) issues.push({ key: field.key, kind: "url" });
    if (field.kind === "date" && !isIsoDate(raw)) issues.push({ key: field.key, kind: "date" });
    if (field.kind === "number" && Number.isNaN(Number(raw)))
      issues.push({ key: field.key, kind: "number" });
    if (type === "faq" && field.key === "faq" && raw) {
      const pairs = parseFaq(raw);
      if (pairs.length === 0 || pairs.some((pair) => !pair.answer))
        issues.push({ key: field.key, kind: "pair" });
    }
    if (type === "breadcrumb" && field.key === "breadcrumb" && raw) {
      if (parseBreadcrumb(raw).some((crumb) => !crumb.url))
        issues.push({ key: field.key, kind: "pair" });
    }
  }
  return issues;
}

/**
 * Build the JSON-LD document. Required fields are not enforced here — call
 * `validateSchema` first — so the preview still updates while a form is halffilled.
 */
export function buildSchema(type: SchemaTypeId, values: SchemaValues): Record<string, unknown> {
  const at = { "@context": "https://schema.org" };
  const v = (key: string) => (values[key] ?? "").trim();

  switch (type) {
    case "article": {
      const schema: Record<string, unknown> = { ...at, "@type": "Article" };
      put(schema, "headline", v("headline"));
      put(schema, "description", v("description"));
      put(schema, "image", v("image"));
      put(schema, "datePublished", v("datePublished"));
      put(schema, "dateModified", v("dateModified"));
      if (v("author")) schema.author = { "@type": "Person", name: v("author") };
      if (v("publisher")) schema.publisher = { "@type": "Organization", name: v("publisher") };
      if (v("url")) schema.mainEntityOfPage = { "@type": "WebPage", "@id": v("url") };
      return schema;
    }
    case "product": {
      const schema: Record<string, unknown> = { ...at, "@type": "Product" };
      put(schema, "name", v("name"));
      put(schema, "description", v("description"));
      put(schema, "sku", v("sku"));
      put(schema, "image", v("image"));
      put(schema, "url", v("url"));
      if (v("brand")) schema.brand = { "@type": "Brand", name: v("brand") };
      const price = v("price");
      const currency = v("currency");
      if (price || currency) {
        const offer: Record<string, unknown> = { "@type": "Offer" };
        put(offer, "price", price);
        put(offer, "priceCurrency", currency.toUpperCase());
        if (v("availability")) offer.availability = availabilityUrl(v("availability"));
        if (v("url")) offer.url = v("url");
        schema.offers = offer;
      }
      return schema;
    }
    case "faq": {
      const schema: Record<string, unknown> = { ...at, "@type": "FAQPage" };
      const pairs = parseFaq(v("faq")).filter((pair) => pair.question && pair.answer);
      if (pairs.length > 0) {
        schema.mainEntity = pairs.map((pair) => ({
          "@type": "Question",
          name: pair.question,
          acceptedAnswer: { "@type": "Answer", text: pair.answer },
        }));
      }
      return schema;
    }
    case "breadcrumb": {
      const schema: Record<string, unknown> = { ...at, "@type": "BreadcrumbList" };
      const crumbs = parseBreadcrumb(v("breadcrumb"));
      if (crumbs.length > 0) {
        schema.itemListElement = crumbs.map((crumb, index) => {
          const item: Record<string, unknown> = {
            "@type": "ListItem",
            position: index + 1,
            name: crumb.name,
          };
          if (crumb.url) item.item = crumb.url;
          return item;
        });
      }
      return schema;
    }
    case "organization":
    default: {
      const schema: Record<string, unknown> = { ...at, "@type": "Organization" };
      put(schema, "name", v("name"));
      put(schema, "url", v("url"));
      put(schema, "logo", v("logo"));
      put(schema, "description", v("description"));
      const sameAs = listOf(v("sameAs"));
      if (sameAs.length > 0) schema.sameAs = sameAs;
      return schema;
    }
  }
}

/** Pretty JSON with two-space indents, ready to paste into `<script type="application/ld+json">` */
export function schemaJson(type: SchemaTypeId, values: SchemaValues): string {
  return JSON.stringify(buildSchema(type, values), null, 2);
}
