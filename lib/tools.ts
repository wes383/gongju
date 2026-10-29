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

/** 已上线工具的元数据 */
export interface ToolMeta {
  slug: string;
  name: string;
  /** 一句话说明，用于卡片与列表 */
  description: string;
  /** 搜索关键词（中英文别名） */
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
  name: string;
  description: string;
  icon: LucideIcon;
  /** 该分类下已上线的工具 */
  tools: ToolMeta[];
  /** 规划中的工具名（来自需求清单，尚未实现） */
  planned: string[];
}

const tool = (t: Omit<ToolMeta, "category">): ToolMeta => ({ ...t, category: "encoding" });

const encodingTools: ToolMeta[] = [
  tool({
    slug: "base64",
    name: "Base64 编码 / 解码",
    description: "文本与 Base64 互转，支持 URL 安全字符集与换行折行",
    keywords: ["base64", "b64", "编码", "解码", "encode", "decode"],
    icon: Binary,
  }),
  tool({
    slug: "url-encode",
    name: "URL 编码 / 解码",
    description: "encodeURIComponent / encodeURI 双模式互转",
    keywords: ["url", "urlencode", "urldecode", "百分号", "转义", "encode"],
    icon: Link2,
  }),
  tool({
    slug: "html-entity",
    name: "HTML 实体编码 / 解码",
    description: "转义 & < > 等特殊字符，或还原命名与数字实体",
    keywords: ["html", "entity", "实体", "转义", "escape", "unescape"],
    icon: Code2,
  }),
  tool({
    slug: "unicode",
    name: "Unicode 转中文",
    description: "中文与 \\uXXXX / &#DDDD; / U+XXXX 之间互转",
    keywords: ["unicode", "中文", "转义", "码点", "codepoint", "\\u"],
    icon: Languages,
  }),
  tool({
    slug: "hex",
    name: "十六进制 ↔ 字符串",
    description: "UTF-8 字节与十六进制串互转，支持分隔符与大小写",
    keywords: ["hex", "十六进制", "hexdump", "字节", "byte"],
    icon: Hash,
  }),
  tool({
    slug: "radix",
    name: "进制互转",
    description: "二 / 八 / 十 / 十六进制任意互转，支持大整数",
    keywords: ["进制", "binary", "octal", "decimal", "hex", "base", "转换"],
    icon: Calculator,
  }),
  tool({
    slug: "jwt",
    name: "JWT 解码",
    description: "查看 Header 与 Payload，解析过期时间（不校验签名）",
    keywords: ["jwt", "token", "json web token", "bearer", "解码"],
    icon: KeyRound,
  }),
  tool({
    slug: "query-string",
    name: "Query String 解析 / 生成",
    description: "URL 参数表格化解析，再一键拼回查询串",
    keywords: ["query", "querystring", "url params", "参数", "查询串"],
    icon: ListFilter,
  }),
  tool({
    slug: "markdown",
    name: "Markdown ↔ HTML",
    description: "Markdown 渲染为 HTML，或把 HTML 反向转回 Markdown",
    keywords: ["markdown", "md", "html", "渲染", "转换", "turndown"],
    icon: FileCode2,
  }),
  tool({
    slug: "yaml",
    name: "YAML ↔ JSON",
    description: "配置文件互转，带语法错误定位",
    keywords: ["yaml", "yml", "json", "配置", "k8s", "转换"],
    icon: FileJson,
  }),
  tool({
    slug: "xml",
    name: "XML ↔ JSON",
    description: "XML 与 JSON 互转，可保留属性与文本节点",
    keywords: ["xml", "json", "soap", "转换", "属性"],
    icon: Braces,
  }),
  tool({
    slug: "csv",
    name: "CSV ↔ JSON",
    description: "表格数据与 JSON 互转，自动识别分隔符",
    keywords: ["csv", "json", "表格", "excel", "tsv", "转换"],
    icon: Table2,
  }),
];

export const categories: CategoryMeta[] = [
  {
    id: "encoding",
    name: "编码 / 解码",
    description: "字符串与各种编码格式之间的互转，最高频的一类工具",
    icon: Binary,
    tools: encodingTools,
    planned: [],
  },
  {
    id: "json",
    name: "JSON / 数据格式",
    description: "格式化、校验、对比、树形浏览与类型生成",
    icon: Braces,
    tools: [],
    planned: [
      "JSON 格式化 / 压缩 / 校验",
      "JSON 树形视图",
      "JSON Path 查询",
      "JSON Diff 对比",
      "JSON 转 TypeScript / Go / Python",
      "JSON 转 CSV",
      "JSON 排序 / 去重 / 扁平化",
    ],
  },
  {
    id: "text",
    name: "文本处理",
    description: "统计、大小写、去重、Diff、正则测试",
    icon: FileText,
    tools: [],
    planned: [
      "字数 / 行数统计",
      "大小写与命名风格转换",
      "文本 Diff 对比",
      "去除空行 / 重复行",
      "文本排序 / 去重",
      "Lorem Ipsum 生成器",
      "简繁体转换",
      "汉字转拼音",
      "正则表达式测试",
    ],
  },
  {
    id: "datetime",
    name: "时间 / 日期",
    description: "时间戳、时区、Cron、日期差值",
    icon: Clock,
    tools: [],
    planned: [
      "Unix 时间戳 ↔ 日期",
      "多时区转换",
      "Cron 表达式解析",
      "日期加减与差值",
      "工作日计算",
      "农历 / 公历转换",
    ],
  },
  {
    id: "hash",
    name: "哈希 / 安全",
    description: "摘要、HMAC、随机串与密码强度",
    icon: ShieldCheck,
    tools: [],
    planned: [
      "MD5 / SHA-1 / SHA-256 / SHA-512",
      "HMAC 计算",
      "密码生成器",
      "NanoID / ULID 生成",
      "UUID 生成（v4 / v7）",
      "密码强度检测",
    ],
  },
  {
    id: "image",
    name: "图片处理",
    description: "压缩、转换、裁剪、水印、取色",
    icon: ImageIcon,
    tools: [],
    planned: [
      "图片压缩（指定目标大小）",
      "图片格式转换",
      "图片缩放 / 裁剪",
      "图片转 Base64",
      "批量图片处理",
      "图片加水印",
      "九宫格切图 / 长图拼接",
      "EXIF 查看 / 清除",
      "颜色提取",
    ],
  },
  {
    id: "color",
    name: "颜色 / CSS",
    description: "取色、渐变、阴影、对比度检查",
    icon: Palette,
    tools: [],
    planned: [
      "颜色选择器与格式转换",
      "渐变生成器",
      "Box Shadow 生成器",
      "毛玻璃生成器",
      "圆角可视化",
      "Flex / Grid 生成器",
      "调色板生成",
      "对比度检查",
      "CSS 单位转换",
    ],
  },
  {
    id: "qrcode",
    name: "二维码 / 条码",
    description: "生成与识别二维码、条形码",
    icon: QrCode,
    tools: [],
    planned: [
      "二维码生成（文本 / WiFi / vCard）",
      "二维码识别",
      "条形码生成",
      "批量二维码生成",
    ],
  },
  {
    id: "dev",
    name: "开发者 / 代码",
    description: "SQL、代码格式化、状态码、UA 解析",
    icon: Terminal,
    tools: [],
    planned: [
      "SQL 格式化 / 压缩",
      "JS / CSS / HTML 格式化",
      "Crontab 生成器",
      "HTTP 状态码查询",
      "MIME Type 查询",
      "User-Agent 解析",
      "Meta / Open Graph 生成器",
      "robots.txt / sitemap 生成器",
    ],
  },
  {
    id: "network",
    name: "网络 / URL",
    description: "URL 结构解析、IP 校验、Header 生成",
    icon: Globe,
    tools: [],
    planned: ["URL 结构解析", "IP 地址格式验证", "HTTP Header 查看 / 生成"],
  },
  {
    id: "convert",
    name: "转换器 / 单位",
    description: "单位换算、汇率、百分比、BMI",
    icon: Ruler,
    tools: [],
    planned: [
      "单位换算（长度 / 重量 / 温度…）",
      "汇率换算",
      "百分比计算",
      "BMI 计算",
      "文件大小换算",
      "角度 / 弧度转换",
    ],
  },
  {
    id: "pdf",
    name: "PDF / 文档",
    description: "合并、拆分、转图、加水印",
    icon: FileText,
    tools: [],
    planned: [
      "PDF 合并 / 拆分",
      "PDF 页面旋转 / 删除",
      "图片转 PDF",
      "PDF 转图片",
      "PDF 加水印",
      "PDF 元数据查看",
    ],
  },
  {
    id: "misc",
    name: "其他实用工具",
    description: "随机数、计算器、摩斯电码、速查表",
    icon: Dices,
    tools: [],
    planned: [
      "随机数 / 掷骰子 / 抽签",
      "科学计算器",
      "年龄计算器",
      "倒计时工具",
      "设备信息查看",
      "剪贴板历史",
      "摩斯电码编解码",
      "ASCII / 进制表",
      "常见正则速查表",
    ],
  },
];

export const allTools: ToolMeta[] = categories.flatMap((c) => c.tools);

export function getTool(slug: string): ToolMeta | undefined {
  return allTools.find((t) => t.slug === slug);
}

export function getCategory(id: CategoryId): CategoryMeta | undefined {
  return categories.find((c) => c.id === id);
}

/** 按关键词模糊匹配工具，用于顶部搜索 */
export function searchTools(query: string): ToolMeta[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored = allTools.map((t) => {
    const name = t.name.toLowerCase();
    let score = 0;
    if (name === q) score = 100;
    else if (name.startsWith(q)) score = 80;
    else if (name.includes(q)) score = 60;
    else if (t.keywords.some((k) => k.toLowerCase().includes(q))) score = 40;
    else if (t.description.toLowerCase().includes(q)) score = 20;
    return { t, score };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.t);
}

export const totalToolCount = allTools.length;
export const totalPlannedCount = categories.reduce((n, c) => n + c.planned.length, 0);

/** 首页展示的「热门」工具 */
export const featuredSlugs = ["base64", "jwt", "url-encode", "yaml", "csv", "markdown"];
