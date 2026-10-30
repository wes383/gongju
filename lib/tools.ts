import type { LucideIcon } from "lucide-react";
import {
  Binary,
  Braces,
  CaseSensitive,
  Calculator,
  CalendarClock,
  CalendarDays,
  CalendarPlus,
  CalendarRange,
  Clock,
  Code2,
  Dices,
  Eraser,
  FileCode2,
  FileDiff,
  FileJson,
  GitCompare,
  FileText,
  Fingerprint,
  Globe,
  Hash,
  Image as ImageIcon,
  KeyRound,
  Languages,
  ListTree,
  Link2,
  ListFilter,
  Lock,
  Palette,
  Pilcrow,
  QrCode,
  Regex,
  Ruler,
  Search,
  ShieldCheck,
  SortAsc,
  SpellCheck,
  Timer,
  Table2,
  Terminal,
  Type,
  Wand2,
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
const jsonTool = (t: Omit<ToolMeta, "category">): ToolMeta => ({ ...t, category: "json" });
const textTool = (t: Omit<ToolMeta, "category">): ToolMeta => ({ ...t, category: "text" });
const dateTool = (t: Omit<ToolMeta, "category">): ToolMeta => ({ ...t, category: "datetime" });
const hashTool = (t: Omit<ToolMeta, "category">): ToolMeta => ({ ...t, category: "hash" });

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

const jsonTools: ToolMeta[] = [
  jsonTool({
    slug: "json-format",
    name: { zh: "JSON 格式化 / 校验", en: "JSON Formatter & Validator" },
    description: {
      zh: "格式化、压缩、校验，语法错误精确到行列",
      en: "Format, minify and validate, with the exact line and column of syntax errors",
    },
    keywords: ["json", "format", "beautify", "minify", "validate", "格式化", "压缩", "校验"],
    icon: Braces,
  }),
  jsonTool({
    slug: "json-tree",
    name: { zh: "JSON 树形视图", en: "JSON Tree Viewer" },
    description: {
      zh: "折叠展开浏览结构，适合查看嵌套很深的 JSON",
      en: "Browse the structure with collapsible nodes, ideal for deeply nested data",
    },
    keywords: ["json", "tree", "viewer", "树形", "折叠", "展开"],
    icon: ListTree,
  }),
  jsonTool({
    slug: "json-path",
    name: { zh: "JSONPath 查询", en: "JSONPath Query" },
    description: {
      zh: "用 JSONPath 表达式从 JSON 中提取数据",
      en: "Extract values from JSON with JSONPath expressions",
    },
    keywords: ["jsonpath", "json", "query", "查询", "提取", "过滤"],
    icon: Search,
  }),
  jsonTool({
    slug: "json-diff",
    name: { zh: "JSON 差异对比", en: "JSON Diff" },
    description: {
      zh: "对比两份 JSON，列出新增、删除与修改的字段",
      en: "Compare two documents and list added, removed and changed fields",
    },
    keywords: ["json", "diff", "compare", "对比", "差异"],
    icon: GitCompare,
  }),
  jsonTool({
    slug: "json-to-code",
    name: { zh: "JSON 转类型定义", en: "JSON to Types" },
    description: {
      zh: "根据 JSON 生成 TypeScript / Go / Python / Java 类型",
      en: "Generate TypeScript, Go, Python or Java types from JSON",
    },
    keywords: ["json", "typescript", "go", "python", "java", "interface", "类型"],
    icon: FileCode2,
  }),
  jsonTool({
    slug: "json-to-csv",
    name: { zh: "JSON 转 CSV / Excel", en: "JSON to CSV / Excel" },
    description: {
      zh: "把 JSON 数组转成 CSV 或导出 xlsx，嵌套字段可扁平化",
      en: "Turn a JSON array into CSV or export xlsx, with nested fields flattened",
    },
    keywords: ["json", "csv", "excel", "表格", "导出"],
    icon: Table2,
  }),
  jsonTool({
    slug: "json-transform",
    name: { zh: "JSON 排序 / 去重 / 扁平化", en: "JSON Transform" },
    description: {
      zh: "按 key 排序、数组去重、对象扁平化与还原",
      en: "Sort keys, dedupe arrays, flatten objects and reverse it",
    },
    keywords: ["json", "sort", "dedupe", "flatten", "排序", "去重", "扁平化"],
    icon: Wand2,
  }),
];

const textTools: ToolMeta[] = [
  textTool({
    slug: "text-stats",
    name: { zh: "文本统计", en: "Text Statistics" },
    description: {
      zh: "字符、字数、行数、段落、字节数与阅读时长",
      en: "Characters, words, lines, paragraphs, bytes and reading time",
    },
    keywords: ["统计", "字数", "字符", "行数", "count", "word count", "stats"],
    icon: Type,
  }),
  textTool({
    slug: "text-case",
    name: { zh: "大小写 / 命名转换", en: "Case & Naming Converter" },
    description: {
      zh: "全大写、全小写、首字母大写，以及驼峰、下划线、中划线等命名风格",
      en: "Upper, lower, title case plus camel, snake, kebab and other naming styles",
    },
    keywords: ["大小写", "camel", "snake", "kebab", "pascal", "命名", "case"],
    icon: CaseSensitive,
  }),
  textTool({
    slug: "text-diff",
    name: { zh: "文本差异对比", en: "Text Diff" },
    description: {
      zh: "逐行对比两段文本，标出新增、删除的行",
      en: "Compare two texts line by line and mark added and removed lines",
    },
    keywords: ["diff", "对比", "差异", "compare", "文本"],
    icon: FileDiff,
  }),
  textTool({
    slug: "text-clean",
    name: { zh: "文本清理", en: "Text Cleanup" },
    description: {
      zh: "去除空行、重复行、行首尾空格与多余空格",
      en: "Remove empty lines, duplicates, leading/trailing and repeated spaces",
    },
    keywords: ["清理", "去空行", "去重", "空格", "clean", "trim"],
    icon: Eraser,
  }),
  textTool({
    slug: "text-sort",
    name: { zh: "文本排序 / 去重", en: "Text Sort & Dedupe" },
    description: {
      zh: "按字母、长度或数字排序，可同时去重",
      en: "Sort lines alphabetically, by length or numerically, with optional dedupe",
    },
    keywords: ["排序", "sort", "去重", "dedupe", "行"],
    icon: SortAsc,
  }),
  textTool({
    slug: "lorem-ipsum",
    name: { zh: "Lorem Ipsum 生成器", en: "Lorem Ipsum Generator" },
    description: {
      zh: "生成中英文占位文本，按段落、句子或单词",
      en: "Generate placeholder text in Chinese or Latin, by paragraph, sentence or word",
    },
    keywords: ["lorem", "ipsum", "占位", "假文", "placeholder"],
    icon: Pilcrow,
  }),
  textTool({
    slug: "regex-tester",
    name: { zh: "正则表达式测试", en: "Regex Tester" },
    description: {
      zh: "实时高亮匹配结果，查看捕获组并测试替换",
      en: "Highlight matches live, inspect capture groups and test replacements",
    },
    keywords: ["regex", "正则", "匹配", "match", "替换", "replace"],
    icon: Regex,
  }),
  textTool({
    slug: "text-cipher",
    name: { zh: "ROT13 / 凯撒密码", en: "ROT13 & Caesar Cipher" },
    description: {
      zh: "字符替换密码，用于解谜与趣味编码——不能用来保护数据",
      en: "Substitution ciphers for puzzles and fun — never for protecting data",
    },
    keywords: ["rot13", "凯撒", "caesar", "atbash", "加密", "cipher"],
    icon: Lock,
  }),
  textTool({
    slug: "text-encrypt",
    name: { zh: "AES-GCM 加密 / 解密", en: "AES-GCM Encrypt / Decrypt" },
    description: {
      zh: "用密码加密文本，密钥由 PBKDF2 派生，密文自带盐与 IV",
      en: "Password-based encryption with a PBKDF2-derived key; salt and IV travel with the ciphertext",
    },
    keywords: ["aes", "gcm", "加密", "解密", "encrypt", "decrypt", "pbkdf2"],
    icon: Lock,
  }),
  textTool({
    slug: "zh-convert",
    name: { zh: "简繁体转换", en: "Simplified ↔ Traditional" },
    description: {
      zh: "简体与繁体（台湾 / 香港）互转，支持词语级转换",
      en: "Convert between Simplified and Traditional Chinese (Taiwan / Hong Kong)",
    },
    keywords: ["简体", "繁体", "简繁", "opencc", "traditional", "simplified"],
    icon: Languages,
  }),
  textTool({
    slug: "pinyin",
    name: { zh: "汉字转拼音", en: "Chinese to Pinyin" },
    description: {
      zh: "带声调或不带声调，支持首字母与多种分隔方式",
      en: "Pinyin with or without tones, initials only or custom separators",
    },
    keywords: ["拼音", "pinyin", "声调", "首字母", "汉字"],
    icon: SpellCheck,
  }),
];

const datetimeTools: ToolMeta[] = [
  dateTool({
    slug: "timestamp",
    name: { zh: "Unix 时间戳转换", en: "Unix Timestamp Converter" },
    description: {
      zh: "时间戳与日期互转，秒 / 毫秒 / 微秒 / 纳秒自动识别",
      en: "Convert timestamps to dates and back, detecting seconds, milliseconds, microseconds and nanoseconds",
    },
    keywords: ["timestamp", "unix", "时间戳", "秒", "毫秒", "epoch"],
    icon: Clock,
  }),
  dateTool({
    slug: "timezone",
    name: { zh: "时区转换", en: "Time Zone Converter" },
    description: {
      zh: "同一时刻在不同时区的本地时间对比，自动处理夏令时",
      en: "Compare one instant across time zones, with daylight saving handled for you",
    },
    keywords: ["时区", "timezone", "utc", "gmt", "换算", "夏令时"],
    icon: Globe,
  }),
  dateTool({
    slug: "countdown",
    name: { zh: "倒计时 / 秒表", en: "Countdown & Stopwatch" },
    description: {
      zh: "看看距离某个时间点还有多久，或用秒表从零开始计时",
      en: "See how long is left until a moment, or run a stopwatch from zero",
    },
    keywords: ["倒计时", "countdown", "计时", "timer", "正计时"],
    icon: Timer,
  }),
  dateTool({
    slug: "cron",
    name: { zh: "Cron 表达式解析", en: "Cron Expression Parser" },
    description: {
      zh: "把 Cron 表达式翻译成中文描述，并算出接下来几次运行时间",
      en: "Explain a cron expression in plain language and list the next runs",
    },
    keywords: ["cron", "crontab", "定时", "表达式", "schedule"],
    icon: CalendarClock,
  }),
  dateTool({
    slug: "date-add",
    name: { zh: "日期加减", en: "Date Calculator" },
    description: {
      zh: "在某个日期上加减年、月、周、天或工作日",
      en: "Add or subtract years, months, weeks, days or working days",
    },
    keywords: ["日期", "加减", "date", "add", "工作日", "推算"],
    icon: CalendarPlus,
  }),
  dateTool({
    slug: "date-diff",
    name: { zh: "日期差值计算", en: "Date Difference" },
    description: {
      zh: "两个日期相差多久，含总天数、年月日拆分与工作日数",
      en: "Time between two dates: total days, a calendar breakdown and working days",
    },
    keywords: ["差值", "间隔", "diff", "天数", "工作日", "相差"],
    icon: CalendarRange,
  }),
  dateTool({
    slug: "lunar",
    name: { zh: "农历 / 公历转换", en: "Lunar ↔ Gregorian" },
    description: {
      zh: "公历与农历互转，附干支、生肖与当日节气",
      en: "Convert between Gregorian and Chinese lunar dates, with stem-branch, zodiac and solar terms",
    },
    keywords: ["农历", "阴历", "公历", "阳历", "生肖", "干支", "节气", "lunar", "chinese calendar"],
    icon: CalendarDays,
  }),
];

const hashTools: ToolMeta[] = [
  hashTool({
    slug: "hash",
    name: { zh: "哈希生成", en: "Hash Generator" },
    description: {
      zh: "MD5、SHA-1、SHA-2、SHA-3 摘要，一次算出多种算法",
      en: "MD5, SHA-1, SHA-2 and SHA-3 digests, several algorithms at once",
    },
    keywords: ["hash", "md5", "sha1", "sha256", "sha512", "sha3", "摘要", "哈希"],
    icon: Hash,
  }),
  hashTool({
    slug: "hmac",
    name: { zh: "HMAC 计算", en: "HMAC Calculator" },
    description: {
      zh: "用密钥对消息签名，支持 SHA-1 / 256 / 384 / 512",
      en: "Sign a message with a secret key using SHA-1, 256, 384 or 512",
    },
    keywords: ["hmac", "签名", "signature", "密钥", "sha256"],
    icon: KeyRound,
  }),
  hashTool({
    slug: "password-generator",
    name: { zh: "密码生成器", en: "Password Generator" },
    description: {
      zh: "密码学安全随机数生成密码，可配置长度与字符集",
      en: "Cryptographically random passwords with configurable length and character sets",
    },
    keywords: ["密码", "password", "生成", "随机", "强密码"],
    icon: Lock,
  }),
  hashTool({
    slug: "uuid",
    name: { zh: "UUID 生成", en: "UUID Generator" },
    description: {
      zh: "批量生成 UUID v4 与 v7，可去连字符、转大写",
      en: "Batch-generate UUID v4 and v7, with optional hyphens and casing",
    },
    keywords: ["uuid", "guid", "v4", "v7", "唯一标识"],
    icon: Fingerprint,
  }),
  hashTool({
    slug: "random-string",
    name: { zh: "随机字符串 / NanoID / ULID", en: "Random String, NanoID & ULID" },
    description: {
      zh: "按自定义字符集生成随机串，或生成 NanoID、ULID",
      en: "Random strings from your own alphabet, plus NanoID and ULID",
    },
    keywords: ["随机", "random", "nanoid", "ulid", "token", "令牌"],
    icon: Dices,
  }),
  hashTool({
    slug: "password-strength",
    name: { zh: "密码强度检测", en: "Password Strength" },
    description: {
      zh: "估算熵与破解时间，指出常见密码、重复与键盘序列等弱点",
      en: "Estimate entropy and crack time, and flag common passwords, repeats and keyboard runs",
    },
    keywords: ["强度", "strength", "密码", "安全", "熵"],
    icon: ShieldCheck,
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
    tools: jsonTools,
  },
  {
    id: "text",
    name: { zh: "文本处理", en: "Text" },
    description: {
      zh: "统计、大小写、去重、Diff、正则测试",
      en: "Counting, case conversion, dedupe, diff and regex testing",
    },
    icon: FileText,
    tools: textTools,
  },
  {
    id: "datetime",
    name: { zh: "时间 / 日期", en: "Date / Time" },
    description: {
      zh: "时间戳、时区、Cron、日期差值",
      en: "Timestamps, time zones, cron and date math",
    },
    icon: Clock,
    tools: datetimeTools,
  },
  {
    id: "hash",
    name: { zh: "哈希 / 安全", en: "Hash / Security" },
    description: {
      zh: "摘要、HMAC、随机串与密码强度",
      en: "Digests, HMAC, random strings and password strength",
    },
    icon: ShieldCheck,
    tools: hashTools,
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
