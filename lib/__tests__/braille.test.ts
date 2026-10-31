import { describe, expect, it } from "vitest";
import {
  annotateDots,
  cellFromDots,
  convertBraille,
  dotsFromCell,
  fromChineseBraille,
  fromEnglishBraille,
  splitPinyin,
  syllableToBraille,
  toChineseBraille,
  toEnglishBraille,
} from "@/lib/braille";

describe("cells", () => {
  it("maps dot numbers to the Unicode braille block", () => {
    expect(cellFromDots("1")).toBe("⠁");
    expect(cellFromDots("12")).toBe("⠃");
    expect(cellFromDots("123456")).toBe("⠿");
    expect(dotsFromCell("⠃")).toBe("12");
    expect(dotsFromCell("a")).toBe("");
  });

  it("annotates every cell with its dots", () => {
    expect(annotateDots("⠝⠊")).toBe("⠝(1345) ⠊(24)");
  });
});

describe("english braille", () => {
  it("writes letters, capitals and digits", () => {
    expect(toEnglishBraille("abc")).toBe("⠁⠃⠉");
    expect(toEnglishBraille("Hi")).toBe("⠠⠓⠊");
    expect(toEnglishBraille("12")).toBe("⠼⠁⠃");
    expect(toEnglishBraille("1a")).toBe("⠼⠁⠁");
  });

  it("writes punctuation and keeps spaces", () => {
    expect(toEnglishBraille("a, b.")).toBe("⠁⠂ ⠃⠲");
    expect(toEnglishBraille("(x)")).toBe("⠐⠣⠭⠐⠜");
  });

  it("round-trips text", () => {
    for (const text of ["Hello, world!", "Braille 2026", "a-b/c", "(test)"]) {
      expect(fromEnglishBraille(toEnglishBraille(text))).toBe(text);
    }
  });

  it("leaves characters it does not know untouched", () => {
    expect(toEnglishBraille("你好")).toBe("你好");
  });
});

describe("splitPinyin", () => {
  it("splits initials, finals and tones", () => {
    expect(splitPinyin("ni3")).toEqual({ initial: "n", final: "i", tone: 3 });
    expect(splitPinyin("zhuang1")).toEqual({ initial: "zh", final: "uang", tone: 1 });
    expect(splitPinyin("er2")).toEqual({ initial: "", final: "er", tone: 2 });
    expect(splitPinyin("shi4")).toEqual({ initial: "sh", final: "i", tone: 4 });
    expect(splitPinyin("ma5")).toEqual({ initial: "m", final: "a", tone: 0 });
  });

  it("normalises the abbreviated finals", () => {
    expect(splitPinyin("liu2")?.final).toBe("iou");
    expect(splitPinyin("gui3")?.final).toBe("uei");
    expect(splitPinyin("lun2")?.final).toBe("uen");
    expect(splitPinyin("jun1")).toEqual({ initial: "j", final: "ün", tone: 1 });
    expect(splitPinyin("jue2")?.final).toBe("üe");
  });

  it("unfolds the y and w spellings", () => {
    expect(splitPinyin("yue4")).toEqual({ initial: "", final: "üe", tone: 4 });
    expect(splitPinyin("wei4")).toEqual({ initial: "", final: "uei", tone: 4 });
    expect(splitPinyin("yuan2")).toEqual({ initial: "", final: "üan", tone: 2 });
  });

  it("rejects syllables it cannot spell", () => {
    expect(splitPinyin("hello")).toBeNull();
    expect(splitPinyin("")).toBeNull();
  });
});

describe("chinese braille", () => {
  it("writes initial, final and tone per syllable", () => {
    // n + i + 3声 / h + ao + 3声
    expect(toChineseBraille("你好")).toBe("⠝⠊⠄⠓⠖⠄");
  });

  it("handles zero initials and the ü final", () => {
    // ai4 -> ⠪⠆, ü -> ⠬
    expect(toChineseBraille("爱")).toBe("⠪⠆");
    expect(toChineseBraille("女")).toBe("⠝⠬⠄");
  });

  it("keeps digits and punctuation", () => {
    expect(toChineseBraille("第1号。")).toContain("⠼⠁");
    expect(toChineseBraille("你好，世界")).toContain("⠐");
  });

  it("round-trips to toned pinyin", () => {
    expect(fromChineseBraille(toChineseBraille("你好"))).toBe("nǐhǎo");
    expect(fromChineseBraille(toChineseBraille("旅行"))).toBe("lǚxíng");
    expect(fromChineseBraille(toChineseBraille("重庆"))).toBe("chóngqìng");
  });

  it("reads zero-initial syllables back with y and w spellings", () => {
    expect(fromChineseBraille(toChineseBraille("月亮"))).toBe("yuèliàng");
    expect(fromChineseBraille(toChineseBraille("我爱"))).toBe("wǒài");
  });
});

describe("chinese tone levels", () => {
  it("level 1 marks every syllable", () => {
    expect(syllableToBraille("ba4", 1)).toBe("⠃⠔⠆");
    expect(syllableToBraille("feng1", 1)).toBe("⠋⠼⠁");
  });

  it("level 2 drops the tone assigned to each initial group", () => {
    expect(syllableToBraille("ba4", 2)).toBe("⠃⠔"); // b 省去声
    expect(syllableToBraille("pa2", 2)).toBe("⠏⠔"); // p 省阳平
    expect(syllableToBraille("fei1", 2)).toBe("⠋⠮"); // f 省阴平
    expect(syllableToBraille("lai4", 2)).toBe("⠇⠪"); // l 省去声
    expect(syllableToBraille("ta1", 2)).toBe("⠞⠔⠁"); // t only drops 阳平
  });

  it("level 2 keeps the listed exceptions", () => {
    expect(syllableToBraille("tou2", 2)).toBe("⠞⠷⠂");
    expect(syllableToBraille("le4", 2)).toBe("⠇⠢⠆");
    expect(syllableToBraille("zi4", 2)).toBe("⠵⠊⠆");
  });

  it("level 2 treats zero initials by their own rules", () => {
    expect(syllableToBraille("ai4", 2)).toBe("⠪"); // 零声母去声省
    expect(syllableToBraille("yi4", 2)).toBe("⠊⠆"); // 五个高频音节标去声
    expect(syllableToBraille("wo3", 2)).toBe("⠕");
    expect(syllableToBraille("o4", 2)).toBe("⠢"); // o 系列全省
    expect(syllableToBraille("e4", 2)).toBe("⠢⠆"); // e 系列全不省
  });

  it("level 2 keeps the tone before a zero-initial syllable", () => {
    expect(toChineseBraille("慈爱", 2)).toBe("⠉⠊⠂⠪");
    expect(toChineseBraille("慈爱", 1)).toBe("⠉⠊⠂⠪⠆");
  });

  it("decodes level 2 output as untoned pinyin", () => {
    expect(fromChineseBraille(toChineseBraille("非常", 2))).toBe("feichang");
  });
});

describe("convertBraille", () => {
  it("detects the direction from the input", () => {
    expect(convertBraille("abc", "en")).toEqual({ output: "⠁⠃⠉", direction: "encode" });
    expect(convertBraille("⠁⠃⠉", "en")).toEqual({ output: "abc", direction: "decode" });
    expect(convertBraille("你好", "zh").direction).toBe("encode");
    expect(convertBraille("⠝⠊⠄", "zh").direction).toBe("decode");
  });

  it("returns Chinese braille as text when decoding", () => {
    expect(convertBraille(toChineseBraille("中国"), "zh").output).toBe("zhōngguó");
  });

  it("honours the grade and tone level options", () => {
    expect(convertBraille("the", "en", { grade: 2 }).output).toBe("⠮");
    expect(convertBraille("⠮", "en", { grade: 2 })).toEqual({
      output: "the",
      direction: "decode",
      approximate: true,
    });
    expect(convertBraille("爸爸", "zh", { toneLevel: 2 }).output).toBe("⠃⠔⠃⠔");
  });
});
