/**
 * Character names for the ASCII reference table.
 *
 * Codes 0–127 are described by their control abbreviation plus the usual
 * Chinese name; 128–255 are shown as Latin-1 characters with the block name,
 * since the C1 range has no printable glyphs.
 */

export interface AsciiEntry {
  code: number;
  char: string;
  control: boolean;
  name: string;
  zh: string;
}

const CONTROL_NAMES: Record<number, [string, string]> = {
  0: ["NUL", "空字符"],
  1: ["SOH", "标题开始"],
  2: ["STX", "正文开始"],
  3: ["ETX", "正文结束"],
  4: ["EOT", "传输结束"],
  5: ["ENQ", "询问"],
  6: ["ACK", "确认"],
  7: ["BEL", "响铃"],
  8: ["BS", "退格"],
  9: ["HT", "水平制表"],
  10: ["LF", "换行"],
  11: ["VT", "垂直制表"],
  12: ["FF", "换页"],
  13: ["CR", "回车"],
  14: ["SO", "移出"],
  15: ["SI", "移入"],
  16: ["DLE", "数据链路转义"],
  17: ["DC1", "设备控制 1"],
  18: ["DC2", "设备控制 2"],
  19: ["DC3", "设备控制 3"],
  20: ["DC4", "设备控制 4"],
  21: ["NAK", "否定确认"],
  22: ["SYN", "同步空闲"],
  23: ["ETB", "传输块结束"],
  24: ["CAN", "取消"],
  25: ["EM", "介质结束"],
  26: ["SUB", "替换"],
  27: ["ESC", "转义"],
  28: ["FS", "文件分隔符"],
  29: ["GS", "分组分隔符"],
  30: ["RS", "记录分隔符"],
  31: ["US", "单元分隔符"],
  32: ["SP", "空格"],
  127: ["DEL", "删除"],
};

const PUNCTUATION_NAMES: Record<number, [string, string]> = {
  33: ["Exclamation mark", "感叹号"],
  34: ["Quotation mark", "双引号"],
  35: ["Number sign", "井号"],
  36: ["Dollar sign", "美元符号"],
  37: ["Percent sign", "百分号"],
  38: ["Ampersand", "和号"],
  39: ["Apostrophe", "撇号"],
  40: ["Left parenthesis", "左圆括号"],
  41: ["Right parenthesis", "右圆括号"],
  42: ["Asterisk", "星号"],
  43: ["Plus sign", "加号"],
  44: ["Comma", "逗号"],
  45: ["Hyphen-minus", "连字符"],
  46: ["Full stop", "句点"],
  47: ["Solidus", "斜杠"],
  58: ["Colon", "冒号"],
  59: ["Semicolon", "分号"],
  60: ["Less-than sign", "小于号"],
  61: ["Equals sign", "等号"],
  62: ["Greater-than sign", "大于号"],
  63: ["Question mark", "问号"],
  64: ["Commercial at", "at 符号"],
  91: ["Left square bracket", "左方括号"],
  92: ["Reverse solidus", "反斜杠"],
  93: ["Right square bracket", "右方括号"],
  94: ["Circumflex accent", "脱字符"],
  95: ["Low line", "下划线"],
  96: ["Grave accent", "反引号"],
  123: ["Left curly bracket", "左花括号"],
  124: ["Vertical line", "竖线"],
  125: ["Right curly bracket", "右花括号"],
  126: ["Tilde", "波浪号"],
};

function describe(code: number): [string, string] {
  const control = CONTROL_NAMES[code];
  if (control) return control;
  if (code === 32) return ["SP", "空格"];
  if (code >= 48 && code <= 57) {
    const digit = String.fromCharCode(code);
    return [`Digit ${digit}`, `数字 ${digit}`];
  }
  if (code >= 65 && code <= 90) {
    const letter = String.fromCharCode(code);
    return [`Latin capital letter ${letter}`, `大写字母 ${letter}`];
  }
  if (code >= 97 && code <= 122) {
    const letter = String.fromCharCode(code);
    return [`Latin small letter ${letter}`, `小写字母 ${letter}`];
  }
  return PUNCTUATION_NAMES[code] ?? ["", ""];
}

export function asciiEntries(includeLatin1 = false): AsciiEntry[] {
  const end = includeLatin1 ? 256 : 128;
  return Array.from({ length: end }, (_, code) => {
    const control = code < 32 || code === 127;
    const [name, zh] =
      code > 127
        ? code < 160
          ? ["C1 control", "C1 控制符"]
          : ["Latin-1 supplement", "Latin-1 补充"]
        : describe(code);
    return {
      code,
      // Control characters have no glyph of their own.
      char: control ? "" : String.fromCharCode(code),
      control,
      name,
      zh,
    };
  });
}

/** Escape a character the way it would appear inside an HTML entity. */
export function htmlEntity(code: number): string {
  return `&#${code};`;
}
