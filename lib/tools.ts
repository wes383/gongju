import type { LucideIcon } from "lucide-react";
import {
  Accessibility,
  AudioLines,
  BadgeDollarSign,
  Binary,
  Braces,
  CaseSensitive,
  Calculator,
  CalendarClock,
  Captions,
  ChartColumn,
  CalendarDays,
  CalendarPlus,
  CalendarRange,
  Clock,
  Code2,
  CopyCheck,
  CreditCard,
  Dices,
  Eraser,
  FileCode2,
  FileDiff,
  FileDigit,
  FileJson,
  Film,
  GitCompare,
  FileStack,
  FileText,
  Fingerprint,
  Globe,
  Hash,
  Image as ImageIcon,
  ImageDown,
  ImagePlus,
  ImageUpscale,
  Images,
  FileImage,
  FileScan,
  Info,
  Stamp,
  ScanEye,
  ScanSearch,
  Scissors,
  Grid3x3,
  Layers,
  Pipette,
  Columns2,
  Frame,
  KeyRound,
  Languages,
  ListTree,
  Link2,
  ListFilter,
  ListChecks,
  Lock,
  LockKeyhole,
  Merge,
  Palette,
  SwatchBook,
  Contrast,
  Glasses,
  Shuffle,
  Blend,
  Square,
  SquareDashed,
  SquareRoundCorner,
  LayoutGrid,
  Pilcrow,
  QrCode,
  Barcode,
  LayoutList,
  ScanQrCode,
  Regex,
  Ruler,
  ArrowLeftRight,
  Percent,
  HeartPulse,
  HardDrive,
  House,
  Landmark,
  Triangle,
  Search,
  Sigma,
  Bell,
  ChartSpline,
  Share2,
  ShieldAlert,
  ShieldCheck,
  SortAsc,
  SpellCheck,
  Timer,
  Table2,
  Terminal,
  Database,
  SquareCode,
  Server,
  FileType,
  MonitorSmartphone,
  Repeat,
  Route,
  Network,
  Rows3,
  Type,
  Cake,
  ClipboardList,
  Dice5,
  Keyboard,
  Sheet,
  FileJson2,
  Sparkles,
  TableProperties,
  Tags,
  FileTerminal,
  Ban,
  PenTool,
  AppWindow,
  FileArchive,
  FolderArchive,
  Quote,
  Banknote,
  Combine,
  FileCheck2,
  FolderCog,
  FolderSearch,
  FolderTree,
  Gauge,
  ScanText,
  Laptop,
  NotebookPen,
  Radio,
  Wallet,
  Wand2,
  Wrench,
  WrapText,
  Workflow,
  BookOpen,
  Presentation,
  LibraryBig,
  Boxes,
  SquareFunction,
  Bot,
  Blocks,
  LayoutTemplate,
  MessagesSquare,
  CircuitBoard,
  Activity,
  Zap,
  Split,
  BatteryCharging,
  Brackets,
  Camera,
  Sun,
  Focus,
  Aperture,
  FileSpreadsheet,
  GraduationCap,
  Dumbbell,
  Flame,
  Beef,
  Droplets,
  Footprints,
  Moon,
  Tag,
  BadgePercent,
  Package,
  Megaphone,
  Scale,
  Store,
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
  | "math"
  | "electronics"
  | "photography"
  | "language"
  | "health"
  | "ecommerce"
  | "pdf"
  | "office"
  | "ai"
  | "seo"
  | "subtitle"
  | "media"
  | "visualization"
  | "files"
  | "finance"
  | "privacy"
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
const imageTool = (t: Omit<ToolMeta, "category">): ToolMeta => ({ ...t, category: "image" });
const colorTool = (t: Omit<ToolMeta, "category">): ToolMeta => ({ ...t, category: "color" });
const qrTool = (t: Omit<ToolMeta, "category">): ToolMeta => ({ ...t, category: "qrcode" });
const devTool = (t: Omit<ToolMeta, "category">): ToolMeta => ({ ...t, category: "dev" });
const netTool = (t: Omit<ToolMeta, "category">): ToolMeta => ({ ...t, category: "network" });
const convertTool = (t: Omit<ToolMeta, "category">): ToolMeta => ({ ...t, category: "convert" });
const pdfTool = (t: Omit<ToolMeta, "category">): ToolMeta => ({ ...t, category: "pdf" });
const miscTool = (t: Omit<ToolMeta, "category">): ToolMeta => ({ ...t, category: "misc" });
const subtitleTool = (t: Omit<ToolMeta, "category">): ToolMeta => ({ ...t, category: "subtitle" });
const mediaTool = (t: Omit<ToolMeta, "category">): ToolMeta => ({ ...t, category: "media" });
const vizTool = (t: Omit<ToolMeta, "category">): ToolMeta => ({ ...t, category: "visualization" });
const filesTool = (t: Omit<ToolMeta, "category">): ToolMeta => ({ ...t, category: "files" });
const financeTool = (t: Omit<ToolMeta, "category">): ToolMeta => ({ ...t, category: "finance" });
const privacyTool = (t: Omit<ToolMeta, "category">): ToolMeta => ({ ...t, category: "privacy" });
const officeTool = (t: Omit<ToolMeta, "category">): ToolMeta => ({ ...t, category: "office" });
const aiTool = (t: Omit<ToolMeta, "category">): ToolMeta => ({ ...t, category: "ai" });
const seoTool = (t: Omit<ToolMeta, "category">): ToolMeta => ({ ...t, category: "seo" });
const mathTool = (t: Omit<ToolMeta, "category">): ToolMeta => ({ ...t, category: "math" });
const electronicsTool = (t: Omit<ToolMeta, "category">): ToolMeta => ({
  ...t,
  category: "electronics",
});
const photoTool = (t: Omit<ToolMeta, "category">): ToolMeta => ({ ...t, category: "photography" });
const languageTool = (t: Omit<ToolMeta, "category">): ToolMeta => ({ ...t, category: "language" });
const healthTool = (t: Omit<ToolMeta, "category">): ToolMeta => ({ ...t, category: "health" });
const ecommerceTool = (t: Omit<ToolMeta, "category">): ToolMeta => ({
  ...t,
  category: "ecommerce",
});

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
  tool({
    slug: "ascii-table",
    name: { zh: "ASCII 码表", en: "ASCII Table" },
    description: {
      zh: "0–127 与 Latin-1 的字符对照，含各进制与 HTML 实体",
      en: "Character reference for 0–127 and Latin-1, with bases and HTML entities",
    },
    keywords: ["ascii", "码表", "字符", "进制", "unicode", "table", "对照表"],
    icon: Binary,
  }),
  tool({
    slug: "morse",
    name: { zh: "摩斯电码", en: "Morse Code" },
    description: {
      zh: "文本与摩斯电码互转，可播放提示音",
      en: "Convert text to and from Morse code, with audio playback",
    },
    keywords: ["morse", "摩斯", "电码", "编码", "telegraph", "code"],
    icon: Radio,
  }),
  tool({
    slug: "braille",
    name: { zh: "盲文互转", en: "Braille Converter" },
    description: {
      zh: "中英文文本与盲文点字互转，可显示每个字符的点位编号",
      en: "Convert English or Chinese text to braille and back, with optional dot numbers",
    },
    keywords: ["braille", "盲文", "点字", "盲文翻译", "无障碍", "accessibility"],
    icon: Accessibility,
  }),
  tool({
    slug: "gzip",
    name: { zh: "GZIP 压缩 / 解压", en: "GZIP Compress / Decompress" },
    description: {
      zh: "文本与 .gz 双向转换，显示压缩率并可下载",
      en: "Convert text to gzip and back, with the ratio and a download",
    },
    keywords: ["gzip", "压缩", "解压", "deflate", "compress", "解压缩"],
    icon: FileArchive,
  }),
  tool({
    slug: "mojibake",
    name: { zh: "乱码修复 / 编码检测", en: "Mojibake Fixer" },
    description: {
      zh: "把 UTF-8 被误当成 Latin-1 或 Windows-1252 显示的乱码还原成正常文字，也能反向生成乱码用于排查",
      en: "Recover UTF-8 text that was shown as Latin-1 or Windows-1252, or reproduce mojibake on purpose",
    },
    keywords: ["mojibake", "乱码", "编码", "encoding", "utf-8", "latin1", "gbk", "charset"],
    icon: Languages,
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
  jsonTool({
    slug: "csv-table",
    name: { zh: "CSV 表格查看 / 编辑", en: "CSV Table Viewer" },
    description: {
      zh: "以表格查看并编辑 CSV / TSV，支持列统计与导出",
      en: "View and edit CSV / TSV as a table, with column stats and export",
    },
    keywords: ["csv", "tsv", "表格", "查看", "编辑", "table", "excel"],
    icon: Sheet,
  }),
  jsonTool({
    slug: "json-schema",
    name: { zh: "JSON Schema 校验 / 生成", en: "JSON Schema Validate / Generate" },
    description: {
      zh: "从 JSON 样例生成 Schema，或按 Schema 校验数据",
      en: "Generate a schema from a sample, or validate data against one",
    },
    keywords: ["json schema", "校验", "validate", "schema", "生成", "ajv"],
    icon: FileJson2,
  }),
  jsonTool({
    slug: "json-mock",
    name: { zh: "JSON Mock 数据生成", en: "JSON Mock Generator" },
    description: {
      zh: "按 Schema 批量生成模拟数据，可下载 JSON",
      en: "Generate mock rows from a schema and download them as JSON",
    },
    keywords: ["mock", "模拟数据", "假数据", "测试数据", "fake", "seed"],
    icon: Sparkles,
  }),
  jsonTool({
    slug: "json-repair",
    name: { zh: "JSON 修复", en: "JSON Repair" },
    description: {
      zh: "自动修掉注释、尾逗号、单引号、未加引号的键、全角标点与 Python 字面量，并列出改动",
      en: "Fix comments, trailing commas, single quotes, unquoted keys, full-width punctuation and Python literals, with a change list",
    },
    keywords: ["json", "repair", "fix", "修复", "尾逗号", "单引号", "注释", "语法错误"],
    icon: Wrench,
  }),
  jsonTool({
    slug: "csv-merge",
    name: { zh: "CSV 合并 / 关联", en: "CSV Merge & Join" },
    description: {
      zh: "按表头纵向追加，或按关联列做左连接 / 内连接，导出合并后的 CSV",
      en: "Stack tables by header or join them on a key column, then export the result as CSV",
    },
    keywords: ["csv", "merge", "join", "合并", "关联", "拼接", "vlookup", "tsv"],
    icon: Combine,
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
      zh: "逐行或逐词对比两段文本，标出新增与删除；改一个词时不会整行变红",
      en: "Compare two texts line by line or word by word — a single edited word no longer marks the whole line",
    },
    keywords: ["diff", "对比", "差异", "compare", "文本", "prompt 对比", "词级", "逐词"],
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
  textTool({
    slug: "regex-cheatsheet",
    name: { zh: "正则速查表", en: "Regex Cheatsheet" },
    description: {
      zh: "JavaScript 正则语法速查，按类别分组并可搜索",
      en: "Searchable JavaScript regex syntax reference, grouped by category",
    },
    keywords: ["regex", "正则", "表达式", "速查", "cheatsheet", "pattern"],
    icon: Regex,
  }),
  textTool({
    slug: "string-escape",
    name: { zh: "字符串转义 / 反转义", en: "String Escape / Unescape" },
    description: {
      zh: "JSON、JavaScript、HTML、URL 四种格式的转义与还原",
      en: "Escape and unescape JSON, JavaScript, HTML and URL strings",
    },
    keywords: ["escape", "转义", "反转义", "unescape", "反斜杠", "escape string"],
    icon: Quote,
  }),
  textTool({
    slug: "number-to-chinese",
    name: { zh: "数字转中文大写", en: "Number to Chinese" },
    description: {
      zh: "人民币金额大写与中文读法，适合发票、合同",
      en: "Financial capitals and the spoken reading, for invoices and contracts",
    },
    keywords: ["大写", "金额", "人民币", "中文数字", "rmb", "chinese number"],
    icon: Banknote,
  }),
  textTool({
    slug: "pangu",
    name: { zh: "中文排版 / 中英文加空格", en: "Chinese Typography" },
    description: {
      zh: "在汉字与英文、数字之间自动加空格，并可统一中文标点、引号与全角字符",
      en: "Insert the space Chinese typography expects between CJK and Latin text, and normalise punctuation and quotes",
    },
    keywords: ["pangu", "排版", "空格", "中英文", "标点", "引号", "typography", "spacing"],
    icon: Type,
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
    name: { zh: "Cron 表达式解析/生成", en: "Cron Parser / Builder" },
    description: {
      zh: "把 Cron 表达式翻译成中文描述并算出接下来几次运行，也能用可视化选项反推出表达式",
      en: "Explain a cron expression and list the next runs, or build one with visual pickers",
    },
    keywords: ["cron", "crontab", "定时", "表达式", "schedule", "生成", "builder"],
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
  dateTool({
    slug: "age",
    name: { zh: "年龄计算器", en: "Age Calculator" },
    description: {
      zh: "按日期算出周岁、总天数、下次生日与星座",
      en: "Work out exact age, days lived, next birthday and zodiac sign",
    },
    keywords: ["age", "年龄", "生日", "周岁", "birthday", "zodiac", "星座"],
    icon: Cake,
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
  hashTool({
    slug: "totp",
    name: { zh: "TOTP 验证码", en: "TOTP Generator" },
    description: {
      zh: "用 Base32 密钥或 otpauth 链接生成动态验证码，并校验输入是否正确",
      en: "Generate time-based one-time passwords from a Base32 secret or otpauth URI, and verify a code",
    },
    keywords: ["totp", "otp", "2fa", "验证码", "动态口令", "authenticator", "otpauth", "google authenticator"],
    icon: KeyRound,
  }),
];

const imageTools: ToolMeta[] = [
  imageTool({
    slug: "text-to-image",
    name: { zh: "文字转图片", en: "Text to Image" },
    description: {
      zh: "把一段文字排成图片，尺寸、配色、字号与边距都可调，支持纯色背景，长文自动压成一整张并导出 PNG / JPEG",
      en: "Lay text out as an image with your own size, palette, type scale and margins, solid backgrounds included, exported as PNG or JPEG",
    },
    keywords: ["文字转图片", "长图", "文字卡片", "语录", "朋友圈", "text to image", "quote card", "poster"],
    icon: Type,
  }),
  imageTool({
    slug: "image-compress",
    name: { zh: "图片压缩", en: "Image Compressor" },
    description: {
      zh: "压缩到指定体积，可限制最大边长，支持批量与打包下载",
      en: "Compress to a target size, cap the longest edge, batch it and download a zip",
    },
    keywords: ["压缩", "compress", "图片压缩", "瘦身", "kb", "webp"],
    icon: ImageDown,
  }),
  imageTool({
    slug: "image-convert",
    name: { zh: "图片格式转换", en: "Image Converter" },
    description: {
      zh: "JPG / PNG / WebP / AVIF 批量互转，可调质量",
      en: "Batch convert between JPG, PNG, WebP and AVIF with adjustable quality",
    },
    keywords: ["格式", "convert", "jpg", "png", "webp", "avif", "转换"],
    icon: ImagePlus,
  }),
  imageTool({
    slug: "image-resize",
    name: { zh: "图片缩放 / 裁剪", en: "Resize & Crop" },
    description: {
      zh: "按尺寸缩放或按比例裁剪，附常用与证件照预设",
      en: "Scale to exact dimensions or crop to a ratio, with common and ID-photo presets",
    },
    keywords: ["缩放", "裁剪", "resize", "crop", "尺寸", "证件照", "一寸"],
    icon: ImageUpscale,
  }),
  imageTool({
    slug: "image-base64",
    name: { zh: "图片转 Base64", en: "Image to Base64" },
    description: {
      zh: "图片与 Base64 / Data URL / CSS 互转，也能把 Base64 还原成图片",
      en: "Convert images to Base64, Data URLs or CSS, and turn Base64 back into an image",
    },
    keywords: ["base64", "data url", "图片", "内联", "image"],
    icon: FileImage,
  }),
  imageTool({
    slug: "image-watermark",
    name: { zh: "图片加水印", en: "Image Watermark" },
    description: {
      zh: "文字水印，可调位置、透明度、旋转与平铺",
      en: "Add a text watermark with position, opacity, rotation and tiling controls",
    },
    keywords: ["水印", "watermark", "版权", "文字", "平铺"],
    icon: Stamp,
  }),
  imageTool({
    slug: "image-exif",
    name: { zh: "EXIF 查看 / 清除", en: "EXIF Viewer & Remover" },
    description: {
      zh: "读取相机、拍摄参数与 GPS 坐标，一键去除全部元数据",
      en: "Read camera, exposure and GPS data, then strip every metadata block in one click",
    },
    keywords: ["exif", "元数据", "gps", "隐私", "拍摄参数", "清除"],
    icon: ScanEye,
  }),
  imageTool({
    slug: "image-split",
    name: { zh: "九宫格切图", en: "Image Grid Splitter" },
    description: {
      zh: "按行列把图片切成等分小块，打包下载",
      en: "Cut an image into equal tiles by rows and columns, then download them as a zip",
    },
    keywords: ["九宫格", "切图", "split", "grid", "朋友圈", "拼图"],
    icon: Grid3x3,
  }),
  imageTool({
    slug: "image-collage",
    name: { zh: "长图拼接", en: "Image Stitcher" },
    description: {
      zh: "多张图片纵向或横向拼成一张长图，可调间距与对齐",
      en: "Stitch several images into one long picture, vertically or horizontally",
    },
    keywords: ["拼接", "长图", "collage", "merge", "合并", "拼图"],
    icon: Layers,
  }),
  imageTool({
    slug: "image-color",
    name: { zh: "图片取色", en: "Color Picker from Image" },
    description: {
      zh: "点击取色，自动提取主要颜色与 HEX / RGB / HSL",
      en: "Click to sample a pixel, and extract the dominant palette with HEX, RGB and HSL",
    },
    keywords: ["取色", "color", "palette", "配色", "吸管", "主色"],
    icon: Pipette,
  }),
  imageTool({
    slug: "image-compare",
    name: { zh: "图片对比", en: "Image Compare" },
    description: {
      zh: "拖动分割线对比两张图，或并排查看",
      en: "Drag a divider to compare two images, or view them side by side",
    },
    keywords: ["对比", "compare", "差异", "修图", "before after"],
    icon: Columns2,
  }),
  imageTool({
    slug: "image-frame",
    name: { zh: "图片圆角 / 边框", en: "Rounded Corners & Border" },
    description: {
      zh: "给图片加圆角、边框、留白与阴影，导出 PNG",
      en: "Round the corners, add a border, padding or shadow, and export as PNG",
    },
    keywords: ["圆角", "边框", "frame", "圆角图片", "阴影", "留白"],
    icon: Frame,
  }),
  imageTool({
    slug: "svg",
    name: { zh: "SVG 优化 / 转 PNG", en: "SVG Optimise / PNG" },
    description: {
      zh: "去掉注释与冗余数值，并导出 PNG",
      en: "Strip comments and verbose numbers, then export PNG",
    },
    keywords: ["svg", "优化", "压缩", "png", "optimize", "转换"],
    icon: PenTool,
  }),
  imageTool({
    slug: "favicon",
    name: { zh: "Favicon 生成器", en: "Favicon Generator" },
    description: {
      zh: "从一张图片生成多尺寸 favicon 与 .ico",
      en: "Generate every favicon size plus .ico from one image",
    },
    keywords: ["favicon", "ico", "图标", "icon", "apple-touch-icon"],
    icon: AppWindow,
  }),
  imageTool({
    slug: "image-mosaic",
    name: { zh: "图片打码 / 马赛克", en: "Image Redaction" },
    description: {
      zh: "框选截图里的手机号、身份证、人脸，一键马赛克、模糊或纯色遮盖，按原图分辨率导出",
      en: "Box out phone numbers, IDs or faces in a screenshot and hide them with mosaic, blur or a solid block",
    },
    keywords: ["mosaic", "打码", "马赛克", "模糊", "遮挡", "脱敏", "redact", "blur", "privacy"],
    icon: ScanEye,
  }),
];

const colorTools: ToolMeta[] = [
  colorTool({
    slug: "color-converter",
    name: { zh: "颜色转换器", en: "Color Converter" },
    description: {
      zh: "HEX / RGB / HSL / HSV / CMYK 互转，粘贴任意写法都能识别",
      en: "Convert between HEX, RGB, HSL, HSV and CMYK — paste any notation",
    },
    keywords: ["颜色", "color", "hex", "rgb", "hsl", "hsv", "cmyk", "转换"],
    icon: Palette,
  }),
  colorTool({
    slug: "color-palette",
    name: { zh: "调色板生成", en: "Color Palette" },
    description: {
      zh: "按互补、类似、三角等规则生成和谐配色，并导出 CSS 变量",
      en: "Generate harmonious palettes — complementary, analogous, triadic and more — with CSS variables",
    },
    keywords: ["配色", "调色板", "palette", "和谐色", "互补", "scheme"],
    icon: SwatchBook,
  }),
  colorTool({
    slug: "contrast-checker",
    name: { zh: "对比度检查", en: "Contrast Checker" },
    description: {
      zh: "按 WCAG 计算文字与背景的对比度，标注 AA / AAA 是否达标",
      en: "WCAG contrast ratio between text and background, with AA and AAA verdicts",
    },
    keywords: ["对比度", "contrast", "wcag", "无障碍", "a11y", "可读性"],
    icon: Contrast,
  }),
  colorTool({
    slug: "color-blindness",
    name: { zh: "色盲模拟", en: "Color Blindness" },
    description: {
      zh: "模拟红色盲、绿色盲、蓝色盲与全色盲下的颜色表现",
      en: "See a colour as protanopia, deuteranopia, tritanopia and achromatopsia would",
    },
    keywords: ["色盲", "色弱", "color blindness", "无障碍", "模拟"],
    icon: Glasses,
  }),
  colorTool({
    slug: "random-color",
    name: { zh: "随机颜色", en: "Random Colors" },
    description: {
      zh: "批量生成随机颜色，可切换 HEX / RGB / HSL 输出",
      en: "Batch-generate random colours and copy them as HEX, RGB or HSL",
    },
    keywords: ["随机颜色", "random", "配色", "色板", "生成"],
    icon: Shuffle,
  }),
  colorTool({
    slug: "gradient",
    name: { zh: "渐变生成器", en: "Gradient Generator" },
    description: {
      zh: "线性 / 径向 / 锥形渐变，可加色标并复制 CSS",
      en: "Linear, radial and conic gradients with editable stops and copy-ready CSS",
    },
    keywords: ["渐变", "gradient", "linear", "radial", "css", "背景"],
    icon: Blend,
  }),
  colorTool({
    slug: "box-shadow",
    name: { zh: "阴影生成器", en: "Shadow Generator" },
    description: {
      zh: "可视化调盒阴影与文字阴影，支持 inset",
      en: "Tune box and text shadows visually, with inset support",
    },
    keywords: ["阴影", "shadow", "box-shadow", "text-shadow", "css"],
    icon: SquareRoundCorner,
  }),
  colorTool({
    slug: "glassmorphism",
    name: { zh: "毛玻璃生成器", en: "Glassmorphism" },
    description: {
      zh: "调毛玻璃效果：模糊、透明度、描边与圆角",
      en: "Build a glassmorphism panel: blur, opacity, border and radius",
    },
    keywords: ["毛玻璃", "glassmorphism", "blur", "backdrop-filter", "css"],
    icon: Layers,
  }),
  colorTool({
    slug: "border-radius",
    name: { zh: "圆角生成器", en: "Border Radius" },
    description: {
      zh: "四角独立调节圆角，实时预览并复制 CSS",
      en: "Adjust each corner independently with a live preview and copy-ready CSS",
    },
    keywords: ["圆角", "border-radius", "css", "圆角图片"],
    icon: Square,
  }),
  colorTool({
    slug: "flexbox",
    name: { zh: "Flexbox / Grid 可视化", en: "Flexbox & Grid Playground" },
    description: {
      zh: "可视化调整对齐、换行与间距，生成布局 CSS",
      en: "Tune direction, wrap, alignment and gap visually, then copy the layout CSS",
    },
    keywords: ["flexbox", "grid", "布局", "对齐", "css", "justify"],
    icon: LayoutGrid,
  }),
  colorTool({
    slug: "css-unit",
    name: { zh: "CSS 单位转换", en: "CSS Unit Converter" },
    description: {
      zh: "px / rem / em / pt / % 等单位互转，可设根字号",
      en: "Convert between px, rem, em, pt and % with a configurable root size",
    },
    keywords: ["单位", "px", "rem", "em", "pt", "css", "换算"],
    icon: Ruler,
  }),
];

const qrcodeTools: ToolMeta[] = [
  qrTool({
    slug: "qrcode",
    name: { zh: "二维码生成", en: "QR Code Generator" },
    description: {
      zh: "文本、网址、WiFi、名片二维码，可调颜色与 Logo，导出 PNG / SVG",
      en: "QR codes for text, URLs, WiFi and vCards, with custom colours, a logo and PNG / SVG export",
    },
    keywords: ["二维码", "qrcode", "生成", "wifi", "名片", "vcard"],
    icon: QrCode,
  }),
  qrTool({
    slug: "qrcode-reader",
    name: { zh: "二维码识别", en: "QR Code Reader" },
    description: {
      zh: "上传图片或开启摄像头识别二维码内容",
      en: "Decode a QR code from an image or a live camera feed",
    },
    keywords: ["识别", "扫码", "二维码", "scanner", "camera", "decode"],
    icon: ScanQrCode,
  }),
  qrTool({
    slug: "barcode",
    name: { zh: "条形码生成", en: "Barcode Generator" },
    description: {
      zh: "Code128、EAN-13、UPC、Code39 等格式，可调尺寸与颜色",
      en: "Code128, EAN-13, UPC, Code39 and more, with adjustable size and colours",
    },
    keywords: ["条形码", "barcode", "ean13", "code128", "upc", "code39"],
    icon: Barcode,
  }),
  qrTool({
    slug: "qrcode-batch",
    name: { zh: "批量二维码", en: "Batch QR Codes" },
    description: {
      zh: "一行一条内容，批量生成并打包下载",
      en: "One item per line, generate them all and download a zip",
    },
    keywords: ["批量", "二维码", "batch", "打包", "qrcode"],
    icon: LayoutList,
  }),
];

const devTools: ToolMeta[] = [
  devTool({
    slug: "sql-format",
    name: { zh: "SQL 格式化", en: "SQL Formatter" },
    description: {
      zh: "按方言美化 SQL，或去掉注释与空白压缩成一行",
      en: "Pretty-print SQL for your dialect, or strip comments and whitespace",
    },
    keywords: ["sql", "格式化", "format", "压缩", "mysql", "postgresql"],
    icon: Database,
  }),
  devTool({
    slug: "code-format",
    name: { zh: "代码格式化 / 压缩", en: "Code Formatter" },
    description: {
      zh: "JavaScript、CSS、HTML 的格式化与安全压缩",
      en: "Format and safely minify JavaScript, CSS and HTML",
    },
    keywords: ["格式化", "压缩", "beautify", "minify", "js", "css", "html"],
    icon: SquareCode,
  }),
  devTool({
    slug: "http-status",
    name: { zh: "HTTP 状态码查询", en: "HTTP Status Codes" },
    description: {
      zh: "按编号或关键字查询状态码含义与常见成因",
      en: "Look up status codes by number or keyword, with what usually causes them",
    },
    keywords: ["http", "状态码", "status", "404", "500", "301"],
    icon: Server,
  }),
  devTool({
    slug: "mime-type",
    name: { zh: "MIME 类型查询", en: "MIME Type Lookup" },
    description: {
      zh: "按扩展名或类型名查询 MIME 类型与用途",
      en: "Find a MIME type by extension or name, with what it is used for",
    },
    keywords: ["mime", "content-type", "扩展名", "类型", "文件"],
    icon: FileType,
  }),
  devTool({
    slug: "ua-parser",
    name: { zh: "User-Agent 解析", en: "User-Agent Parser" },
    description: {
      zh: "把 UA 字符串拆成浏览器、内核、系统与设备",
      en: "Break a UA string into browser, engine, OS and device",
    },
    keywords: ["ua", "user-agent", "解析", "浏览器", "设备"],
    icon: MonitorSmartphone,
  }),
  devTool({
    slug: "ua-generator",
    name: { zh: "随机 User-Agent", en: "Random User-Agent" },
    description: {
      zh: "按浏览器与系统筛选，批量生成真实 UA 字符串",
      en: "Generate real UA strings, filtered by browser and OS",
    },
    keywords: ["ua", "user-agent", "随机", "生成", "爬虫"],
    icon: Repeat,
  }),
  devTool({
    slug: "key-event",
    name: { zh: "键盘按键查看", en: "Key Event Inspector" },
    description: {
      zh: "查看按键的 key、code、keyCode 与修饰键状态",
      en: "Inspect the key, code, keyCode and modifiers of any keystroke",
    },
    keywords: ["keyboard", "键盘", "按键", "keycode", "event", "快捷键"],
    icon: Keyboard,
  }),
  devTool({
    slug: "device-info",
    name: { zh: "设备信息", en: "Device Info" },
    description: {
      zh: "查看屏幕、视口、设备、显卡、网络、存储与权限等浏览器暴露的信息",
      en: "Inspect screen, viewport, device, GPU, network, storage and permission details",
    },
    keywords: ["device", "屏幕", "分辨率", "视口", "dpr", "ua", "设备", "gpu", "webgl", "权限", "存储"],
    icon: Laptop,
  }),
  devTool({
    slug: "sql-generate",
    name: { zh: "SQL 生成器", en: "SQL Generator" },
    description: {
      zh: "把 CSV 转成 CREATE TABLE 与 INSERT 语句",
      en: "Turn CSV into CREATE TABLE and INSERT statements",
    },
    keywords: ["sql", "insert", "create table", "建表", "导出", "mysql"],
    icon: TableProperties,
  }),
  devTool({
    slug: "gitignore",
    name: { zh: ".gitignore 生成器", en: ".gitignore Generator" },
    description: {
      zh: "按语言、编辑器、系统组合生成 .gitignore",
      en: "Compose a .gitignore from language, editor and OS blocks",
    },
    keywords: ["gitignore", "git", "忽略", "ignore", "模板"],
    icon: Ban,
  }),
  devTool({
    slug: "meta-tags",
    name: { zh: "Meta / OG 标签生成与预览", en: "Meta & OG Tags" },
    description: {
      zh: "生成 title、description、Open Graph 与 Twitter 标签，预览搜索结果和社交卡片，并检查长度问题",
      en: "Build title, description, Open Graph and Twitter tags, preview the search result and social cards, and audit lengths",
    },
    keywords: ["meta", "og", "open graph", "twitter card", "seo", "tdk", "标签", "预览"],
    icon: Tags,
  }),
];

const networkTools: ToolMeta[] = [
  netTool({
    slug: "url-parser",
    name: { zh: "URL 解析", en: "URL Parser" },
    description: {
      zh: "拆出协议、域名、端口、路径、锚点，查询参数逐条解码展示",
      en: "Break a URL into scheme, host, port, path, fragment and decoded query pairs",
    },
    keywords: ["url", "解析", "query", "参数", "pathname", "域名"],
    icon: Route,
  }),
  netTool({
    slug: "ip",
    name: { zh: "IP 地址 / 网段工具", en: "IP & CIDR Tool" },
    description: {
      zh: "校验 IPv4 / IPv6，给出二进制、十六进制与网段、掩码、可用主机范围",
      en: "Validate IPv4 and IPv6, with binary, hex, CIDR, mask and usable host range",
    },
    keywords: ["ip", "ipv4", "ipv6", "cidr", "子网", "掩码", "网段"],
    icon: Network,
  }),
  netTool({
    slug: "http-header",
    name: { zh: "HTTP Header 解析 / 生成", en: "HTTP Header Parser / Builder" },
    description: {
      zh: "把原始请求头拆成表格并给出 curl，或按常用头一键拼出表达式",
      en: "Turn a raw header block into a table plus a curl command, or build one from presets",
    },
    keywords: ["header", "请求头", "响应头", "cors", "curl", "http"],
    icon: Rows3,
  }),
  netTool({
    slug: "curl-to-code",
    name: { zh: "cURL 转代码", en: "cURL to Code" },
    description: {
      zh: "把 curl 命令转成 fetch、axios、Python 或 Go 代码",
      en: "Turn a curl command into fetch, axios, Python or Go code",
    },
    keywords: ["curl", "fetch", "axios", "python", "go", "请求"],
    icon: FileTerminal,
  }),
];


const convertTools: ToolMeta[] = [
  convertTool({
    slug: "unit-convert",
    name: { zh: "单位换算", en: "Unit Converter" },
    description: {
      zh: "长度、重量、温度、面积、体积、速度、压力、能量、功率九类单位互转",
      en: "Convert length, mass, temperature, area, volume, speed, pressure, energy and power",
    },
    keywords: ["单位", "换算", "长度", "重量", "温度", "面积", "体积", "速度", "unit"],
    icon: ArrowLeftRight,
  }),
  convertTool({
    slug: "percentage",
    name: { zh: "百分比计算", en: "Percentage Calculator" },
    description: {
      zh: "占比、百分比值、变化率与增减四种算法，附公式说明",
      en: "Share, percent of a number, change rate and increase/decrease, with the formula shown",
    },
    keywords: ["百分比", "占比", "变化率", "增长", "percentage", "percent"],
    icon: Percent,
  }),
  convertTool({
    slug: "bmi",
    name: { zh: "BMI 计算", en: "BMI Calculator" },
    description: {
      zh: "按 WHO 与中国标准计算 BMI、分级和对应身高的正常体重区间",
      en: "BMI, its band and the healthy weight range, under both WHO and Chinese standards",
    },
    keywords: ["bmi", "体重", "身高", "肥胖", "健康", "weight"],
    icon: HeartPulse,
  }),
  convertTool({
    slug: "data-size",
    name: { zh: "文件大小换算", en: "Data Size Converter" },
    description: {
      zh: "字节、KB 与 KiB 互转，看清 1000 进制与 1024 进制的差别",
      en: "Convert bytes, KB and KiB, and see where decimal and binary units diverge",
    },
    keywords: ["字节", "kb", "mb", "gb", "kib", "存储", "文件大小", "byte"],
    icon: HardDrive,
  }),
  convertTool({
    slug: "angle",
    name: { zh: "角度换算", en: "Angle Converter" },
    description: {
      zh: "度、弧度、百分度、圈、角分、角秒互转，并给出 sin / cos / tan",
      en: "Convert degrees, radians, gradians, turns and arc units, with sin / cos / tan",
    },
    keywords: ["角度", "弧度", "度", "rad", "deg", "三角函数", "angle"],
    icon: Triangle,
  }),
  convertTool({
    slug: "data-speed",
    name: { zh: "数据传输速度换算", en: "Data Transfer Speed" },
    description: {
      zh: "Mbit/s 与 MB/s 互转，并估算文件下载耗时",
      en: "Convert between Mbit/s and MB/s, and estimate how long a download takes",
    },
    keywords: ["网速", "mbps", "mb/s", "带宽", "下载速度", "speed"],
    icon: Gauge,
  }),
];

const pdfTools: ToolMeta[] = [
  pdfTool({
    slug: "pdf-merge",
    name: { zh: "PDF 合并", en: "Merge PDFs" },
    description: {
      zh: "把多个 PDF 按顺序拼成一个文件，可调整先后次序",
      en: "Join several PDFs into one file, in the order you choose",
    },
    keywords: ["pdf", "合并", "拼接", "merge", "combine", "join"],
    icon: Merge,
  }),
  pdfTool({
    slug: "pdf-split",
    name: { zh: "PDF 拆分", en: "Split PDF" },
    description: {
      zh: "每 N 页拆一份，或按页码范围拆成多个文件",
      en: "Split every N pages, or cut along custom page ranges",
    },
    keywords: ["pdf", "拆分", "分割", "分页", "split", "extract"],
    icon: Scissors,
  }),
  pdfTool({
    slug: "pdf-organize",
    name: { zh: "PDF 页面整理", en: "Organize PDF Pages" },
    description: {
      zh: "缩略图预览，旋转或删除任意页面后导出",
      en: "Preview thumbnails, rotate or delete pages, then export",
    },
    keywords: ["pdf", "旋转", "删除页面", "排序", "rotate", "delete", "organize"],
    icon: FileStack,
  }),
  pdfTool({
    slug: "images-to-pdf",
    name: { zh: "图片转 PDF", en: "Images to PDF" },
    description: {
      zh: "多张图片合成一个 PDF，可设置页面尺寸与页边距",
      en: "Combine images into one PDF with a choice of page size and margins",
    },
    keywords: ["图片", "转pdf", "合成", "jpg", "png", "images", "to pdf"],
    icon: Images,
  }),
  pdfTool({
    slug: "pdf-to-image",
    name: { zh: "PDF 转图片", en: "PDF to Images" },
    description: {
      zh: "按指定 DPI 把页面渲染成 PNG / JPEG，支持页码筛选",
      en: "Rasterise pages to PNG or JPEG at a chosen DPI, with page filtering",
    },
    keywords: ["pdf", "转图片", "截图", "png", "jpg", "dpi", "render"],
    icon: FileImage,
  }),
  pdfTool({
    slug: "pdf-watermark",
    name: { zh: "PDF 加水印", en: "Watermark PDF" },
    description: {
      zh: "给页面叠加文字水印，支持中文、平铺、旋转与透明度",
      en: "Stamp text watermarks with tiling, rotation and opacity, Chinese included",
    },
    keywords: ["pdf", "水印", "标记", "watermark", "stamp"],
    icon: Stamp,
  }),
  pdfTool({
    slug: "pdf-metadata",
    name: { zh: "PDF 元数据", en: "PDF Metadata" },
    description: {
      zh: "查看页数、尺寸与版本，并编辑标题、作者等信息",
      en: "Inspect pages, size and version, then edit title, author and more",
    },
    keywords: ["pdf", "元数据", "属性", "标题", "作者", "metadata", "info"],
    icon: FileDigit,
  }),
  pdfTool({
    slug: "pdf-text",
    name: { zh: "PDF 文本提取", en: "Extract PDF Text" },
    description: {
      zh: "把 PDF 里的文字层提取成纯文本，可下载 .txt",
      en: "Pull the text layer out of a PDF and download it as plain text",
    },
    keywords: ["pdf", "提取文字", "文本", "extract text", "txt", "复制"],
    icon: ScanText,
  }),
  pdfTool({
    slug: "pdf-compress",
    name: { zh: "PDF 压缩", en: "Compress PDF" },
    description: {
      zh: "按页面重新渲染成 JPEG 来压缩体积，可调精度、质量与灰度，压缩前后体积直观对比",
      en: "Shrink a PDF by re-rendering each page as JPEG, with adjustable DPI, quality and grayscale, before/after sizes shown",
    },
    keywords: ["pdf", "compress", "压缩", "体积", "瘦身", "缩小", "optimize"],
    icon: FileArchive,
  }),
];

const miscTools: ToolMeta[] = [
  miscTool({
    slug: "random-number",
    name: { zh: "随机数生成器", en: "Random Number Generator" },
    description: {
      zh: "按范围和数量生成随机整数或小数，可要求不重复",
      en: "Generate random integers or decimals across a range, optionally unique",
    },
    keywords: ["random", "number", "随机数", "随机", "integer", "decimal", "生成"],
    icon: Dice5,
  }),
  miscTool({
    slug: "dice",
    name: { zh: "掷骰子 / 抽签", en: "Dice & Draw" },
    description: {
      zh: "掷任意面数的骰子，或从名单里随机抽出几个人",
      en: "Roll dice with any number of sides, or draw names from a list",
    },
    keywords: ["dice", "骰子", "抽签", "随机", "roll", "draw", "lottery"],
    icon: Dices,
  }),
  miscTool({
    slug: "clipboard-history",
    name: { zh: "剪贴板历史", en: "Clipboard History" },
    description: {
      zh: "记录本页复制粘贴过的文本，随时回取",
      en: "Keep the text you copied or pasted on this page, ready to reuse",
    },
    keywords: ["clipboard", "剪贴板", "历史", "paste", "copy", "粘贴", "复制"],
    icon: ClipboardList,
  }),
  miscTool({
    slug: "notes",
    name: { zh: "记事本", en: "Notepad" },
    description: {
      zh: "保存在本机的多标签笔记，支持搜索与导出",
      en: "Local notes with search and export, saved on this device",
    },
    keywords: ["notes", "记事本", "笔记", "notepad", "memo", "便签"],
    icon: NotebookPen,
  }),
  miscTool({
    slug: "card-luhn",
    name: { zh: "银行卡号校验", en: "Card Number Check" },
    description: {
      zh: "用 Luhn 算法校验银行卡号，识别卡组织并查看逐位计算过程",
      en: "Validate card numbers with the Luhn algorithm, detect the issuer and see the per-digit math",
    },
    keywords: ["card", "credit", "luhn", "银行卡", "信用卡", "校验", "卡号", "mod10"],
    icon: CreditCard,
  }),
];

const mathTools: ToolMeta[] = [
  mathTool({
    slug: "calculator",
    name: { zh: "科学计算器", en: "Scientific Calculator" },
    description: {
      zh: "支持三角函数、对数、阶乘与常量的表达式计算器",
      en: "Expression calculator with trigonometry, logs, factorials and constants",
    },
    keywords: ["calculator", "计算器", "科学", "sin", "log", "math", "表达式", "阶乘", "三角"],
    icon: Calculator,
  }),
  mathTool({
    slug: "function-plot",
    name: { zh: "函数图像", en: "Function Plotter" },
    description: {
      zh: "输入一条或多条表达式，实时绘制函数图像并导出 SVG / PNG",
      en: "Plot one or more expressions and export the chart as SVG or PNG",
    },
    keywords: ["函数", "图像", "绘图", "曲线", "plot", "graph", "sin", "抛物线", "坐标轴"],
    icon: ChartSpline,
  }),
  mathTool({
    slug: "matrix-calc",
    name: { zh: "矩阵计算", en: "Matrix Calculator" },
    description: {
      zh: "矩阵乘法、加减、转置、行列式、逆矩阵、秩与迹",
      en: "Matrix multiplication, addition, transpose, determinant, inverse, rank and trace",
    },
    keywords: ["矩阵", "matrix", "行列式", "det", "逆矩阵", "转置", "秩", "线性代数"],
    icon: Grid3x3,
  }),
  mathTool({
    slug: "statistics",
    name: { zh: "描述统计", en: "Descriptive Statistics" },
    description: {
      zh: "平均值、中位数、分位数、标准差、偏度峰度与异常值，附直方图",
      en: "Mean, median, quartiles, spread, shape and outliers for a column of numbers, with a histogram",
    },
    keywords: ["统计", "平均值", "中位数", "标准差", "方差", "分位数", "异常值", "statistics"],
    icon: ChartColumn,
  }),
  mathTool({
    slug: "distribution",
    name: { zh: "概率分布", en: "Probability Distributions" },
    description: {
      zh: "正态、二项、泊松、指数与均匀分布的密度、累积概率与分位数",
      en: "Density, cumulative probability and quantiles for the five common distributions",
    },
    keywords: ["概率", "分布", "正态", "二项", "泊松", "分位数", "p 值", "normal", "cdf"],
    icon: Bell,
  }),
  mathTool({
    slug: "combinatorics",
    name: { zh: "排列组合", en: "Permutations & Combinations" },
    description: {
      zh: "一次算出排列、组合、可重复选取、阶乘、错排与卡特兰数，每一位都精确",
      en: "Permutations, combinations, sampling with repetition, factorials, derangements and Catalan numbers, exact to the last digit",
    },
    keywords: [
      "排列",
      "组合",
      "阶乘",
      "错排",
      "卡特兰",
      "贝尔数",
      "斯特林",
      "permutation",
      "combination",
      "ncr",
      "npr",
      "factorial",
      "概率",
    ],
    icon: Boxes,
  }),
  mathTool({
    slug: "latex-preview",
    name: { zh: "LaTeX 预览", en: "LaTeX Preview" },
    description: {
      zh: "输入 LaTeX 公式实时渲染，支持文档混排、MathML 复制与常用片段",
      en: "Render LaTeX as you type, with mixed prose, MathML copy and a snippet palette",
    },
    keywords: ["latex", "tex", "公式", "数学公式", "katex", "mathml", "编辑器", "渲染", "markdown"],
    icon: SquareFunction,
  }),
];

const electronicsTools: ToolMeta[] = [
  electronicsTool({
    slug: "resistor-color",
    name: { zh: "电阻色环计算", en: "Resistor Color Code" },
    description: {
      zh: "4 / 5 / 6 环色环读阻值或反查色环，带误差范围与温度系数",
      en: "Read a 4, 5 or 6-band resistor, or turn a value back into bands, with tolerance and tempco",
    },
    keywords: ["电阻", "色环", "色环电阻", "阻值", "resistor", "color code", "欧姆", "误差"],
    icon: Activity,
  }),
  electronicsTool({
    slug: "ohms-law",
    name: { zh: "欧姆定律计算", en: "Ohm's Law Calculator" },
    description: {
      zh: "填入电压、电流、电阻、功率中的任意两个，算出另外两个",
      en: "Enter any two of voltage, current, resistance and power to derive the rest",
    },
    keywords: ["欧姆定律", "电压", "电流", "电阻", "功率", "ohm", "voltage", "current", "watt"],
    icon: Zap,
  }),
  electronicsTool({
    slug: "voltage-divider",
    name: { zh: "分压器计算", en: "Voltage Divider" },
    description: {
      zh: "两电阻分压的输出电压、电流与功耗，可带负载并对比空载",
      en: "Output voltage, current and dissipation for a two-resistor divider, with an optional load",
    },
    keywords: ["分压", "分压器", "电阻分压", "divider", "vout", "偏置", "采样"],
    icon: Split,
  }),
  electronicsTool({
    slug: "battery-life",
    name: { zh: "电池续航估算", en: "Battery Life" },
    description: {
      zh: "按容量与平均电流或功率估算续航，含可用容量与标称能量",
      en: "Estimate runtime from capacity and average current or power, with usable capacity and energy",
    },
    keywords: ["电池", "续航", "mAh", "功耗", "待机", "battery", "runtime", "放电"],
    icon: BatteryCharging,
  }),
  electronicsTool({
    slug: "pcb-trace",
    name: { zh: "PCB 线宽载流", en: "PCB Trace Width" },
    description: {
      zh: "按 IPC-2221 由电流和允许温升算线宽，附压降、损耗与反查载流",
      en: "IPC-2221 trace width from current and allowed temperature rise, with drop, loss and reverse lookup",
    },
    keywords: ["pcb", "线宽", "载流", "走线", "覆铜", "ipc-2221", "trace", "ampacity", "温升"],
    icon: CircuitBoard,
  }),
  electronicsTool({
    slug: "serial-checksum",
    name: { zh: "串口校验和计算", en: "Serial Checksum" },
    description: {
      zh: "一帧数据同时算出 SUM8、XOR8、LRC 与常见 CRC-8 / CRC-16",
      en: "Compute SUM8, XOR8, LRC and the common CRC-8 / CRC-16 variants for one frame",
    },
    keywords: ["校验和", "crc", "crc16", "crc8", "modbus", "nmea", "串口", "checksum", "lrc"],
    icon: Brackets,
  }),
];

const photoTools: ToolMeta[] = [
  photoTool({
    slug: "exposure",
    name: { zh: "曝光计算 / 等效曝光", en: "Exposure Calculator" },
    description: {
      zh: "由光圈、快门与 ISO 算出 EV，并给出各档光圈下曝光量相同的快门组合",
      en: "Get the EV from aperture, shutter and ISO, plus the shutter that keeps the same exposure at every aperture",
    },
    keywords: ["曝光", "ev", "等效曝光", "光圈", "快门", "iso", "阳光十六", "exposure"],
    icon: Sun,
  }),
  photoTool({
    slug: "depth-of-field",
    name: { zh: "景深 / 超焦距", en: "Depth of Field" },
    description: {
      zh: "按焦距、光圈、对焦距离与画幅算景深与超焦距，附清晰范围示意图",
      en: "Depth of field and hyperfocal distance from focal length, aperture, focus distance and sensor, with a range chart",
    },
    keywords: ["景深", "超焦距", "弥散圆", "对焦", "dof", "hyperfocal", "虚化", "画幅"],
    icon: Focus,
  }),
  photoTool({
    slug: "nd-filter",
    name: { zh: "ND 减光镜快门换算", en: "ND Filter Shutter" },
    description: {
      zh: "按减光档数或 ND 倍率换算长曝光快门，附常见滤镜对照表",
      en: "Convert a shutter speed through any ND filter, by factor or by stops, with a comparison table",
    },
    keywords: ["nd", "减光镜", "中灰镜", "长曝光", "慢门", "nd1000", "滤镜", "曝光"],
    icon: Aperture,
  }),
  photoTool({
    slug: "print-size",
    name: { zh: "打印尺寸 / DPI", en: "Print Size & DPI" },
    description: {
      zh: "像素与 DPI 换算打印尺寸，并列出常见纸张上的实际精度",
      en: "Turn pixels and DPI into a physical print size, and check the ppi on common papers",
    },
    keywords: ["dpi", "ppi", "打印尺寸", "冲印", "分辨率", "像素", "print", "画质"],
    icon: FileImage,
  }),
  photoTool({
    slug: "paper-size",
    name: { zh: "纸张尺寸与出血", en: "Paper Size & Bleed" },
    description: {
      zh: "A 系列、Letter 与照片尺寸的成品、出血与安全区域，含像素换算",
      en: "Trim, bleed and safe area for A-series, Letter and photo sizes, with pixel dimensions",
    },
    keywords: ["纸张", "出血", "a4", "印刷", "安全边距", "尺寸", "paper", "bleed", "排版"],
    icon: Frame,
  }),
];

const languageTools: ToolMeta[] = [
  languageTool({
    slug: "word-frequency",
    name: { zh: "词频统计", en: "Word Frequency" },
    description: {
      zh: "统计每个词或汉字的出现次数、占比与首次出现的句子",
      en: "Count how often each word or Han character appears, its share, and where it first showed up",
    },
    keywords: ["词频", "高频词", "词数", "汉字频次", "生词", "word frequency", "count words"],
    icon: ChartColumn,
  }),
  languageTool({
    slug: "vocabulary-list",
    name: { zh: "生词表提取", en: "Vocabulary Builder" },
    description: {
      zh: "从文章里挑出还没掌握的词，附出现次数与上下文句子",
      en: "Pull out the words you have not learned yet, with counts and the sentence they came from",
    },
    keywords: ["生词表", "背单词", "词汇", "精读", "vocabulary", "glossary", "word list"],
    icon: NotebookPen,
  }),
  languageTool({
    slug: "anki-csv",
    name: { zh: "Anki 卡片 CSV", en: "Anki Deck CSV" },
    description: {
      zh: "把两列词表转成可直接导入 Anki 的文件，自动带上分隔符与标签指令",
      en: "Turn a two-column list into an Anki-ready file with the delimiter and tag directives filled in",
    },
    keywords: ["Anki", "卡片", "间隔重复", "背单词", "flashcard", "csv", "apkg"],
    icon: FileSpreadsheet,
  }),
  languageTool({
    slug: "readability",
    name: { zh: "文本难度分析", en: "Readability Checker" },
    description: {
      zh: "Flesch、Flesch–Kincaid、Fog 等可读性指数，估算文章适合几年级阅读",
      en: "Flesch, Flesch–Kincaid, Gunning Fog and more, with the grade level they imply",
    },
    keywords: ["可读性", "文本难度", "分级阅读", "蓝思", "readability", "flesch", "grade level"],
    icon: GraduationCap,
  }),
  languageTool({
    slug: "subtitle-study",
    name: { zh: "字幕转学习材料", en: "Subtitle Study Sheet" },
    description: {
      zh: "把 SRT / VTT 字幕变成带时间码的台词表和生词表，可导出 Markdown",
      en: "Turn SRT / VTT subtitles into a timestamped transcript plus a vocabulary list, exportable as Markdown",
    },
    keywords: ["字幕", "台词", "生词", "精读", "srt", "vtt", "subtitle", "markdown"],
    icon: Captions,
  }),
];

const healthTools: ToolMeta[] = [
  healthTool({
    slug: "bmr",
    name: { zh: "基础代谢与每日消耗", en: "BMR / TDEE Calculator" },
    description: {
      zh: "按 Mifflin、Harris-Benedict、Katch-McArdle 计算 BMR，再乘活动系数得到 TDEE",
      en: "BMR by three formulas, multiplied by an activity factor to get daily energy needs",
    },
    keywords: ["bmr", "tdee", "基础代谢", "每日消耗", "热量", "卡路里", "代谢率"],
    icon: Flame,
  }),
  healthTool({
    slug: "macro",
    name: { zh: "宏量营养素分配", en: "Macronutrient Split" },
    description: {
      zh: "按热量目标与体重算出蛋白质、脂肪、碳水各吃多少克",
      en: "Turn a calorie target and body weight into grams of protein, fat and carbs",
    },
    keywords: ["宏量营养素", "蛋白质", "碳水", "脂肪", "减脂", "增肌", "macro", "protein"],
    icon: Beef,
  }),
  healthTool({
    slug: "water-intake",
    name: { zh: "每日饮水量", en: "Daily Water Intake" },
    description: {
      zh: "按体重、运动时长与气温估算每天该喝多少水",
      en: "Estimate daily fluid needs from body weight, training time and heat",
    },
    keywords: ["饮水", "喝水", "补液", "水分", "脱水", "water", "hydration"],
    icon: Droplets,
  }),
  healthTool({
    slug: "pace",
    name: { zh: "跑步配速计算", en: "Running Pace Calculator" },
    description: {
      zh: "距离与用时互算配速，并预测各距离成绩与分段配速",
      en: "Pace from distance and time, with race predictions and kilometre splits",
    },
    keywords: ["配速", "跑步", "马拉松", "半马", "5k", "pace", "running", "split"],
    icon: Footprints,
  }),
  healthTool({
    slug: "heart-rate-zones",
    name: { zh: "心率区间", en: "Heart Rate Zones" },
    description: {
      zh: "按年龄估算最大心率，列出五个训练区间（支持储备心率法）",
      en: "Maximum heart rate from age and the five training zones, with the reserve method",
    },
    keywords: ["心率", "最大心率", "心率区间", "有氧", "zone 2", "heart rate", "karvonen"],
    icon: HeartPulse,
  }),
  healthTool({
    slug: "sleep-cycle",
    name: { zh: "睡眠周期", en: "Sleep Cycle Timing" },
    description: {
      zh: "按 90 分钟睡眠周期倒推最佳入睡或起床时间",
      en: "Work backwards through 90-minute cycles to a better bedtime or alarm",
    },
    keywords: ["睡眠", "睡眠周期", "起床时间", "入睡", "rem", "sleep cycle"],
    icon: Moon,
  }),
];

const ecommerceTools: ToolMeta[] = [
  ecommerceTool({
    slug: "pricing",
    name: { zh: "定价与利润计算", en: "Pricing & Profit" },
    description: {
      zh: "按成本、佣金、运费与退货率算出每单毛利，并给出保本售价与保本 ROAS",
      en: "Unit profit from cost, commission, shipping and returns, with the break-even price and ROAS",
    },
    keywords: [
      "定价",
      "利润率",
      "毛利",
      "保本",
      "佣金",
      "退货率",
      "roi",
      "pricing",
      "profit",
      "margin",
      "break even",
    ],
    icon: Tag,
  }),
  ecommerceTool({
    slug: "discount-stack",
    name: { zh: "促销叠加计算", en: "Discount Stack" },
    description: {
      zh: "店铺折扣、优惠券、平台满减与补贴逐层叠加，看清买家实付和商家实收",
      en: "Stack a store discount, coupons, marketplace tiers and a subsidy to see what the buyer pays and the seller keeps",
    },
    keywords: [
      "折扣",
      "满减",
      "优惠券",
      "叠加",
      "双十一",
      "补贴",
      "discount",
      "coupon",
      "promotion",
    ],
    icon: BadgePercent,
  }),
  ecommerceTool({
    slug: "sku-matrix",
    name: { zh: "SKU 组合生成", en: "SKU Matrix Generator" },
    description: {
      zh: "把颜色、尺码等属性值展开成全部 SKU，生成编码并导出可导入的 CSV",
      en: "Expand colour, size and other options into every SKU, with codes and an import-ready CSV",
    },
    keywords: ["sku", "规格", "组合", "变体", "属性", "上新", "variant", "matrix", "csv"],
    icon: Boxes,
  }),
  ecommerceTool({
    slug: "roas",
    name: { zh: "广告投产比计算", en: "ROAS & Ad Metrics" },
    description: {
      zh: "从曝光、点击、订单算 CTR、CPC、CVR、CPA、ROAS 与 ACoS，并标出保本线",
      en: "CTR, CPC, CVR, CPA, ROAS and ACoS from the funnel, with the break-even line",
    },
    keywords: ["roas", "roi", "acos", "广告", "投产", "点击率", "转化率", "cpc", "cpa", "ads"],
    icon: Megaphone,
  }),
  ecommerceTool({
    slug: "inventory",
    name: { zh: "库存周转与补货", en: "Stock Cover & Replenishment" },
    description: {
      zh: "按日均销量、采购交期与安全库存算出可售天数、补货点和建议下单量",
      en: "Days of cover, reorder point and order quantity from daily sales, lead time and safety stock",
    },
    keywords: ["库存", "补货", "周转", "断货", "安全库存", "交期", "起订量", "inventory", "stock"],
    icon: Package,
  }),
  ecommerceTool({
    slug: "dimensional-weight",
    name: { zh: "体积重与计费重", en: "Volumetric & Chargeable Weight" },
    description: {
      zh: "按长宽高算体积重，得到计费重与运费，看清包裹是不是按抛货计费",
      en: "Volumetric weight from the box, the billed weight after rounding and the freight cost",
    },
    keywords: ["体积重", "计费重", "抛货", "快递", "运费", "物流", "volumetric", "dimensional weight"],
    icon: Scale,
  }),
];

const financeTools: ToolMeta[] = [
  financeTool({
    slug: "salary-tax",
    name: { zh: "工资个税 / 到手计算", en: "Salary & Income Tax" },
    description: {
      zh: "按累计预扣法算每月个税与到手工资，含五险一金估算、专项附加扣除和年终奖计税对比",
      en: "Monthly take-home and income tax with the cumulative method, including social insurance, deductions and a bonus comparison",
    },
    keywords: ["个税", "工资", "到手", "五险一金", "年终奖", "税后", "salary", "tax", "take home"],
    icon: Wallet,
  }),
  financeTool({
    slug: "mortgage",
    name: { zh: "房贷计算器", en: "Mortgage Calculator" },
    description: {
      zh: "等额本息与等额本金月供、总利息对比，支持提前还款并算出省下的利息与缩短的期数",
      en: "Compare equal-payment and equal-principal mortgages, with prepayment and the interest it saves",
    },
    keywords: ["房贷", "月供", "等额本息", "等额本金", "提前还款", "利率", "mortgage", "loan"],
    icon: House,
  }),
];

const subtitleTools: ToolMeta[] = [
  subtitleTool({
    slug: "subtitle-convert",
    name: { zh: "字幕格式转换", en: "Subtitle Converter" },
    description: {
      zh: "SRT、VTT、ASS/SSA、SBV、LRC 互转，自动识别输入格式",
      en: "Convert between SRT, VTT, ASS/SSA, SBV and LRC with automatic format detection",
    },
    keywords: ["subtitle", "srt", "vtt", "webvtt", "ass", "ssa", "sbv", "lrc", "字幕", "格式转换", "歌词"],
    icon: Captions,
  }),
  subtitleTool({
    slug: "subtitle-timing",
    name: { zh: "字幕时间轴调整", en: "Subtitle Timing" },
    description: {
      zh: "整体偏移、帧率重映射、首尾对齐，顺带修掉重叠与零时长",
      en: "Shift, remap frame rates and align two points, fixing overlaps and zero durations",
    },
    keywords: ["subtitle", "timing", "offset", "fps", "23.976", "字幕", "时间轴", "偏移", "帧率", "对轴"],
    icon: Timer,
  }),
  subtitleTool({
    slug: "subtitle-merge",
    name: { zh: "双语字幕合并 / 拆分", en: "Bilingual Subtitle Merge / Split" },
    description: {
      zh: "两份单语字幕按时间合成为双语，或把双语字幕拆回两份",
      en: "Combine two single-language tracks into one bilingual track, or split it apart",
    },
    keywords: ["subtitle", "bilingual", "merge", "split", "双语", "字幕", "合并", "拆分"],
    icon: Merge,
  }),
  subtitleTool({
    slug: "subtitle-clean",
    name: { zh: "字幕文本整理", en: "Subtitle Text Cleanup" },
    description: {
      zh: "按字数或显示宽度断行、合并过短字幕、去标签与音效、简繁转换",
      en: "Rewrap lines, merge short cues, strip tags and sound cues, convert Chinese variants",
    },
    keywords: ["subtitle", "rewrap", "break", "clean", "opencc", "字幕", "断行", "换行", "简繁", "整理"],
    icon: WrapText,
  }),
];

const mediaTools: ToolMeta[] = [
  mediaTool({
    slug: "audio-trim",
    name: { zh: "音频剪切", en: "Audio Trim" },
    description: {
      zh: "波形上拖选片段并导出无损 WAV，自动淡入淡出",
      en: "Mark a clip on the waveform and export lossless WAV with short fades",
    },
    keywords: ["audio", "trim", "cut", "clip", "wav", "音频", "剪切", "裁剪", "截图", "片段"],
    icon: Scissors,
  }),
  mediaTool({
    slug: "audio-merge",
    name: { zh: "音频合并", en: "Audio Merge" },
    description: {
      zh: "多段音频按顺序拼接，可插入静音间隔后导出 WAV",
      en: "Join multiple clips in order with optional silence between them",
    },
    keywords: ["audio", "merge", "join", "concat", "拼接", "合并", "音频"],
    icon: Combine,
  }),
  mediaTool({
    slug: "audio-normalize",
    name: { zh: "音量标准化", en: "Audio Normalize" },
    description: {
      zh: "把音频峰值对齐到目标电平，不改变动态范围",
      en: "Align the loudest peak to a target level without changing dynamic range",
    },
    keywords: ["audio", "normalize", "loudness", "peak", "gain", "音量", "标准化", "响度", "增益"],
    icon: Gauge,
  }),
  mediaTool({
    slug: "media-info",
    name: { zh: "媒体信息查看", en: "Media Info" },
    description: {
      zh: "查看音频/视频的时长、分辨率、采样率、声道与估算码率",
      en: "Inspect duration, resolution, sample rate, channels and estimated bitrate",
    },
    keywords: ["media", "info", "metadata", "duration", "bitrate", "媒体", "信息", "时长", "码率", "分辨率"],
    icon: Info,
  }),
  mediaTool({
    slug: "video-gif",
    name: { zh: "视频转 GIF", en: "Video to GIF" },
    description: {
      zh: "截取视频片段并生成动图，可调宽度与帧率",
      en: "Turn a video clip into an animated GIF with adjustable width and frame rate",
    },
    keywords: ["video", "gif", "convert", "animation", "视频", "动图", "转换", "gif"],
    icon: Film,
  }),
];

const visualizationTools: ToolMeta[] = [
  vizTool({
    slug: "chart-maker",
    name: { zh: "CSV 转图表", en: "Chart Maker" },
    description: {
      zh: "把 CSV / JSON 数据画成柱状、折线、面积、饼图或散点图，并导出 SVG / PNG",
      en: "Turn CSV or JSON data into bar, line, area, pie or scatter charts and export SVG or PNG",
    },
    keywords: ["chart", "csv", "json", "graph", "bar", "pie", "图表", "可视化", "柱状图", "折线图", "饼图", "散点图", "svg"],
    icon: ChartColumn,
  }),
  vizTool({
    slug: "mermaid-editor",
    name: { zh: "Mermaid 图表编辑器", en: "Mermaid Editor" },
    description: {
      zh: "用 Mermaid 语法画流程图、时序图、甘特图、类图与状态图，实时预览并导出",
      en: "Draw flowcharts, sequence diagrams, Gantt charts, class and state diagrams with live preview",
    },
    keywords: ["mermaid", "diagram", "flowchart", "sequence", "gantt", "流程图", "时序图", "甘特图", "类图", "状态图", "uml"],
    icon: Workflow,
  }),
  vizTool({
    slug: "mindmap",
    name: { zh: "思维导图", en: "Mind Map" },
    description: {
      zh: "把缩进大纲或 Markdown 标题转换成思维导图，支持导出 SVG / PNG",
      en: "Turn an indented outline or Markdown headings into a mind map and export SVG or PNG",
    },
    keywords: ["mindmap", "outline", "tree", "brainstorm", "思维导图", "脑图", "大纲", "导图"],
    icon: Share2,
  }),
];

const filesTools: ToolMeta[] = [
  filesTool({
    slug: "batch-rename",
    name: { zh: "批量重命名", en: "Batch Rename" },
    description: {
      zh: "按前缀、后缀、查找替换与递增序号批量生成新文件名，先预览重名冲突，再打包下载",
      en: "Build new file names from prefixes, suffixes, find/replace and counters, preview conflicts, then download a zip",
    },
    keywords: ["批量重命名", "重命名", "rename", "batch", "文件名", "序号", "编号", "前缀", "后缀"],
    icon: FolderCog,
  }),
  filesTool({
    slug: "duplicate-finder",
    name: { zh: "重复文件查找", en: "Duplicate Finder" },
    description: {
      zh: "先按文件大小初筛，再用 SHA-256 确认，找出内容完全相同或整组重复的文件并导出清单",
      en: "Filter by size, confirm with SHA-256, and list files with identical content plus a cleanup report",
    },
    keywords: ["重复文件", "重复", "duplicate", "查重", "去重", "相同文件", "sha256", "清理"],
    icon: CopyCheck,
  }),
  filesTool({
    slug: "file-type",
    name: { zh: "文件类型识别", en: "File Type Detection" },
    description: {
      zh: "读取文件头判断真实类型，找出改了扩展名的文件，显示 MIME 与文件头字节",
      en: "Read the file header to detect the real type, flag renamed extensions and show MIME and header bytes",
    },
    keywords: ["文件类型", "file type", "magic number", "文件头", "mime", "扩展名", "识别", "真实格式"],
    icon: FileScan,
  }),
  filesTool({
    slug: "folder-compare",
    name: { zh: "文件夹对比", en: "Folder Compare" },
    description: {
      zh: "按相对路径对比两个文件夹，列出只在一侧存在、大小不同或哈希不同的文件",
      en: "Compare two folders by relative path and list files only on one side or with different sizes or hashes",
    },
    keywords: ["文件夹对比", "目录对比", "folder compare", "diff", "差异", "同步", "哈希", "备份"],
    icon: FolderSearch,
  }),
  filesTool({
    slug: "file-hash",
    name: { zh: "文件哈希", en: "File Hash" },
    description: {
      zh: "上传文件算出 MD5、SHA-1、SHA-256 等摘要，大文件流式读取",
      en: "Hash a file with MD5, SHA-1, SHA-256 and more, streamed in slices",
    },
    keywords: ["file hash", "文件哈希", "校验", "checksum", "sha256", "md5", "文件校验"],
    icon: FileCheck2,
  }),
  filesTool({
    slug: "file-manifest",
    name: { zh: "文件清单与校验和", en: "File Manifest & Checksums" },
    description: {
      zh: "为整批文件计算 MD5 / SHA 校验和，导出 CSV、JSON 或 sha256sum 格式的校验文件",
      en: "Hash every file with MD5 or SHA and export a CSV, JSON or sha256sum-compatible checksum file",
    },
    keywords: ["文件清单", "manifest", "校验和", "checksum", "sha256", "批量哈希", "inventory", "归档"],
    icon: ListChecks,
  }),
  filesTool({
    slug: "zip",
    name: { zh: "ZIP 压缩 / 解压", en: "ZIP Compress / Unzip" },
    description: {
      zh: "多文件打包成 ZIP，或查看、取出压缩包里的文件",
      en: "Bundle files into a ZIP, or list and extract what is inside one",
    },
    keywords: ["zip", "压缩包", "打包", "unzip", "解压", "archive"],
    icon: FolderArchive,
  }),
];

const privacyTools: ToolMeta[] = [
  privacyTool({
    slug: "file-encrypt",
    name: { zh: "文件加密 / 解密", en: "File Encrypt / Decrypt" },
    description: {
      zh: "用密码把任意文件封装成 .enc，或还原成原始文件；AES-256-GCM，全程本地",
      en: "Password-encrypt any file into a .enc container and restore it later, with AES-256-GCM and no uploads",
    },
    keywords: ["文件加密", "加密文件", "encrypt file", "aes", "gcm", "解密", "decrypt", "隐私", "密码保护", "enc"],
    icon: LockKeyhole,
  }),
  privacyTool({
    slug: "redact-text",
    name: { zh: "文本脱敏", en: "Text Redaction" },
    description: {
      zh: "识别手机号、身份证 / SSN、银行卡、邮箱与 IP，按遮盖、替换或保留格式脱敏",
      en: "Detect phone, ID, SSN, bank card, email and IP values, then mask, replace or keep the layout",
    },
    keywords: ["脱敏", "打码", "敏感信息", "隐私", "redact", "mask", "手机号", "身份证", "ssn", "银行卡", "pii", "匿名"],
    icon: ScanEye,
  }),
  privacyTool({
    slug: "pdf-redact",
    name: { zh: "PDF 涂销", en: "PDF Redaction" },
    description: {
      zh: "框选敏感区域并重建页面，彻底删除底层文字，而不是盖一层黑框",
      en: "Box the sensitive areas and rebuild the pages so the text underneath is really gone, not just covered",
    },
    keywords: ["pdf 涂销", "涂黑", "脱敏", "redact", "打码", "遮盖", "删除文字", "隐私", "敏感信息"],
    icon: SquareDashed,
  }),
  privacyTool({
    slug: "metadata-cleaner",
    name: { zh: "文件元数据清除", en: "Metadata Cleaner" },
    description: {
      zh: "批量清除图片的 EXIF / GPS 与 PDF 的文档信息，可一次处理多个文件并打包下载",
      en: "Strip EXIF and GPS from images and the info dictionary from PDFs, in batch with a zip download",
    },
    keywords: ["元数据", "metadata", "exif", "gps", "清除", "隐私", "批量", "pdf 属性", "匿名"],
    icon: Eraser,
  }),
];

const officeTools: ToolMeta[] = [
  officeTool({
    slug: "docx-to-md",
    name: { zh: "Word 转 Markdown / HTML", en: "Word to Markdown / HTML" },
    description: {
      zh: "解析 .docx 的标题、列表、表格与图片，输出 Markdown 或 HTML，图片内嵌",
      en: "Turn a .docx into Markdown or HTML with headings, lists, tables and inlined images",
    },
    keywords: ["docx", "word", "word 转 markdown", "docx to markdown", "文档转换", "word 转 html", "md"],
    icon: FileType,
  }),
  officeTool({
    slug: "xlsx-viewer",
    name: { zh: "Excel 表格查看 / 转 CSV", en: "Excel Viewer / CSV" },
    description: {
      zh: "直接读取 .xlsx 工作表，去空行去重后预览表格并导出 CSV",
      en: "Open .xlsx sheets in the browser, drop empty or duplicate rows, preview and export as CSV",
    },
    keywords: ["xlsx", "excel", "表格", "xlsx 转 csv", "查看 excel", "工作表", "spreadsheet"],
    icon: Sheet,
  }),
  officeTool({
    slug: "pptx-text",
    name: { zh: "PPT 文本提取", en: "PowerPoint Text Extractor" },
    description: {
      zh: "按放映顺序提取 .pptx 每页文字与表格，导出 Markdown 或纯文本",
      en: "Pull text and tables out of a .pptx in slide order, as Markdown or plain text",
    },
    keywords: ["pptx", "ppt", "powerpoint", "ppt 转文字", "提取文字", "幻灯片", "大纲"],
    icon: Presentation,
  }),
  officeTool({
    slug: "epub-to-md",
    name: { zh: "EPUB 转 Markdown / HTML", en: "EPUB to Markdown / HTML" },
    description: {
      zh: "按书脊顺序合并 .epub 章节，输出 Markdown 或单文件 HTML，图片内嵌",
      en: "Merge .epub chapters in spine order into Markdown or a single HTML file, images inlined",
    },
    keywords: ["epub", "电子书", "epub 转 markdown", "epub to markdown", "kindle", "小说", "ebook"],
    icon: BookOpen,
  }),
];

const aiTools: ToolMeta[] = [
  aiTool({
    slug: "token-counter",
    name: { zh: "Token 计数与上下文预算", en: "Token Counter & Context Budget" },
    description: {
      zh: "统计 token 并算上下文预算：GPT-6 / GPT-4 可切换官方词表精确计数，Claude 5 / Gemini / Llama 按分词规则估算，超过 272K 会提示加价",
      en: "Count tokens and budget a context window: exact counting for the GPT families, calibrated estimates for Claude 5, Gemini and Llama, and a warning past the 272K pricing step",
    },
    keywords: ["token", "计数器", "token 计算", "上下文", "context window", "prompt 长度", "gpt", "claude", "计费", "精确", "bpe", "gpt-6", "272k"],
    icon: ScanText,
  }),
  aiTool({
    slug: "text-chunker",
    name: { zh: "文本分块（RAG）", en: "Text Chunker (RAG)" },
    description: {
      zh: "按 token 上限把长文切成句子完整的片段，可设重叠，导出 JSONL 给 embedding",
      en: "Cut long text into sentence-aligned chunks under a token limit, with overlap, exported as JSONL",
    },
    keywords: ["分块", "chunk", "chunking", "rag", "embedding", "切片", "向量库", "jsonl", "知识库"],
    icon: Blocks,
  }),
  aiTool({
    slug: "prompt-template",
    name: { zh: "Prompt 模板批量渲染", en: "Prompt Template Batch" },
    description: {
      zh: "用 {{变量}} 模板配合 CSV / JSON 批量生成提示词，导出 JSONL、CSV 或纯文本",
      en: "Render a {{variable}} template against CSV or JSON rows and export JSONL, CSV or plain text",
    },
    keywords: ["prompt", "模板", "template", "批量", "变量", "csv", "jsonl", "提示词", "批处理"],
    icon: LayoutTemplate,
  }),
  aiTool({
    slug: "chat-to-markdown",
    name: { zh: "对话记录转 Markdown", en: "Chat Export to Markdown" },
    description: {
      zh: "把 ChatGPT / Claude 的导出或带说话人标记的纯文本整理成干净的 Markdown",
      en: "Turn ChatGPT or Claude exports, or plain transcripts with speaker markers, into clean Markdown",
    },
    keywords: ["对话", "chat", "chatgpt", "claude", "markdown", "导出", "聊天记录", "整理"],
    icon: MessagesSquare,
  }),
  aiTool({
    slug: "llm-cost",
    name: { zh: "LLM 成本计算器", en: "LLM Cost Calculator" },
    description: {
      zh: "按输入 / 输出单价与 tokens 估算单次请求、批量调用与预算成本",
      en: "Estimate per-request, batch and budget cost from your own token prices",
    },
    keywords: ["llm", "token", "成本", "费用", "api", "价格", "gpt", "claude", "deepseek"],
    icon: BadgeDollarSign,
  }),
];

const seoTools: ToolMeta[] = [
  seoTool({
    slug: "og-image",
    name: { zh: "OG 分享图生成", en: "Open Graph Image Generator" },
    description: {
      zh: "填标题与描述，实时预览并下载 1200×630 的分享图，适配微信、X 与 Slack",
      en: "Type a title and description, preview the card live and download a 1200×630 PNG for WeChat, X and Slack",
    },
    keywords: [
      "og image",
      "og 图",
      "分享图",
      "open graph",
      "twitter card",
      "社交卡片",
      "封面图",
      "1200x630",
    ],
    icon: Share2,
  }),
  seoTool({
    slug: "schema-markup",
    name: { zh: "结构化数据生成（Schema.org）", en: "Structured Data Generator" },
    description: {
      zh: "按文章、商品、FAQ、面包屑生成 JSON-LD，缺必填字段会直接标出来",
      en: "Build JSON-LD for articles, products, FAQs and breadcrumbs, with required fields checked",
    },
    keywords: [
      "schema",
      "schema.org",
      "json-ld",
      "结构化数据",
      "富媒体",
      "rich result",
      "faq schema",
      "面包屑",
    ],
    icon: Braces,
  }),
  seoTool({
    slug: "robots-sitemap",
    name: { zh: "robots.txt / sitemap.xml 生成", en: "robots.txt & sitemap.xml Builder" },
    description: {
      zh: "按路径规则生成 robots.txt，把页面列表转成带优先级与更新时间的 sitemap.xml",
      en: "Generate robots.txt from path rules and turn a page list into sitemap.xml with lastmod, priority and frequency",
    },
    keywords: [
      "robots.txt",
      "sitemap",
      "sitemap.xml",
      "站点地图",
      "爬虫",
      "收录",
      "crawl",
      "disallow",
    ],
    icon: FileCode2,
  }),
  seoTool({
    slug: "seo-audit",
    name: { zh: "HTML SEO / 可访问性检查", en: "HTML SEO & A11y Audit" },
    description: {
      zh: "粘贴 HTML，检查标题描述长度、H1、canonical、分享标签、图片 alt 与表单可访问性",
      en: "Paste HTML and check title and description length, headings, canonical, share tags, image alt text and form labels",
    },
    keywords: [
      "seo 检查",
      "seo audit",
      "html 检查",
      "meta 标签",
      "标题长度",
      "canonical",
      "alt",
      "可访问性",
      "a11y",
    ],
    icon: ScanSearch,
  }),
];

export const categories: CategoryMeta[] = [
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
    id: "image",
    name: { zh: "图片处理", en: "Images" },
    description: {
      zh: "压缩、转换、SVG 优化、图标生成与取色",
      en: "Compress, convert, optimise SVG, generate icons and pick colors",
    },
    icon: ImageIcon,
    tools: imageTools,
  },
  {
    id: "files",
    name: { zh: "文件批处理", en: "File Batch" },
    description: {
      zh: "批量重命名、重复文件查找、类型识别、文件夹对比、文件哈希、ZIP 打包与校验清单",
      en: "Batch rename, duplicate detection, type sniffing, folder diffs, file hashing, ZIP packing and checksum manifests",
    },
    icon: FolderTree,
    tools: filesTools,
  },
  {
    id: "privacy",
    name: { zh: "隐私 / 文件安全", en: "Privacy / File Security" },
    description: {
      zh: "文件加密、文本脱敏、PDF 涂销与元数据清除，全部在本机完成",
      en: "File encryption, text redaction, PDF redaction and metadata stripping, all on-device",
    },
    icon: ShieldAlert,
    tools: privacyTools,
  },
  {
    id: "color",
    name: { zh: "颜色 / CSS", en: "Color / CSS" },
    description: {
      zh: "取色、渐变、阴影、对比度检查",
      en: "Pickers, gradients, shadows and contrast checks",
    },
    icon: Palette,
    tools: colorTools,
  },
  {
    id: "qrcode",
    name: { zh: "二维码 / 条码", en: "QR / Barcode" },
    description: {
      zh: "生成与识别二维码、条形码",
      en: "Generate and scan QR codes and barcodes",
    },
    icon: QrCode,
    tools: qrcodeTools,
  },
  {
    id: "convert",
    name: { zh: "转换器 / 单位", en: "Converters / Units" },
    description: {
      zh: "单位换算、百分比与 BMI",
      en: "Units, percentages and BMI",
    },
    icon: Ruler,
    tools: convertTools,
  },
  {
    id: "math",
    name: { zh: "数学 / 科学计算", en: "Math / Science" },
    description: {
      zh: "计算器、函数图像、矩阵、统计、概率分布、排列组合与 LaTeX 公式",
      en: "Calculator, plots, matrices, statistics, distributions, combinatorics and LaTeX",
    },
    icon: Sigma,
    tools: mathTools,
  },
  {
    id: "electronics",
    name: { zh: "电子 / 硬件", en: "Electronics / Hardware" },
    description: {
      zh: "电阻色环、欧姆定律、分压器、电池续航、PCB 线宽与串口校验",
      en: "Resistor codes, Ohm's law, dividers, battery runtime, PCB trace widths and serial checksums",
    },
    icon: CircuitBoard,
    tools: electronicsTools,
  },
  {
    id: "photography",
    name: { zh: "摄影 / 印刷", en: "Photography / Print" },
    description: {
      zh: "曝光、景深、ND 减光、打印尺寸与纸张出血",
      en: "Exposure, depth of field, ND filters, print sizes and paper bleed",
    },
    icon: Camera,
    tools: photoTools,
  },
  {
    id: "language",
    name: { zh: "语言学习", en: "Language Learning" },
    description: {
      zh: "词频、生词表、Anki 卡片、文本难度与字幕学习材料",
      en: "Word frequency, vocabulary lists, Anki cards, readability and subtitle study sheets",
    },
    icon: Languages,
    tools: languageTools,
  },
  {
    id: "health",
    name: { zh: "健康 / 运动", en: "Health / Fitness" },
    description: {
      zh: "基础代谢、宏量营养素、饮水量、配速、心率区间与睡眠周期",
      en: "BMR, macros, hydration, running pace, heart rate zones and sleep cycles",
    },
    icon: Dumbbell,
    tools: healthTools,
  },
  {
    id: "finance",
    name: { zh: "财务 / 薪资", en: "Finance / Salary" },
    description: {
      zh: "个税、到手工资、房贷月供与提前还款",
      en: "Income tax, take-home pay, mortgage payments and prepayment",
    },
    icon: Landmark,
    tools: financeTools,
  },
  {
    id: "ecommerce",
    name: { zh: "电商运营", en: "E-commerce" },
    description: {
      zh: "定价毛利、促销叠加、SKU 生成、广告投产、库存补货与物流计费重",
      en: "Pricing, promotions, SKU matrices, ad returns, replenishment and chargeable weight",
    },
    icon: Store,
    tools: ecommerceTools,
  },
  {
    id: "pdf",
    name: { zh: "PDF / 文档", en: "PDF / Documents" },
    description: {
      zh: "合并、拆分、转图、加水印",
      en: "Merge, split, convert to images and watermark",
    },
    icon: FileText,
    tools: pdfTools,
  },
  {
    id: "office",
    name: { zh: "Office / 电子书", en: "Office / Ebooks" },
    description: {
      zh: "Word、Excel、PPT 与 EPUB 的读取与转换",
      en: "Read and convert Word, Excel, PowerPoint and EPUB files",
    },
    icon: LibraryBig,
    tools: officeTools,
  },
  {
    id: "subtitle",
    name: { zh: "字幕 / 歌词", en: "Subtitles / Lyrics" },
    description: {
      zh: "格式互转、时间轴校准、双语合并与断行整理",
      en: "Format conversion, timing fixes, bilingual merging and line wrapping",
    },
    icon: Captions,
    tools: subtitleTools,
  },
  {
    id: "media",
    name: { zh: "音频 / 视频", en: "Audio / Video" },
    description: {
      zh: "剪切、合并、音量归一化、媒体信息与视频转 GIF",
      en: "Trim, merge, normalize loudness, inspect media and turn video into GIF",
    },
    icon: AudioLines,
    tools: mediaTools,
  },
  {
    id: "visualization",
    name: { zh: "数据可视化 / 图表", en: "Visualization / Charts" },
    description: {
      zh: "CSV 转图表、Mermaid 图表与思维导图，均可导出 SVG / PNG",
      en: "Charts from CSV, Mermaid diagrams and mind maps, exported as SVG or PNG",
    },
    icon: ChartColumn,
    tools: visualizationTools,
  },
  {
    id: "misc",
    name: { zh: "其他实用工具", en: "Misc" },
    description: {
      zh: "随机数、掷骰子、剪贴板历史与记事本",
      en: "Random numbers, dice, clipboard history and notes",
    },
    icon: Dices,
    tools: miscTools,
  },
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
      zh: "格式化、Schema 校验、Mock 数据、表格视图与类型生成",
      en: "Format, validate schemas, mock data, table views and type generation",
    },
    icon: Braces,
    tools: jsonTools,
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
    id: "ai",
    name: { zh: "AI / Prompt", en: "AI / Prompt" },
    description: {
      zh: "Token 计数、上下文预算、文本分块、模板批量渲染与对话整理",
      en: "Token counting, context budgets, chunking, template batching and chat cleanup",
    },
    icon: Bot,
    tools: aiTools,
  },
  {
    id: "dev",
    name: { zh: "开发者 / 代码", en: "Developer / Code" },
    description: {
      zh: "SQL、代码格式化、状态码、UA 解析与 .gitignore",
      en: "SQL, code formatting, status codes, user-agent parsing and .gitignore",
    },
    icon: Terminal,
    tools: devTools,
  },
  {
    id: "network",
    name: { zh: "网络 / URL", en: "Network / URL" },
    description: {
      zh: "URL 解析、IP 校验、Header 生成与 cURL 转代码",
      en: "URL structure, IP validation, header builders and cURL to code",
    },
    icon: Globe,
    tools: networkTools,
  },
  {
    id: "seo",
    name: { zh: "网站运营 / SEO", en: "Site Ops / SEO" },
    description: {
      zh: "分享图、结构化数据、robots.txt 与 sitemap，以及上线前的 HTML 检查",
      en: "Share cards, structured data, robots.txt and sitemaps, plus a pre-launch HTML audit",
    },
    icon: Search,
    tools: seoTools,
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

/** Match a category against a search query by its title, in either locale */
export function categoryMatches(category: CategoryMeta, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    category.name.zh.toLowerCase().includes(q) || category.name.en.toLowerCase().includes(q)
  );
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
