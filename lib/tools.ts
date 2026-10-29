import type { LucideIcon } from "lucide-react";
import {
  Binary,
  Braces,
  Calculator,
  Clock,
  Code2,
  Dices,
  FileCode2,
  FileJson,
  FileText,
  Globe,
  Hash,
  Image as ImageIcon,
  KeyRound,
  Languages,
  Link2,
  ListFilter,
  Palette,
  QrCode,
  Ruler,
  ShieldCheck,
  Table2,
  Terminal,
} from "lucide-react";
import type { Locale } from "@/lib/i18n";

type LocalizedText = Record<Locale, string>;

export interface ToolMeta {
  slug: string;
  name: LocalizedText;
  description: LocalizedText;
  keywords: string[];
  category: CategoryId;
  icon: LucideIcon;
}

export type CategoryId =
  | "encoding"
  | "json"
  | "text"
  | "datetime"
  | "hash"
  | "image"
  | "color"
  | "qrcode"
  | "dev"
  | "network"
  | "convert"
  | "pdf"
  | "misc";

export interface CategoryMeta {
  id: CategoryId;
  name: LocalizedText;
  description: LocalizedText;
  icon: LucideIcon;
  tools: ToolMeta[];
}

const tool = (t: Omit<ToolMeta, "category">): ToolMeta => ({ ...t, category: "encoding" });

const encodingTools: ToolMeta[] = [
  tool({
    slug: "base64",
    name: { zh: "Base64 编码 / 解码", en: "Base64 Encode / Decode" },
    description: {
      zh: "文本与 Base64 互转，支持 URL 安全字符集与换行折行",
      en: "Convert text to and from Base64, with URL-safe alphabet and line wrapping",
    },
    keywords: ["base64", "b64", "编码", "解码", "encode", "decode"],
    icon: Binary,
  }),
  tool({
    slug: "url-encode",
    name: { zh: "URL 编码 / 解码", en: "URL Encode / Decode" },
    description: {
      zh: "encodeURIComponent / encodeURI 双模式互转",
      en: "Encode or decode with encodeURIComponent, encodeURI or form mode",
    },
    keywords: ["url", "urlencode", "urldecode", "百分号", "转义", "encode"],
    icon: Link2,
  }),
  tool({
    slug: "html-entity",
    name: { zh: "HTML 实体编码 / 解码", en: "HTML Entity Encode / Decode" },
    description: {
      zh: "转义 & < > 等特殊字符，或还原命名与数字实体",
      en: "Escape & < > and friends, or decode named and numeric entities",
    },
    keywords: ["html", "entity", "实体", "转义", "escape", "unescape"],
    icon: Code2,
  }),
  tool({
    slug: "unicode",
    name: { zh: "Unicode 转中文", en: "Unicode Escape / Unescape" },
    description: {
      zh: "中文与 \\uXXXX / &#DDDD; / U+XXXX 之间互转",
      en: "Convert text to \\uXXXX, &#NNNN; or U+XXXX and back",
    },
    keywords: ["unicode", "中文", "转义", "码点", "codepoint", "\\u"],
    icon: Languages,
  }),
  tool({
    slug: "hex",
    name: { zh: "十六进制 ↔ 字符串", en: "Hex to String" },
    description: {
      zh: "UTF-8 字节与十六进制串互转，支持分隔符与大小写",
      en: "UTF-8 bytes to hex and back, with separator and case options",
    },
    keywords: ["hex", "十六进制", "hexdump", "字节", "byte"],
    icon: Hash,
  }),
  tool({
    slug: "radix",
    name: { zh: "进制互转", en: "Base Converter" },
    description: {
      zh: "二 / 八 / 十 / 十六进制任意互转，支持大整数",
      en: "Convert between binary, octal, decimal, hex and any base up to 36",
    },
    keywords: ["进制", "binary", "octal", "decimal", "hex", "base", "转换"],
    icon: Calculator,
  }),
  tool({
    slug: "jwt",
    name: { zh: "JWT 解码", en: "JWT Decoder" },
    description: {
      zh: "查看 Header 与 Payload，解析过期时间（不校验签名）",
      en: "Inspect header and payload, read expiry claims (signature is not verified)",
    },
    keywords: ["jwt", "token", "json web token", "bearer", "解码"],
    icon: KeyRound,
  }),
  tool({
    slug: "query-string",
    name: { zh: "Query String 解析 / 生成", en: "Query String Parser" },
    description: {
      zh: "URL 参数表格化解析，再一键拼回查询串",
      en: "Break a URL into editable key/value rows and rebuild the query string",
    },
    keywords: ["query", "querystring", "url params", "参数", "查询串"],
    icon: ListFilter,
  }),
  tool({
    slug: "markdown",
    name: { zh: "Markdown ↔ HTML", en: "Markdown to HTML" },
    description: {
      zh: "Markdown 渲染为 HTML，或把 HTML 反向转回 Markdown",
      en: "Render Markdown to HTML, or convert HTML back to Markdown",
    },
    keywords: ["markdown", "md", "html", "渲染", "转换", "turndown"],
    icon: FileCode2,
  }),
  tool({
    slug: "yaml",
    name: { zh: "YAML ↔ JSON", en: "YAML to JSON" },
    description: {
      zh: "配置文件互转，带语法错误定位",
      en: "Convert config files both ways, with line and column error reporting",
    },
    keywords: ["yaml", "yml", "json", "配置", "k8s", "转换"],
    icon: FileJson,
  }),
  tool({
    slug: "xml",
    name: { zh: "XML ↔ JSON", en: "XML to JSON" },
    description: {
      zh: "XML 与 JSON 互转，可保留属性与文本节点",
      en: "Convert XML and JSON, keeping attributes and text nodes",
    },
    keywords: ["xml", "json", "soap", "转换", "属性"],
    icon: Braces,
  }),
  tool({
    slug: "csv",
    name: { zh: "CSV ↔ JSON", en: "CSV to JSON" },
    description: {
      zh: "表格数据与 JSON 互转，自动识别分隔符",
      en: "Convert tabular data both ways, with the delimiter detected automatically",
    },
    keywords: ["csv", "json", "表格", "excel", "tsv", "转换"],
    icon: Table2,
  }),
];

export const categories: CategoryMeta[] = [
  {
    id: "encoding",
    name: { zh: "编码 / 解码", en: "Encoding / Decoding" },
    description: {
      zh: "字符串与各种编码格式之间的互转，最高频的一类工具",
      en: "String and encoding conversions, the most used category",
    },
    icon: Binary,
    tools: encodingTools,
  },
  {
    id: "json",
    name: { zh: "JSON / 数据格式", en: "JSON / Data" },
    description: {
      zh: "格式化、校验、对比、树形浏览与类型生成",
      en: "Format, validate, diff, browse and generate types from JSON",
    },
    icon: Braces,
    tools: [],
  },
  {
    id: "text",
    name: { zh: "文本处理", en: "Text" },
    description: {
      zh: "统计、大小写、去重、Diff、正则测试",
      en: "Counting, case conversion, dedupe, diff and regex testing",
    },
    icon: FileText,
    tools: [],
  },
  {
    id: "datetime",
    name: { zh: "时间 / 日期", en: "Date / Time" },
    description: {
      zh: "时间戳、时区、Cron、日期差值",
      en: "Timestamps, time zones, cron and date math",
    },
    icon: Clock,
    tools: [],
  },
  {
    id: "hash",
    name: { zh: "哈希 / 安全", en: "Hash / Security" },
    description: {
      zh: "摘要、HMAC、随机串与密码强度",
      en: "Digests, HMAC, random strings and password strength",
    },
    icon: ShieldCheck,
    tools: [],
  },
  {
    id: "image",
    name: { zh: "图片处理", en: "Images" },
    description: {
      zh: "压缩、转换、裁剪、水印、取色",
      en: "Compress, convert, crop, watermark and pick colors",
    },
    icon: ImageIcon,
    tools: [],
  },
  {
    id: "color",
    name: { zh: "颜色 / CSS", en: "Color / CSS" },
    description: {
      zh: "取色、渐变、阴影、对比度检查",
      en: "Pickers, gradients, shadows and contrast checks",
    },
    icon: Palette,
    tools: [],
  },
  {
    id: "qrcode",
    name: { zh: "二维码 / 条码", en: "QR / Barcode" },
    description: {
      zh: "生成与识别二维码、条形码",
      en: "Generate and scan QR codes and barcodes",
    },
    icon: QrCode,
    tools: [],
  },
  {
    id: "dev",
    name: { zh: "开发者 / 代码", en: "Developer / Code" },
    description: {
      zh: "SQL、代码格式化、状态码、UA 解析",
      en: "SQL, code formatting, status codes and user-agent parsing",
    },
    icon: Terminal,
    tools: [],
  },
  {
    id: "network",
    name: { zh: "网络 / URL", en: "Network / URL" },
    description: {
      zh: "URL 结构解析、IP 校验、Header 生成",
      en: "URL structure, IP validation and header builders",
    },
    icon: Globe,
    tools: [],
  },
  {
    id: "convert",
    name: { zh: "转换器 / 单位", en: "Converters / Units" },
    description: {
      zh: "单位换算、汇率、百分比、BMI",
      en: "Units, currency, percentages and BMI",
    },
    icon: Ruler,
    tools: [],
  },
  {
    id: "pdf",
    name: { zh: "PDF / 文档", en: "PDF / Documents" },
    description: {
      zh: "合并、拆分、转图、加水印",
      en: "Merge, split, convert to images and watermark",
    },
    icon: FileText,
    tools: [],
  },
  {
    id: "misc",
    name: { zh: "其他实用工具", en: "Misc" },
    description: {
      zh: "随机数、计算器、摩斯电码、速查表",
      en: "Random numbers, calculators, Morse code and cheat sheets",
    },
    icon: Dices,
    tools: [],
  },
];

export const allTools: ToolMeta[] = categories.flatMap((c) => c.tools);

export function getTool(slug: string): ToolMeta | undefined {
  return allTools.find((t) => t.slug === slug);
}

export function toolName(tool: ToolMeta, locale: Locale): string {
  return tool.name[locale];
}

export function toolDescription(tool: ToolMeta, locale: Locale): string {
  return tool.description[locale];
}

/** Match a tool against a search query (name, description, keywords) */
export function toolMatches(tool: ToolMeta, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    tool.name.zh.toLowerCase().includes(q) ||
    tool.name.en.toLowerCase().includes(q) ||
    tool.description.zh.toLowerCase().includes(q) ||
    tool.description.en.toLowerCase().includes(q) ||
    tool.keywords.some((k) => k.toLowerCase().includes(q))
  );
}
