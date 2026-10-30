export type Locale = "zh" | "en";

export const LOCALE_STORAGE_KEY = "gongju-locale";

export const localeLabels: Record<Locale, string> = {
  zh: "中文",
  en: "English",
};

export const htmlLang: Record<Locale, string> = {
  zh: "zh-CN",
  en: "en",
};

export interface Dict {
  searchPlaceholder: string;
  searchEmpty: string;
  clearSearch: string;
  backHome: string;
  copy: string;
  copied: string;
  copyError: string;
  clear: string;
  swap: string;
  swapHint: string;
  sample: string;
  outputPlaceholder: string;
  input: string;
  output: string;
  chars: string;
  bytes: string;
  lines: string;
  theme: {
    label: string;
    appearance: string;
    light: string;
    dark: string;
    system: string;
    highContrast: string;
  };
  language: {
    label: string;
    menu: string;
  };
  /** Format a JSON syntax error, with line/column when available */
  syntaxError: (line: number | null, column: number | null, message: string) => string;
  valid: string;
  invalid: string;
  view: {
    grid: string;
    list: string;
  };
  /** Keyed by the `code` carried by CodedError; {0}, {1} are placeholders */
  errors: Record<string, string>;
}

const zh: Dict = {
  searchPlaceholder: "搜索工具…",
  searchEmpty: "没有找到匹配的工具",
  clearSearch: "清空搜索",
  backHome: "返回主页",
  copy: "复制",
  copied: "已复制",
  copyError: "复制失败，请手动选择文本",
  clear: "清空",
  swap: "交换",
  swapHint: "交换输入与输出",
  sample: "示例",
  outputPlaceholder: "结果会显示在这里",
  input: "输入",
  output: "输出",
  chars: "字符",
  bytes: "字节",
  lines: "行",
  theme: {
    label: "切换主题",
    appearance: "外观",
    light: "浅色",
    dark: "深色",
    system: "跟随系统",
    highContrast: "高对比度",
  },
  language: {
    label: "切换语言",
    menu: "语言",
  },
  syntaxError: (line, column, message) =>
    line && column ? `第 ${line} 行第 ${column} 列：${message}` : message,
  valid: "JSON 有效",
  invalid: "语法错误",
  view: {
    grid: "卡片视图",
    list: "列表视图",
  },
  errors: {
    "base64.invalidChars": "包含非法字符，这不是合法的 Base64 字符串",
    "base64.badLength": "长度不合法（Base64 长度应为 4 的倍数）",
    "base64.notUtf8": "解码成功但内容不是合法的 UTF-8 文本（可能是二进制数据）",
    "hex.oddLength": "十六进制字符数为奇数，无法按字节解析（每个字节需要 2 个字符）",
    "hex.notUtf8": "字节序列不是合法的 UTF-8 文本（可能是二进制数据）",
    "radix.range": "进制需在 2–36 之间",
    "radix.empty": "请输入数值",
    "radix.digit": "字符 “{0}” 不是 {1} 进制的合法数字",
    "jwt.parts": "JWT 至少应包含两段（Header.Payload），当前格式不正确",
    "jwt.tooMany": "JWT 最多三段（Header.Payload.Signature），当前段数过多",
    "jwt.base64": "{0} 段不是合法的 Base64URL 编码",
    "jwt.json": "{0} 段不是合法的 JSON",
    "crypto.unavailable": "当前环境不支持 Web Crypto，请用 https 或 localhost 打开",
    "crypto.badFormat": "密文格式不正确，请确认是本站生成的密文",
    "crypto.badPassword": "解密失败：密码错误，或密文已被篡改",
  },
};

const en: Dict = {
  searchPlaceholder: "Search tools…",
  searchEmpty: "No matching tool",
  clearSearch: "Clear search",
  backHome: "Back to home",
  copy: "Copy",
  copied: "Copied",
  copyError: "Copy failed, please select the text manually",
  clear: "Clear",
  swap: "Swap",
  swapHint: "Swap input and output",
  sample: "Sample",
  outputPlaceholder: "The result shows up here",
  input: "Input",
  output: "Output",
  chars: "chars",
  bytes: "bytes",
  lines: "lines",
  theme: {
    label: "Switch theme",
    appearance: "Appearance",
    light: "Light",
    dark: "Dark",
    system: "System",
    highContrast: "High contrast",
  },
  language: {
    label: "Switch language",
    menu: "Language",
  },
  syntaxError: (line, column, message) =>
    line && column ? `Line ${line}, column ${column}: ${message}` : message,
  valid: "Valid JSON",
  invalid: "Syntax error",
  view: {
    grid: "Card view",
    list: "List view",
  },
  errors: {
    "base64.invalidChars": "Contains characters that are not valid Base64",
    "base64.badLength": "Invalid length: Base64 must be a multiple of 4 characters",
    "base64.notUtf8": "Decoded fine, but the bytes are not valid UTF-8 text",
    "hex.oddLength": "Odd number of hex characters: every byte needs two",
    "hex.notUtf8": "These bytes are not valid UTF-8 text",
    "radix.range": "Base must be between 2 and 36",
    "radix.empty": "Enter a number",
    "radix.digit": "“{0}” is not a valid digit in base {1}",
    "jwt.parts": "A JWT needs at least two segments (Header.Payload)",
    "jwt.tooMany": "A JWT has at most three segments (Header.Payload.Signature)",
    "jwt.base64": "The {0} segment is not valid Base64URL",
    "jwt.json": "The {0} segment is not valid JSON",
    "crypto.unavailable": "Web Crypto is unavailable here — open the site over https or localhost",
    "crypto.badFormat": "Unrecognized ciphertext: make sure it was produced by this tool",
    "crypto.badPassword": "Decryption failed: wrong password or the ciphertext was modified",
  },
};

export const dict: Record<Locale, Dict> = { zh, en };

interface CodedError extends Error {
  code?: string;
  params?: (string | number)[];
}

/** Resolve a thrown error to a message in the active locale */
export function translateError(error: unknown, locale: Locale): string {
  if (!error) return "";
  const coded = error as CodedError;
  const template = coded.code ? dict[locale].errors[coded.code] : undefined;
  if (!template) {
    return error instanceof Error ? error.message : String(error);
  }
  return template.replace(/\{(\d)\}/g, (_, i: string) => String(coded.params?.[Number(i)] ?? ""));
}
