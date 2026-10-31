export interface MimeType {
  type: string;
  ext: string;
  zh: string;
  en: string;
}

/** Common MIME types, grouped by their top-level type when displayed. */
export const MIME_TYPES: MimeType[] = [
  { type: "text/plain", ext: "txt, text", zh: "纯文本", en: "Plain text" },
  { type: "text/html", ext: "html, htm", zh: "网页", en: "HTML page" },
  { type: "text/css", ext: "css", zh: "样式表", en: "Stylesheet" },
  { type: "text/javascript", ext: "js, mjs", zh: "JavaScript（规范类型）", en: "JavaScript (spec type)" },
  { type: "text/csv", ext: "csv", zh: "逗号分隔表格", en: "Comma-separated values" },
  { type: "text/markdown", ext: "md, markdown", zh: "Markdown 文档", en: "Markdown document" },
  { type: "text/xml", ext: "xml", zh: "XML 文本", en: "XML as text" },
  { type: "text/calendar", ext: "ics", zh: "日历事件", en: "Calendar events" },
  { type: "text/event-stream", ext: "—", zh: "SSE 服务器推送", en: "Server-sent events" },
  { type: "text/vcard", ext: "vcf", zh: "电子名片", en: "vCard contact" },

  { type: "image/png", ext: "png", zh: "无损位图，支持透明", en: "Lossless bitmap with alpha" },
  { type: "image/jpeg", ext: "jpg, jpeg", zh: "有损照片格式", en: "Lossy photo format" },
  { type: "image/gif", ext: "gif", zh: "支持动画与单色透明", en: "Animated, 1-bit transparency" },
  { type: "image/webp", ext: "webp", zh: "Google 的现代图片格式", en: "Google's modern image format" },
  { type: "image/avif", ext: "avif", zh: "基于 AV1 的图片格式", en: "AV1-based image format" },
  { type: "image/svg+xml", ext: "svg", zh: "矢量图，可直接内联", en: "Vector image, can be inlined" },
  { type: "image/bmp", ext: "bmp", zh: "未压缩位图", en: "Uncompressed bitmap" },
  { type: "image/x-icon", ext: "ico", zh: "网站图标", en: "Favicon" },
  { type: "image/tiff", ext: "tif, tiff", zh: "印刷常用位图", en: "Print-oriented bitmap" },

  { type: "audio/mpeg", ext: "mp3", zh: "MP3 音频", en: "MP3 audio" },
  { type: "audio/wav", ext: "wav", zh: "未压缩音频", en: "Uncompressed audio" },
  { type: "audio/ogg", ext: "oga, ogg", zh: "Ogg 容器音频", en: "Ogg audio" },
  { type: "audio/aac", ext: "aac", zh: "AAC 音频", en: "AAC audio" },
  { type: "audio/flac", ext: "flac", zh: "无损音频", en: "Lossless audio" },
  { type: "audio/webm", ext: "weba", zh: "WebM 容器音频", en: "WebM audio" },
  { type: "audio/midi", ext: "mid, midi", zh: "MIDI 乐谱", en: "MIDI score" },

  { type: "video/mp4", ext: "mp4", zh: "MP4 视频", en: "MP4 video" },
  { type: "video/webm", ext: "webm", zh: "WebM 视频", en: "WebM video" },
  { type: "video/ogg", ext: "ogv", zh: "Ogg 容器视频", en: "Ogg video" },
  { type: "video/quicktime", ext: "mov", zh: "QuickTime 视频", en: "QuickTime video" },
  { type: "video/x-matroska", ext: "mkv", zh: "Matroska 视频", en: "Matroska video" },
  { type: "video/mp2t", ext: "ts", zh: "MPEG-2 传输流", en: "MPEG-2 transport stream" },

  { type: "font/woff", ext: "woff", zh: "Web 字体（第一代）", en: "Web font, first generation" },
  { type: "font/woff2", ext: "woff2", zh: "Web 字体（压缩率更高）", en: "Web font, better compression" },
  { type: "font/ttf", ext: "ttf", zh: "TrueType 字体", en: "TrueType font" },
  { type: "font/otf", ext: "otf", zh: "OpenType 字体", en: "OpenType font" },
  { type: "font/collection", ext: "ttc", zh: "字体集合", en: "Font collection" },

  { type: "application/json", ext: "json", zh: "JSON 数据", en: "JSON data" },
  { type: "application/ld+json", ext: "jsonld", zh: "结构化数据（Schema.org）", en: "Structured data (Schema.org)" },
  { type: "application/xml", ext: "xml", zh: "XML 数据", en: "XML data" },
  { type: "application/pdf", ext: "pdf", zh: "PDF 文档", en: "PDF document" },
  { type: "application/zip", ext: "zip", zh: "ZIP 压缩包", en: "ZIP archive" },
  { type: "application/gzip", ext: "gz", zh: "Gzip 压缩文件", en: "Gzip archive" },
  { type: "application/x-tar", ext: "tar", zh: "TAR 归档", en: "TAR archive" },
  { type: "application/x-7z-compressed", ext: "7z", zh: "7-Zip 压缩包", en: "7-Zip archive" },
  { type: "application/vnd.rar", ext: "rar", zh: "RAR 压缩包", en: "RAR archive" },
  { type: "application/wasm", ext: "wasm", zh: "WebAssembly 模块", en: "WebAssembly module" },
  { type: "application/octet-stream", ext: "bin", zh: "未知二进制（触发下载）", en: "Unknown binary, forces a download" },
  { type: "application/x-www-form-urlencoded", ext: "—", zh: "表单提交格式", en: "Form submission body" },
  { type: "application/graphql", ext: "graphql", zh: "GraphQL 查询", en: "GraphQL query" },
  { type: "application/msword", ext: "doc", zh: "Word 97-2003 文档", en: "Word 97-2003 document" },
  { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ext: "docx", zh: "Word 文档", en: "Word document" },
  { type: "application/vnd.ms-excel", ext: "xls", zh: "Excel 97-2003 表格", en: "Excel 97-2003 sheet" },
  { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ext: "xlsx", zh: "Excel 表格", en: "Excel workbook" },
  { type: "application/vnd.ms-powerpoint", ext: "ppt", zh: "PowerPoint 97-2003", en: "PowerPoint 97-2003" },
  { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation", ext: "pptx", zh: "PowerPoint 演示文稿", en: "PowerPoint deck" },
  { type: "application/rtf", ext: "rtf", zh: "富文本格式", en: "Rich text format" },
  { type: "application/epub+zip", ext: "epub", zh: "电子书", en: "E-book" },
  { type: "application/java-archive", ext: "jar", zh: "Java 包", en: "Java archive" },
  { type: "application/x-sh", ext: "sh", zh: "Shell 脚本", en: "Shell script" },
  { type: "application/x-httpd-php", ext: "php", zh: "PHP 脚本", en: "PHP script" },
  { type: "application/vnd.android.package-archive", ext: "apk", zh: "安卓安装包", en: "Android package" },
  { type: "application/x-apple-diskimage", ext: "dmg", zh: "macOS 磁盘映像", en: "macOS disk image" },
  { type: "application/pkcs12", ext: "p12, pfx", zh: "证书与私钥容器", en: "Certificate and key bundle" },
  { type: "application/x-x509-ca-cert", ext: "crt, der", zh: "X.509 证书", en: "X.509 certificate" },

  { type: "multipart/form-data", ext: "—", zh: "带文件的表单上传", en: "Form upload with files" },
  { type: "multipart/byteranges", ext: "—", zh: "多段字节范围响应", en: "Multiple byte ranges" },
  { type: "message/http", ext: "—", zh: "封装的 HTTP 报文", en: "Encapsulated HTTP message" },
];

export const MIME_GROUPS = ["text", "image", "audio", "video", "font", "application", "multipart", "message"];
