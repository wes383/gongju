import { describe, expect, it } from "vitest";
import {
  cleanCues,
  cueStats,
  DEFAULT_CLEAN,
  displayWidth,
  normalizePunctuation,
  stripMarkup,
  stripSdh,
  wrapText,
  type CleanOptions,
} from "@/lib/subtitle-text";
import type { Cue } from "@/lib/subtitle";

const base: CleanOptions = { ...DEFAULT_CLEAN, maxChars: 10, maxLines: 2, mergeShortMs: 0 };

describe("displayWidth", () => {
  it("counts CJK as two columns", () => {
    expect(displayWidth("ab")).toBe(2);
    expect(displayWidth("中文")).toBe(4);
    expect(displayWidth("中文ab")).toBe(6);
  });
});

describe("wrapText", () => {
  it("breaks CJK text into balanced lines", () => {
    expect(wrapText("一二三四五六七八九十", { maxChars: 5, maxLines: 2, mode: "char" })).toBe(
      "一二三四五\n六七八九十"
    );
  });

  it("keeps closing punctuation attached to the previous line", () => {
    const wrapped = wrapText("一二三四五六七八九十。", { maxChars: 10, maxLines: 1, mode: "char" });
    expect(wrapped).toBe("一二三四五六七八九十。");
  });

  it("breaks Latin text on word boundaries", () => {
    expect(wrapText("the quick brown fox", { maxChars: 10, maxLines: 2, mode: "word" })).toBe(
      "the quick\nbrown fox"
    );
  });

  it("segments CJK words without leaving a single character behind", () => {
    expect(
      wrapText("夜色落在这座城市上 还没有人记得它原来的样子", {
        maxChars: 18,
        maxLines: 2,
        mode: "word",
      })
    ).toBe("夜色落在这座城市上\n还没有人记得它原来的样子");
  });

  it("measures columns in width mode", () => {
    expect(wrapText("中文测试", { maxChars: 4, maxLines: 2, mode: "width" })).toBe("中文\n测试");
  });

  it("never truncates text that cannot fit", () => {
    const wrapped = wrapText("一二三四五六七八九十", { maxChars: 4, maxLines: 1, mode: "char" });
    expect(wrapped.replace(/\n/g, "")).toBe("一二三四五六七八九十");
  });

  it("leaves text alone when wrapping is disabled", () => {
    expect(wrapText("一二三四五", { maxChars: 0, maxLines: 2, mode: "char" })).toBe("一二三四五");
  });
});

describe("markup and sound cues", () => {
  it("strips HTML and ASS override tags", () => {
    expect(stripMarkup("{\\an8}<i>斜体</i>和<b>粗体</b>")).toBe("斜体和粗体");
    expect(stripMarkup("第一行<br>第二行")).toBe("第一行\n第二行");
  });

  it("removes SDH annotations", () => {
    expect(stripSdh("[音乐] 脚步声")).toBe("脚步声");
    expect(stripSdh("♪ 街道很安静 ♪")).toBe("街道很安静");
    expect(stripSdh("（远处传来笑声）")).toBe("");
  });
});

describe("punctuation", () => {
  it("widens punctuation between CJK characters", () => {
    expect(normalizePunctuation("你好,世界!", "cjk")).toBe("你好，世界！");
  });

  it("narrows punctuation between Latin characters", () => {
    expect(normalizePunctuation("Wait，really？", "latin")).toBe("Wait,really?");
  });
});

describe("cleanCues", () => {
  it("wraps every cue and trims spaces", () => {
    const cues: Cue[] = [{ start: 0, end: 2000, text: "  一二三四五六七八九十  " }];
    const [cue] = cleanCues(cues, { ...base, maxChars: 5 });
    expect(cue.text).toBe("一二三四五\n六七八九十");
  });

  it("merges cues that are too short to read", () => {
    const cues: Cue[] = [
      { start: 0, end: 300, text: "很短" },
      { start: 300, end: 2400, text: "后面这一条" },
    ];
    const result = cleanCues(cues, { ...base, mergeShortMs: 500, maxChars: 40 });
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ start: 0, end: 2400, text: "很短 后面这一条" });
  });

  it("does not merge across a long gap", () => {
    const cues: Cue[] = [
      { start: 0, end: 300, text: "a" },
      { start: 5000, end: 8000, text: "b" },
    ];
    expect(cleanCues(cues, { ...base, mergeShortMs: 500 })).toHaveLength(2);
  });

  it("runs the injected converter on cue text only", () => {
    const cues: Cue[] = [{ start: 0, end: 2000, text: "这个软件" }];
    const [cue] = cleanCues(cues, base, (text) => text.replace("软件", "軟體"));
    expect(cue.text).toBe("这个軟體");
  });
});

describe("cueStats", () => {
  it("counts fast and long cues", () => {
    const stats = cueStats(
      [
        { start: 0, end: 1000, text: "一二三四五六七八九十一二三四五六七八九十一二" },
        { start: 2000, end: 5000, text: "短" },
      ],
      20,
      10
    );
    expect(stats.cues).toBe(2);
    expect(stats.tooFast).toBe(1);
    expect(stats.tooLong).toBe(1);
    expect(stats.longestLine).toBe(22);
  });
});
