/**
 * Character names for the ASCII reference table.
 *
 * Codes 0–127 are described by their control abbreviation plus the usual
 * Chinese name; 128–255 are the Latin-1 block, named per code point like the
 * Unicode standard does so `©` reads as "Copyright sign" instead of a block
 * label.
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

/** U+0080–U+009F: the C1 control block, which has no glyph of its own. */
const C1_NAMES: Record<number, [string, string]> = {
  128: ["PAD", "填充字符"],
  129: ["HOP", "高位组预设"],
  130: ["BPH", "允许在此换行"],
  131: ["NBH", "禁止在此换行"],
  132: ["IND", "索引"],
  133: ["NEL", "下一行"],
  134: ["SSA", "选定区域开始"],
  135: ["ESA", "选定区域结束"],
  136: ["HTS", "制表位设置"],
  137: ["HTJ", "带对齐的制表"],
  138: ["VTS", "行制表位设置"],
  139: ["PLD", "部分下移"],
  140: ["PLU", "部分上移"],
  141: ["RI", "反向换行"],
  142: ["SS2", "单次移位 2"],
  143: ["SS3", "单次移位 3"],
  144: ["DCS", "设备控制字符串"],
  145: ["PU1", "专用字符 1"],
  146: ["PU2", "专用字符 2"],
  147: ["STS", "设置发送状态"],
  148: ["CCH", "取消字符"],
  149: ["MW", "消息等待"],
  150: ["SPA", "保护区开始"],
  151: ["EPA", "保护区结束"],
  152: ["SOS", "字符串开始"],
  153: ["SGC", "单图形字符引导符"],
  154: ["SCI", "单字符引导符"],
  155: ["CSI", "控制序列引导符"],
  156: ["ST", "字符串终止符"],
  157: ["OSC", "操作系统命令"],
  158: ["PM", "隐私消息"],
  159: ["APC", "应用程序命令"],
};

/** Symbols in U+00A0–U+00BF plus the two arithmetic signs further down. */
const LATIN1_SYMBOLS: Record<number, [string, string]> = {
  160: ["No-break space", "不换行空格"],
  161: ["Inverted exclamation mark", "倒感叹号"],
  162: ["Cent sign", "分币符号"],
  163: ["Pound sign", "英镑符号"],
  164: ["Currency sign", "货币符号"],
  165: ["Yen sign", "日元符号"],
  166: ["Broken bar", "断竖线"],
  167: ["Section sign", "章节符号"],
  168: ["Diaeresis", "分音符"],
  169: ["Copyright sign", "版权符号"],
  170: ["Feminine ordinal indicator", "阴性序数符号"],
  171: ["Left-pointing double angle quotation mark", "左双角引号"],
  172: ["Not sign", "否定符号"],
  173: ["Soft hyphen", "软连字符"],
  174: ["Registered sign", "注册商标符号"],
  175: ["Macron", "长音符"],
  176: ["Degree sign", "度符号"],
  177: ["Plus-minus sign", "正负号"],
  178: ["Superscript two", "上标 2"],
  179: ["Superscript three", "上标 3"],
  180: ["Acute accent", "锐音符"],
  181: ["Micro sign", "微符号"],
  182: ["Pilcrow sign", "段落符号"],
  183: ["Middle dot", "中点"],
  184: ["Cedilla", "下加符"],
  185: ["Superscript one", "上标 1"],
  186: ["Masculine ordinal indicator", "阳性序数符号"],
  187: ["Right-pointing double angle quotation mark", "右双角引号"],
  188: ["Vulgar fraction one quarter", "四分之一"],
  189: ["Vulgar fraction one half", "二分之一"],
  190: ["Vulgar fraction three quarters", "四分之三"],
  191: ["Inverted question mark", "倒问号"],
  215: ["Multiplication sign", "乘号"],
  247: ["Division sign", "除号"],
};

/** Letters that do not decompose into a base letter plus an accent. */
const LATIN1_LETTERS: Record<number, [string, string]> = {
  198: ["Latin capital letter AE", "大写连字 AE"],
  208: ["Latin capital letter Eth", "大写字母 Eth"],
  216: ["Latin capital letter O with stroke", "带斜线的大写 O"],
  222: ["Latin capital letter Thorn", "大写字母 Thorn"],
  223: ["Latin small letter sharp s", "小写字母 sharp s"],
  230: ["Latin small letter ae", "小写连字 ae"],
  240: ["Latin small letter eth", "小写字母 eth"],
  248: ["Latin small letter o with stroke", "带斜线的小写 o"],
  254: ["Latin small letter thorn", "小写字母 thorn"],
};

/** Combining marks reachable through NFD, with their English and Chinese names. */
const COMBINING_MARKS: Record<string, [string, string]> = {
  "\u0300": ["grave", "抑音"],
  "\u0301": ["acute", "锐音"],
  "\u0302": ["circumflex", "抑扬符"],
  "\u0303": ["tilde", "波浪符"],
  "\u0308": ["diaeresis", "分音符"],
  "\u030a": ["ring above", "上圆环"],
  "\u0327": ["cedilla", "下加符"],
};

/**
 * Name a Latin-1 character the way Unicode does: `é` is "Latin small letter e
 * with acute". Accented letters are decomposed with NFD instead of being listed
 * by hand, which keeps the table honest.
 */
function latin1Name(code: number): [string, string] {
  const known = LATIN1_SYMBOLS[code] ?? LATIN1_LETTERS[code];
  if (known) return known;

  const char = String.fromCharCode(code);
  const [base, mark] = [...char.normalize("NFD")];
  const accent = mark ? COMBINING_MARKS[mark] : undefined;
  if (!base || !accent) return ["Latin-1 supplement", "Latin-1 补充"];

  const capital = char === char.toUpperCase();
  return [
    `Latin ${capital ? "capital" : "small"} letter ${base} with ${accent[0]}`,
    `带${accent[1]}的${capital ? "大写" : "小写"}字母 ${base}`,
  ];
}

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
    // C1 is a control block too: nothing to draw for 128–159.
    const control = code < 32 || code === 127 || (code >= 128 && code <= 159);
    const [name, zh] =
      code > 127
        ? code < 160
          ? (C1_NAMES[code] ?? ["C1 control", "C1 控制符"])
          : latin1Name(code)
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
