/**
 * Canonical origin of the deployed site.
 *
 * Set NEXT_PUBLIC_SITE_URL in the environment to the production origin
 * (for example https://tools.example.com); everything that needs absolute
 * URLs — sitemap, robots, Open Graph tags — reads it from here.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  ""
);

export const SITE_NAME = "GongJu";

export const SITE_TITLE = "GongJu · 在线工具箱";

export const SITE_DESCRIPTION =
  "纯浏览器端运行的开发者工具箱：编码解码、格式化、转换、加密、时间日期等常用工具，数据不出本机。";

/** Open Graph locale tag, which uses an underscore rather than a dash */
export const SITE_OG_LOCALE = "zh_CN";

/** BCP 47 tag used by <html lang> and schema.org `inLanguage` */
export const SITE_LANG = "zh-CN";

/** Absolute URL for a site path, used wherever a crawler needs a full URL */
export function absoluteUrl(path: string): string {
  return path.startsWith("http") ? path : `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}
