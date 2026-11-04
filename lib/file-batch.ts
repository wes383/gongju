/**
 * Pure helpers behind the file-batch tools: rename planning, duplicate
 * grouping, magic-number sniffing, folder comparison and manifest export.
 *
 * Everything here is React-free and runs in Node, so the tricky parts can be
 * unit-tested without touching a real File object.
 */
import { formatBytes } from "./files";
import type { Locale } from "./i18n";

/* ------------------------------------------------------------------ names */

/** Last extension of a file name, lower-cased, without the dot. */
export function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  if (dot <= 0 || dot === name.length - 1) return "";
  return name.slice(dot + 1).toLowerCase();
}

/** Split a name into stem and extension (extension keeps no dot). */
export function splitExtension(name: string): { stem: string; ext: string } {
  const dot = name.lastIndexOf(".");
  if (dot <= 0 || dot === name.length - 1) return { stem: name, ext: "" };
  return { stem: name.slice(0, dot), ext: name.slice(dot + 1) };
}

/** Directory portion of a relative path, with a trailing slash ("" at the top). */
export function dirOf(path: string): string {
  const slash = path.lastIndexOf("/");
  return slash < 0 ? "" : path.slice(0, slash + 1);
}

export function baseNameOfPath(path: string): string {
  const slash = path.lastIndexOf("/");
  return slash < 0 ? path : path.slice(slash + 1);
}

/** Drop the folder the user picked, keeping only what is below it. */
export function relativePathOf(file: { name: string; webkitRelativePath?: string }): string {
  const path = file.webkitRelativePath || file.name;
  const slash = path.indexOf("/");
  return slash < 0 ? path : path.slice(slash + 1);
}

const ILLEGAL_NAME_CHARS = /[\\/:*?"<>|\u0000-\u001f]/g;
const RESERVED_NAME = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;
const MAX_NAME_LENGTH = 255;

/** Make a single path segment safe on Windows, macOS and Linux. */
export function sanitizeFileName(name: string): string {
  let clean = name.replace(ILLEGAL_NAME_CHARS, "_").replace(/[. ]+$/, "");
  if (RESERVED_NAME.test(clean)) clean = `_${clean}`;
  return clean;
}

function fitName(name: string, ext: string): string {
  if (name.length <= MAX_NAME_LENGTH) return name;
  const suffix = ext ? `.${ext}` : "";
  return name.slice(0, MAX_NAME_LENGTH - suffix.length) + suffix;
}

/* -------------------------------------------------------------- batch rename */

export type NumberPlace = "prefix" | "suffix";
export type ExtensionMode = "keep" | "lower" | "upper" | "custom";

export interface RenameOptions {
  prefix: string;
  suffix: string;
  find: string;
  replace: string;
  useRegex: boolean;
  caseSensitive: boolean;
  numbered: boolean;
  start: number;
  step: number;
  digits: number;
  numberPlace: NumberPlace;
  extension: ExtensionMode;
  customExtension: string;
}

export const DEFAULT_RENAME_OPTIONS: RenameOptions = {
  prefix: "",
  suffix: "",
  find: "",
  replace: "",
  useRegex: false,
  caseSensitive: true,
  numbered: true,
  start: 1,
  step: 1,
  digits: 3,
  numberPlace: "suffix",
  extension: "keep",
  customExtension: "",
};

export type RenameIssue = "empty" | "duplicate";

export interface RenameRow {
  path: string;
  dir: string;
  oldName: string;
  newName: string;
  changed: boolean;
  issue?: RenameIssue;
}

export interface RenamePlan {
  rows: RenameRow[];
  /** The find pattern is not a valid regular expression */
  patternInvalid: boolean;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Build the old → new mapping for a set of relative paths.
 *
 * Numbering follows the order the paths were passed in, which is the order the
 * picker shows, so the preview and the downloaded zip always agree.
 */
export function buildRenamePlan(paths: string[], options: RenameOptions): RenamePlan {
  const digits = Math.min(Math.max(Math.trunc(options.digits) || 1, 1), 12);
  const start = Math.trunc(options.start) || 0;
  const step = Math.trunc(options.step) || 0;

  let pattern: RegExp | null = null;
  let patternInvalid = false;
  if (options.find && options.useRegex) {
    try {
      pattern = new RegExp(options.find, options.caseSensitive ? "g" : "gi");
    } catch {
      patternInvalid = true;
    }
  }

  const rows: RenameRow[] = [];
  const seen = new Map<string, number>();

  paths.forEach((path, index) => {
    const dir = dirOf(path);
    const oldName = baseNameOfPath(path);
    const { stem: originalStem, ext: originalExt } = splitExtension(oldName);

    let stem = originalStem;
    if (options.find && !patternInvalid) {
      if (pattern) {
        stem = stem.replace(pattern, options.replace);
      } else if (options.caseSensitive) {
        stem = stem.split(options.find).join(options.replace);
      } else {
        stem = stem.replace(new RegExp(escapeRegExp(options.find), "gi"), options.replace);
      }
    }

    const sequence = String(start + index * step).padStart(digits, "0");
    const core =
      options.numbered && options.numberPlace === "prefix"
        ? `${options.prefix}${sequence}-${stem}${options.suffix}`
        : options.numbered
          ? `${options.prefix}${stem}${options.suffix}-${sequence}`
          : `${options.prefix}${stem}${options.suffix}`;

    let ext = originalExt;
    if (options.extension === "lower") ext = ext.toLowerCase();
    else if (options.extension === "upper") ext = ext.toUpperCase();
    else if (options.extension === "custom") {
      ext = options.customExtension.replace(/^\.+/, "");
    }

    let newName = sanitizeFileName(ext ? `${core}.${ext}` : core);
    newName = fitName(newName, ext);

    const key = `${dir}${newName}`.toLowerCase();
    const stemPart = ext ? newName.slice(0, newName.length - ext.length - 1) : newName;
    let issue: RenameIssue | undefined;
    if (!stemPart.replace(/[-_ .]/g, "")) {
      issue = "empty";
    } else if (seen.has(key)) {
      issue = "duplicate";
    } else {
      seen.set(key, index);
    }

    rows.push({
      path,
      dir,
      oldName,
      newName,
      changed: newName !== oldName,
      issue,
    });
  });

  return { rows, patternInvalid };
}

/* -------------------------------------------------------------- duplicates */

export interface SizedItem<T> {
  item: T;
  size: number;
}

export interface CandidateGroup<T> {
  size: number;
  items: T[];
}

/** Cheap first pass: files can only be duplicates when their sizes match. */
export function duplicateCandidates<T>(files: SizedItem<T>[]): CandidateGroup<T>[] {
  const bySize = new Map<number, T[]>();
  for (const entry of files) {
    if (entry.size <= 0) continue;
    const list = bySize.get(entry.size);
    if (list) list.push(entry.item);
    else bySize.set(entry.size, [entry.item]);
  }
  return [...bySize.entries()]
    .filter(([, items]) => items.length > 1)
    .map(([size, items]) => ({ size, items }))
    .sort((a, b) => b.size - a.size);
}

export interface DuplicateGroup<T> {
  hash: string;
  size: number;
  items: T[];
}

/** Second pass: group the hashed candidates and keep the real duplicates. */
export function assembleDuplicateGroups<T>(
  hashed: { item: T; size: number; hash: string }[]
): DuplicateGroup<T>[] {
  const groups = new Map<string, DuplicateGroup<T>>();
  for (const entry of hashed) {
    const key = `${entry.size}:${entry.hash}`;
    const group = groups.get(key);
    if (group) group.items.push(entry.item);
    else groups.set(key, { hash: entry.hash, size: entry.size, items: [entry.item] });
  }
  return [...groups.values()]
    .filter((group) => group.items.length > 1)
    .sort((a, b) => b.size * (b.items.length - 1) - a.size * (a.items.length - 1));
}

/** Bytes that a duplicate group wastes. */
export function wastedBytes<T>(groups: DuplicateGroup<T>[]): number {
  return groups.reduce((sum, group) => sum + group.size * (group.items.length - 1), 0);
}

/* ------------------------------------------------------------ type sniffing */

export type FileKind =
  | "image"
  | "audio"
  | "video"
  | "archive"
  | "document"
  | "font"
  | "executable"
  | "data"
  | "text"
  | "unknown";

export interface LocalizedLabel {
  zh: string;
  en: string;
}

interface SignatureDef {
  ext: string;
  aliases?: string[];
  mime: string;
  label: LocalizedLabel;
  kind: FileKind;
  /** Every accepted magic; checked at `offset` */
  magics: number[][];
  offset?: number;
}

const SIGNATURES: SignatureDef[] = [
  // Images
  {
    ext: "png",
    mime: "image/png",
    label: { zh: "PNG 图片", en: "PNG image" },
    kind: "image",
    magics: [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  },
  {
    ext: "jpg",
    aliases: ["jpeg", "jpe", "jfif"],
    mime: "image/jpeg",
    label: { zh: "JPEG 图片", en: "JPEG image" },
    kind: "image",
    magics: [[0xff, 0xd8, 0xff]],
  },
  {
    ext: "gif",
    mime: "image/gif",
    label: { zh: "GIF 图片", en: "GIF image" },
    kind: "image",
    magics: [
      [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
      [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
    ],
  },
  {
    ext: "bmp",
    mime: "image/bmp",
    label: { zh: "BMP 位图", en: "BMP bitmap" },
    kind: "image",
    magics: [[0x42, 0x4d]],
  },
  {
    ext: "ico",
    aliases: ["cur"],
    mime: "image/x-icon",
    label: { zh: "ICO 图标", en: "ICO icon" },
    kind: "image",
    magics: [
      [0x00, 0x00, 0x01, 0x00],
      [0x00, 0x00, 0x02, 0x00],
    ],
  },
  {
    ext: "tif",
    aliases: ["tiff"],
    mime: "image/tiff",
    label: { zh: "TIFF 图片", en: "TIFF image" },
    kind: "image",
    magics: [
      [0x49, 0x49, 0x2a, 0x00],
      [0x4d, 0x4d, 0x00, 0x2a],
    ],
  },
  {
    ext: "psd",
    mime: "image/vnd.adobe.photoshop",
    label: { zh: "Photoshop 文档", en: "Photoshop document" },
    kind: "image",
    magics: [[0x38, 0x42, 0x50, 0x53]],
  },
  // Audio
  {
    ext: "mp3",
    mime: "audio/mpeg",
    label: { zh: "MP3 音频", en: "MP3 audio" },
    kind: "audio",
    magics: [[0x49, 0x44, 0x33], [0xff, 0xfb], [0xff, 0xf3], [0xff, 0xf2]],
  },
  {
    ext: "flac",
    mime: "audio/flac",
    label: { zh: "FLAC 无损音频", en: "FLAC audio" },
    kind: "audio",
    magics: [[0x66, 0x4c, 0x61, 0x43]],
  },
  {
    ext: "ogg",
    aliases: ["oga"],
    mime: "audio/ogg",
    label: { zh: "Ogg 音频", en: "Ogg audio" },
    kind: "audio",
    magics: [[0x4f, 0x67, 0x67, 0x53]],
  },
  {
    ext: "aac",
    mime: "audio/aac",
    label: { zh: "AAC 音频", en: "AAC audio" },
    kind: "audio",
    magics: [[0xff, 0xf1], [0xff, 0xf9]],
  },
  {
    ext: "amr",
    mime: "audio/amr",
    label: { zh: "AMR 音频", en: "AMR audio" },
    kind: "audio",
    magics: [[0x23, 0x21, 0x41, 0x4d, 0x52]],
  },
  {
    ext: "mid",
    aliases: ["midi"],
    mime: "audio/midi",
    label: { zh: "MIDI 音乐", en: "MIDI file" },
    kind: "audio",
    magics: [[0x4d, 0x54, 0x68, 0x64]],
  },
  // Video
  {
    ext: "flv",
    mime: "video/x-flv",
    label: { zh: "FLV 视频", en: "FLV video" },
    kind: "video",
    magics: [[0x46, 0x4c, 0x56]],
  },
  {
    ext: "mkv",
    aliases: ["webm"],
    mime: "video/x-matroska",
    label: { zh: "Matroska 视频", en: "Matroska video" },
    kind: "video",
    magics: [[0x1a, 0x45, 0xdf, 0xa3]],
  },
  {
    ext: "mpg",
    aliases: ["mpeg", "m2v"],
    mime: "video/mpeg",
    label: { zh: "MPEG 视频", en: "MPEG video" },
    kind: "video",
    magics: [
      [0x00, 0x00, 0x01, 0xba],
      [0x00, 0x00, 0x01, 0xb3],
    ],
  },
  // Archives
  {
    ext: "zip",
    aliases: ["docx", "xlsx", "pptx", "odt", "ods", "odp", "epub", "apk", "jar", "whl"],
    mime: "application/zip",
    label: { zh: "ZIP 容器（Office / EPUB 等同族）", en: "ZIP container (Office, EPUB and friends)" },
    kind: "archive",
    magics: [
      [0x50, 0x4b, 0x03, 0x04],
      [0x50, 0x4b, 0x05, 0x06],
      [0x50, 0x4b, 0x07, 0x08],
    ],
  },
  {
    ext: "rar",
    mime: "application/vnd.rar",
    label: { zh: "RAR 压缩包", en: "RAR archive" },
    kind: "archive",
    magics: [[0x52, 0x61, 0x72, 0x21, 0x1a, 0x07]],
  },
  {
    ext: "7z",
    mime: "application/x-7z-compressed",
    label: { zh: "7z 压缩包", en: "7z archive" },
    kind: "archive",
    magics: [[0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]],
  },
  {
    ext: "gz",
    aliases: ["gzip", "tgz"],
    mime: "application/gzip",
    label: { zh: "GZIP 压缩包", en: "GZIP archive" },
    kind: "archive",
    magics: [[0x1f, 0x8b]],
  },
  {
    ext: "bz2",
    mime: "application/x-bzip2",
    label: { zh: "BZIP2 压缩包", en: "BZIP2 archive" },
    kind: "archive",
    magics: [[0x42, 0x5a, 0x68]],
  },
  {
    ext: "xz",
    mime: "application/x-xz",
    label: { zh: "XZ 压缩包", en: "XZ archive" },
    kind: "archive",
    magics: [[0xfd, 0x37, 0x7a, 0x58, 0x5a, 0x00]],
  },
  {
    ext: "zst",
    mime: "application/zstd",
    label: { zh: "Zstandard 压缩包", en: "Zstandard archive" },
    kind: "archive",
    magics: [[0x28, 0xb5, 0x2f, 0xfd]],
  },
  {
    ext: "tar",
    mime: "application/x-tar",
    label: { zh: "TAR 归档", en: "TAR archive" },
    kind: "archive",
    magics: [[0x75, 0x73, 0x74, 0x61, 0x72]],
    offset: 257,
  },
  {
    ext: "cab",
    mime: "application/vnd.ms-cab-compressed",
    label: { zh: "CAB 压缩包", en: "CAB archive" },
    kind: "archive",
    magics: [[0x4d, 0x53, 0x43, 0x46]],
  },
  // Documents
  {
    ext: "pdf",
    mime: "application/pdf",
    label: { zh: "PDF 文档", en: "PDF document" },
    kind: "document",
    magics: [[0x25, 0x50, 0x44, 0x46, 0x2d]],
  },
  {
    ext: "doc",
    aliases: ["xls", "ppt", "msg", "vsd"],
    mime: "application/x-ole-storage",
    label: { zh: "OLE 文档（旧版 Office）", en: "OLE document (legacy Office)" },
    kind: "document",
    magics: [[0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]],
  },
  {
    ext: "rtf",
    mime: "application/rtf",
    label: { zh: "RTF 文档", en: "RTF document" },
    kind: "document",
    magics: [[0x7b, 0x5c, 0x72, 0x74, 0x66]],
  },
  // Fonts
  {
    ext: "ttf",
    mime: "font/ttf",
    label: { zh: "TrueType 字体", en: "TrueType font" },
    kind: "font",
    magics: [[0x00, 0x01, 0x00, 0x00]],
  },
  {
    ext: "otf",
    mime: "font/otf",
    label: { zh: "OpenType 字体", en: "OpenType font" },
    kind: "font",
    magics: [[0x4f, 0x54, 0x54, 0x4f]],
  },
  {
    ext: "woff",
    mime: "font/woff",
    label: { zh: "WOFF 字体", en: "WOFF font" },
    kind: "font",
    magics: [[0x77, 0x4f, 0x46, 0x46]],
  },
  {
    ext: "woff2",
    mime: "font/woff2",
    label: { zh: "WOFF2 字体", en: "WOFF2 font" },
    kind: "font",
    magics: [[0x77, 0x4f, 0x46, 0x32]],
  },
  {
    ext: "ttc",
    mime: "font/collection",
    label: { zh: "字体集合", en: "Font collection" },
    kind: "font",
    magics: [[0x74, 0x74, 0x63, 0x66]],
  },
  // Executables and data
  {
    ext: "exe",
    aliases: ["dll", "sys", "scr"],
    mime: "application/vnd.microsoft.portable-executable",
    label: { zh: "Windows 可执行文件", en: "Windows executable" },
    kind: "executable",
    magics: [[0x4d, 0x5a]],
  },
  {
    ext: "elf",
    mime: "application/x-elf",
    label: { zh: "ELF 可执行文件", en: "ELF binary" },
    kind: "executable",
    magics: [[0x7f, 0x45, 0x4c, 0x46]],
  },
  {
    ext: "class",
    mime: "application/java-vm",
    label: { zh: "Java 字节码", en: "Java bytecode" },
    kind: "executable",
    magics: [[0xca, 0xfe, 0xba, 0xbe]],
  },
  {
    ext: "wasm",
    mime: "application/wasm",
    label: { zh: "WebAssembly 模块", en: "WebAssembly module" },
    kind: "executable",
    magics: [[0x00, 0x61, 0x73, 0x6d]],
  },
  {
    ext: "sqlite",
    aliases: ["db", "sqlite3"],
    mime: "application/vnd.sqlite3",
    label: { zh: "SQLite 数据库", en: "SQLite database" },
    kind: "data",
    magics: [[0x53, 0x51, 0x4c, 0x69, 0x74, 0x65, 0x20, 0x66, 0x6f, 0x72, 0x6d, 0x61, 0x74, 0x20, 0x33, 0x00]],
  },
  {
    ext: "parquet",
    mime: "application/vnd.apache.parquet",
    label: { zh: "Parquet 数据文件", en: "Parquet data file" },
    kind: "data",
    magics: [[0x50, 0x41, 0x52, 0x31]],
  },
  {
    ext: "pcap",
    mime: "application/vnd.tcpdump.pcap",
    label: { zh: "网络抓包", en: "Packet capture" },
    kind: "data",
    magics: [
      [0xd4, 0xc3, 0xb2, 0xa1],
      [0xa1, 0xb2, 0xc3, 0xd4],
    ],
  },
];

/** Text formats are detected from the extension once the bytes look textual. */
const TEXT_TYPES: Record<string, { mime: string; label: LocalizedLabel }> = {
  txt: { mime: "text/plain", label: { zh: "纯文本", en: "Plain text" } },
  text: { mime: "text/plain", label: { zh: "纯文本", en: "Plain text" } },
  log: { mime: "text/plain", label: { zh: "日志文本", en: "Log file" } },
  md: { mime: "text/markdown", label: { zh: "Markdown 文档", en: "Markdown document" } },
  markdown: { mime: "text/markdown", label: { zh: "Markdown 文档", en: "Markdown document" } },
  html: { mime: "text/html", label: { zh: "HTML 网页", en: "HTML page" } },
  htm: { mime: "text/html", label: { zh: "HTML 网页", en: "HTML page" } },
  xml: { mime: "application/xml", label: { zh: "XML 文档", en: "XML document" } },
  svg: { mime: "image/svg+xml", label: { zh: "SVG 矢量图", en: "SVG image" } },
  json: { mime: "application/json", label: { zh: "JSON 数据", en: "JSON data" } },
  jsonl: { mime: "application/x-ndjson", label: { zh: "JSON Lines 数据", en: "JSON Lines data" } },
  csv: { mime: "text/csv", label: { zh: "CSV 表格", en: "CSV table" } },
  tsv: { mime: "text/tab-separated-values", label: { zh: "TSV 表格", en: "TSV table" } },
  css: { mime: "text/css", label: { zh: "CSS 样式表", en: "CSS stylesheet" } },
  js: { mime: "text/javascript", label: { zh: "JavaScript 脚本", en: "JavaScript source" } },
  mjs: { mime: "text/javascript", label: { zh: "JavaScript 脚本", en: "JavaScript source" } },
  ts: { mime: "text/plain", label: { zh: "TypeScript 源码", en: "TypeScript source" } },
  tsx: { mime: "text/plain", label: { zh: "TypeScript 源码", en: "TypeScript source" } },
  py: { mime: "text/x-python", label: { zh: "Python 源码", en: "Python source" } },
  go: { mime: "text/plain", label: { zh: "Go 源码", en: "Go source" } },
  rs: { mime: "text/plain", label: { zh: "Rust 源码", en: "Rust source" } },
  java: { mime: "text/plain", label: { zh: "Java 源码", en: "Java source" } },
  yml: { mime: "application/yaml", label: { zh: "YAML 配置", en: "YAML config" } },
  yaml: { mime: "application/yaml", label: { zh: "YAML 配置", en: "YAML config" } },
  toml: { mime: "application/toml", label: { zh: "TOML 配置", en: "TOML config" } },
  ini: { mime: "text/plain", label: { zh: "INI 配置", en: "INI config" } },
  conf: { mime: "text/plain", label: { zh: "配置文件", en: "Config file" } },
  sh: { mime: "application/x-sh", label: { zh: "Shell 脚本", en: "Shell script" } },
  ps1: { mime: "text/plain", label: { zh: "PowerShell 脚本", en: "PowerShell script" } },
  bat: { mime: "text/plain", label: { zh: "批处理脚本", en: "Batch script" } },
  sql: { mime: "application/sql", label: { zh: "SQL 脚本", en: "SQL script" } },
  srt: { mime: "application/x-subrip", label: { zh: "SRT 字幕", en: "SRT subtitles" } },
  vtt: { mime: "text/vtt", label: { zh: "WebVTT 字幕", en: "WebVTT subtitles" } },
  lrc: { mime: "text/plain", label: { zh: "LRC 歌词", en: "LRC lyrics" } },
};

const PLAIN_TEXT: { mime: string; label: LocalizedLabel } = {
  mime: "text/plain",
  label: { zh: "纯文本", en: "Plain text" },
};

const UNKNOWN_BINARY: LocalizedLabel = { zh: "未知二进制", en: "Unknown binary" };

export interface TypeDetection {
  ext: string | null;
  aliases: string[];
  mime: string | null;
  label: LocalizedLabel;
  kind: FileKind;
  /** Where the verdict came from: bytes, the extension, or nowhere. */
  source: "content" | "extension" | "none";
  /** First bytes of the file, spaced hex */
  hex: string;
}

function asciiAt(bytes: Uint8Array, offset: number, length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    const byte = bytes[offset + i];
    if (byte === undefined) return out;
    out += String.fromCharCode(byte);
  }
  return out;
}

function matchesMagic(bytes: Uint8Array, magic: number[], offset = 0): boolean {
  if (bytes.length < offset + magic.length) return false;
  for (let i = 0; i < magic.length; i++) {
    if (bytes[offset + i] !== magic[i]) return false;
  }
  return true;
}

function hexPreview(bytes: Uint8Array, length = 16): string {
  return [...bytes.slice(0, length)].map((b) => b.toString(16).padStart(2, "0")).join(" ");
}

function looksLikeText(bytes: Uint8Array): boolean {
  if (bytes.length === 0) return false;
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return true;
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return true;
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return true;
  let control = 0;
  for (const byte of bytes) {
    if (byte === 0x00) return false;
    if (byte < 0x09 || (byte > 0x0d && byte < 0x20)) control += 1;
  }
  return control / bytes.length < 0.05;
}

/** ISO-BMFF (`ftyp`) covers MP4, MOV, HEIF, AVIF and M4A. */
const FTYP_BRANDS: Record<string, SignatureDef> = {
  avif: {
    ext: "avif",
    mime: "image/avif",
    label: { zh: "AVIF 图片", en: "AVIF image" },
    kind: "image",
    magics: [],
  },
  avis: {
    ext: "avif",
    mime: "image/avif",
    label: { zh: "AVIF 图片", en: "AVIF image" },
    kind: "image",
    magics: [],
  },
  heic: {
    ext: "heic",
    aliases: ["heif"],
    mime: "image/heic",
    label: { zh: "HEIC 图片", en: "HEIC image" },
    kind: "image",
    magics: [],
  },
  heix: {
    ext: "heic",
    aliases: ["heif"],
    mime: "image/heic",
    label: { zh: "HEIC 图片", en: "HEIC image" },
    kind: "image",
    magics: [],
  },
  mif1: {
    ext: "heif",
    aliases: ["heic"],
    mime: "image/heif",
    label: { zh: "HEIF 图片", en: "HEIF image" },
    kind: "image",
    magics: [],
  },
  qt: {
    ext: "mov",
    aliases: ["movie"],
    mime: "video/quicktime",
    label: { zh: "QuickTime 视频", en: "QuickTime video" },
    kind: "video",
    magics: [],
  },
  m4a: {
    ext: "m4a",
    aliases: ["m4b", "m4p"],
    mime: "audio/mp4",
    label: { zh: "M4A 音频", en: "M4A audio" },
    kind: "audio",
    magics: [],
  },
  "3gp": {
    ext: "3gp",
    aliases: ["3g2"],
    mime: "video/3gpp",
    label: { zh: "3GP 视频", en: "3GP video" },
    kind: "video",
    magics: [],
  },
};

const FTYP_MP4: SignatureDef = {
  ext: "mp4",
  aliases: ["m4v", "mp4v"],
  mime: "video/mp4",
  label: { zh: "MP4 视频", en: "MP4 video" },
  kind: "video",
  magics: [],
};

function detectFtyp(bytes: Uint8Array): SignatureDef | null {
  if (asciiAt(bytes, 4, 4) !== "ftyp") return null;
  const brand = asciiAt(bytes, 8, 4).trim().toLowerCase();
  return FTYP_BRANDS[brand] ?? FTYP_MP4;
}

function detectRiff(bytes: Uint8Array): SignatureDef | null {
  if (asciiAt(bytes, 0, 4) !== "RIFF") return null;
  const form = asciiAt(bytes, 8, 4);
  if (form === "WAVE") {
    return {
      ext: "wav",
      mime: "audio/wav",
      label: { zh: "WAV 音频", en: "WAV audio" },
      kind: "audio",
      magics: [],
    };
  }
  if (form === "AVI ") {
    return {
      ext: "avi",
      mime: "video/x-msvideo",
      label: { zh: "AVI 视频", en: "AVI video" },
      kind: "video",
      magics: [],
    };
  }
  if (form === "WEBP") {
    return {
      ext: "webp",
      mime: "image/webp",
      label: { zh: "WebP 图片", en: "WebP image" },
      kind: "image",
      magics: [],
    };
  }
  return null;
}

function detectAsf(bytes: Uint8Array): SignatureDef | null {
  if (!matchesMagic(bytes, [0x30, 0x26, 0xb2, 0x75])) return null;
  return {
    ext: "wmv",
    aliases: ["wma", "asf"],
    mime: "video/x-ms-wmv",
    label: { zh: "Windows Media 文件", en: "Windows Media file" },
    kind: "video",
    magics: [],
  };
}

/**
 * Identify a file from its first bytes, falling back to the extension for
 * text formats. `fileName` only affects text detection and is optional.
 */
export function sniffFileType(bytes: Uint8Array, fileName = ""): TypeDetection {
  const hex = hexPreview(bytes);
  const ext = extensionOf(fileName);

  if (bytes.length === 0) {
    const textType = TEXT_TYPES[ext] ?? PLAIN_TEXT;
    return {
      ext: ext || "txt",
      aliases: [],
      mime: textType.mime,
      label: textType.label,
      kind: "text",
      source: ext ? "extension" : "none",
      hex,
    };
  }

  const special = detectFtyp(bytes) ?? detectRiff(bytes) ?? detectAsf(bytes);
  if (special) {
    return {
      ext: special.ext,
      aliases: special.aliases ?? [],
      mime: special.mime,
      label: special.label,
      kind: special.kind,
      source: "content",
      hex,
    };
  }

  for (const signature of SIGNATURES) {
    const offset = signature.offset ?? 0;
    if (signature.magics.some((magic) => matchesMagic(bytes, magic, offset))) {
      return {
        ext: signature.ext,
        aliases: signature.aliases ?? [],
        mime: signature.mime,
        label: signature.label,
        kind: signature.kind,
        source: "content",
        hex,
      };
    }
  }

  if (looksLikeText(bytes)) {
    const textType = TEXT_TYPES[ext] ?? PLAIN_TEXT;
    return {
      ext: ext || "txt",
      aliases: [],
      mime: textType.mime,
      label: textType.label,
      kind: "text",
      source: "extension",
      hex,
    };
  }

  return {
    ext: null,
    aliases: [],
    mime: null,
    label: UNKNOWN_BINARY,
    kind: "unknown",
    source: "none",
    hex,
  };
}

/** Does the file name's extension agree with the detected content type? */
export function extensionMismatch(detection: TypeDetection, fileName: string): boolean {
  if (detection.source !== "content" || !detection.ext) return false;
  const actual = extensionOf(fileName);
  if (!actual) return false;
  const expected = [detection.ext, ...detection.aliases].map((e) => e.toLowerCase());
  return !expected.includes(actual);
}

export function typeLabel(detection: TypeDetection, locale: Locale): string {
  return detection.label[locale];
}

/* -------------------------------------------------------- folder comparison */

export interface FolderEntry<T> {
  path: string;
  size: number;
  item: T;
}

export type CompareStatus = "same" | "changed" | "only-a" | "only-b";

export interface CompareRow<T> {
  path: string;
  status: CompareStatus;
  a: FolderEntry<T> | null;
  b: FolderEntry<T> | null;
  hashA?: string;
  hashB?: string;
}

export interface CompareHashes {
  a: Map<string, string>;
  b: Map<string, string>;
}

/**
 * Compare two file sets by relative path. Without hashes, files are equal when
 * their sizes match; with hashes, equal size but differing digests become
 * "changed", which is the only way to catch same-size edits.
 */
export function compareFolders<T>(
  setA: FolderEntry<T>[],
  setB: FolderEntry<T>[],
  hashes?: CompareHashes
): CompareRow<T>[] {
  const mapA = new Map(setA.map((entry) => [entry.path, entry]));
  const mapB = new Map(setB.map((entry) => [entry.path, entry]));
  const rows: CompareRow<T>[] = [];

  for (const [path, a] of mapA) {
    const b = mapB.get(path);
    if (!b) {
      rows.push({ path, status: "only-a", a, b: null });
      continue;
    }
    const hashA = hashes?.a.get(path);
    const hashB = hashes?.b.get(path);
    const sameSize = a.size === b.size;
    const sameHash = hashA !== undefined && hashB !== undefined ? hashA === hashB : true;
    rows.push({
      path,
      status: sameSize && sameHash ? "same" : "changed",
      a,
      b,
      hashA,
      hashB,
    });
  }

  for (const [path, b] of mapB) {
    if (!mapA.has(path)) rows.push({ path, status: "only-b", a: null, b });
  }

  return rows.sort((left, right) => left.path.localeCompare(right.path));
}

export interface CompareSummary {
  total: number;
  same: number;
  changed: number;
  onlyA: number;
  onlyB: number;
}

export function summarizeComparison<T>(rows: CompareRow<T>[]): CompareSummary {
  const summary: CompareSummary = {
    total: rows.length,
    same: 0,
    changed: 0,
    onlyA: 0,
    onlyB: 0,
  };
  for (const row of rows) {
    if (row.status === "same") summary.same += 1;
    else if (row.status === "changed") summary.changed += 1;
    else if (row.status === "only-a") summary.onlyA += 1;
    else summary.onlyB += 1;
  }
  return summary;
}

/* ------------------------------------------------------------- manifest export */

export interface ManifestRow {
  path: string;
  size: number;
  lastModified: number;
  hash?: string;
}

function quoteCsv(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** CSV manifest, BOM included so Excel shows Chinese paths correctly. */
export function manifestCsv(rows: ManifestRow[], hashLabel: string): string {
  const lines = ["path,size,size_bytes,last_modified," + quoteCsv(hashLabel.toLowerCase())];
  for (const row of rows) {
    const modified = row.lastModified ? new Date(row.lastModified).toISOString() : "";
    lines.push(
      [
        quoteCsv(row.path),
        quoteCsv(formatBytes(row.size)),
        String(row.size),
        quoteCsv(modified),
        quoteCsv(row.hash ?? ""),
      ].join(",")
    );
  }
  return "\uFEFF" + lines.join("\r\n") + "\r\n";
}

/** `sha256sum`-compatible text: digest, two spaces, path. */
export function checksumText(rows: ManifestRow[]): string {
  return (
    rows
      .filter((row) => row.hash)
      .map((row) => `${row.hash}  ${row.path}`)
      .join("\n") + "\n"
  );
}


