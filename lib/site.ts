import type { Locale } from "./i18n";

/**
 * Canonical origin of the deployed site.
 *
 * Defaults to the production origin so canonical URLs, the sitemap, Open
 * Graph tags and JSON-LD @ids stay correct even when the build environment
 * sets nothing (a localhost fallback once shipped to production and leaked
 * into the live sitemap). Override with NEXT_PUBLIC_SITE_URL, for example
 * on preview deployments.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://gongju.wesluma.com"
).replace(/\/$/, "");

export const SITE_NAME = "GongJu";

export const SITE_COPY: Record<Locale, { title: string; description: string; keywords: string[] }> = {
  en: {
    title: "GongJu · Online Toolbox",
    description:
      "A developer toolbox that runs entirely in your browser: encode, decode, format, convert, encrypt, date & time utilities and more. Your data never leaves your device.",
    keywords: ["online tools", "developer tools", "encode", "decode", "formatter", "converter"],
  },
  zh: {
    title: "GongJu · 在线工具箱",
    description:
      "纯浏览器端运行的开发者工具箱：编码解码、格式化、转换、加密、时间日期等常用工具，数据不出本机。",
    keywords: ["在线工具", "开发者工具", "编码解码", "格式化", "转换器"],
  },
};

/** Open Graph locale tags, which use underscores rather than dashes */
export const OG_LOCALE: Record<Locale, string> = { en: "en_US", zh: "zh_CN" };

/** Absolute URL for a site path, used wherever a crawler needs a full URL */
export function absoluteUrl(path: string): string {
  return path.startsWith("http") ? path : `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

/** Brand mark: lucide `wrench` on an ink rounded square; satori only accepts SVG as an img data URI */
export const SITE_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#25242a"/><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z" transform="translate(4 4)" fill="none" stroke="#fcfbfa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export const SITE_ICON_DATA_URI = `data:image/svg+xml,${encodeURIComponent(SITE_ICON_SVG)}`;
