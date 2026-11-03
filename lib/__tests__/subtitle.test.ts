import { describe, expect, it } from "vitest";
import {
  cueCps,
  detectFormat,
  formatAssTime,
  formatSrtTime,
  parseSubtitle,
  parseTimestamp,
  serialize,
  type Cue,
} from "@/lib/subtitle";
import {
  alignCues,
  applyTiming,
  inspectCues,
  remapFps,
  shiftCues,
} from "@/lib/subtitle-timing";
import { mergeBilingual, splitBilingual, swapCueLines } from "@/lib/subtitle-merge";

const SRT = `1
00:00:01,000 --> 00:00:03,200
第一行
第二行

2
00:00:04,000 --> 00:00:05,500
第二条`;

describe("parseTimestamp", () => {
  it("reads SRT, VTT and ASS timestamps", () => {
    expect(parseTimestamp("00:00:01,000")).toBe(1000);
    expect(parseTimestamp("00:00:01.000")).toBe(1000);
    expect(parseTimestamp("0:00:01.50")).toBe(1500);
    expect(parseTimestamp("00:01:02.345")).toBe(62345);
  });

  it("reads short LRC style mm:ss", () => {
    expect(parseTimestamp("01:02")).toBe(62000);
  });

  it("rejects anything else", () => {
    expect(parseTimestamp("")).toBeNull();
    expect(parseTimestamp("abc")).toBeNull();
  });
});

describe("time formatting", () => {
  it("pads SRT and centres ASS", () => {
    expect(formatSrtTime(3723456)).toBe("01:02:03,456");
    expect(formatAssTime(3723456)).toBe("1:02:03.45");
  });
});

describe("detectFormat", () => {
  it("tells the supported formats apart", () => {
    expect(detectFormat(SRT)).toBe("srt");
    expect(detectFormat("WEBVTT\n\n00:01.000 --> 00:02.000\nhi")).toBe("vtt");
    expect(detectFormat("[Script Info]\nTitle: x\n\n[Events]\n")).toBe("ass");
    expect(detectFormat("0:00:01.000,0:00:03.000\nhello")).toBe("sbv");
    expect(detectFormat("[00:01.00]第一句")).toBe("lrc");
    expect(detectFormat("just words")).toBe("txt");
  });
});

describe("parseSubtitle", () => {
  it("parses SRT with multi-line cues", () => {
    const doc = parseSubtitle(SRT);
    expect(doc.format).toBe("srt");
    expect(doc.cues).toHaveLength(2);
    expect(doc.cues[0]).toEqual({ start: 1000, end: 3200, text: "第一行\n第二行" });
  });

  it("accepts SRT without index lines", () => {
    const doc = parseSubtitle("00:00:01,000 --> 00:00:02,000\nonly text");
    expect(doc.cues).toHaveLength(1);
    expect(doc.cues[0].text).toBe("only text");
  });

  it("skips VTT header, NOTE and cue settings", () => {
    const doc = parseSubtitle(`WEBVTT

NOTE a comment

cue-1
00:00:01.000 --> 00:00:02.000 align:start
Hello`);
    expect(doc.cues).toEqual([{ start: 1000, end: 2000, text: "Hello" }]);
  });

  it("parses ASS events and keeps the style header", () => {
    const doc = parseSubtitle(`[Script Info]
Title: test

[V4+ Styles]
Format: Name, Fontname
Style: Default,Arial

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:03.50,Default,,0,0,0,,{\\i1}第一行\\N第二行`);
    expect(doc.cues).toEqual([{ start: 1000, end: 3500, text: "第一行\n第二行" }]);
    expect(doc.header).toContain("[Script Info]");
  });

  it("parses SBV blocks", () => {
    const doc = parseSubtitle("0:00:01.000,0:00:03.000\nhello\nworld");
    expect(doc.cues).toEqual([{ start: 1000, end: 3000, text: "hello\nworld" }]);
  });

  it("turns LRC lines into cues that end at the next line", () => {
    const doc = parseSubtitle("[ti:demo]\n[00:01.00]第一句\n[00:03.50]第二句");
    expect(doc.cues).toHaveLength(2);
    expect(doc.cues[0]).toEqual({ start: 1000, end: 3500, text: "第一句" });
  });

  it("gives plain text synthetic timing", () => {
    const doc = parseSubtitle("第一行\n第二行");
    expect(doc.cues).toHaveLength(2);
    expect(doc.cues[0].start).toBe(0);
    expect(doc.cues[1].start).toBeGreaterThan(doc.cues[0].end);
  });
});

describe("serialize", () => {
  const cues: Cue[] = [
    { start: 1000, end: 3200, text: "第一行\n第二行" },
    { start: 4000, end: 5500, text: "第二条" },
  ];

  it("writes SRT that parses back to the same cues", () => {
    const output = serialize(cues, "srt");
    expect(output.startsWith("1\n00:00:01,000 --> 00:00:03,200")).toBe(true);
    expect(parseSubtitle(output).cues).toEqual(cues);
  });

  it("writes a WEBVTT header and dot decimals", () => {
    const output = serialize(cues, "vtt");
    expect(output.startsWith("WEBVTT\n\n")).toBe(true);
    expect(output).toContain("00:00:01.000 --> 00:00:03.200");
    expect(parseSubtitle(output).cues).toEqual(cues);
  });

  it("round-trips ASS text with hard breaks and styles", () => {
    const first = parseSubtitle(`[Script Info]
Title: test

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:03.50,Default,,0,0,0,,第一行\\N第二行`);
    const output = serialize(first.cues, "ass", { header: first.header });
    // The source header is reused verbatim instead of being replaced
    expect(output).toContain("Title: test");
    const back = parseSubtitle(output);
    expect(back.cues).toEqual(first.cues);
  });

  it("falls back to a default style header without one", () => {
    expect(serialize(cues, "ass")).toContain("Style: Default");
  });

  it("emits LRC timestamps", () => {
    expect(serialize(cues, "lrc")).toContain("[00:01.00]第一行 第二行");
  });

  it("converts line endings when asked", () => {
    expect(serialize(cues, "srt", { crlf: true })).toContain("\r\n");
  });
});

describe("timing", () => {
  it("shifts and clamps at zero", () => {
    const shifted = shiftCues([{ start: 500, end: 1500, text: "a" }], -1000);
    expect(shifted[0]).toEqual({ start: 0, end: 500, text: "a" });
  });

  it("remaps 23.976 to 25 by moving the track earlier", () => {
    const [cue] = remapFps([{ start: 1000, end: 2000, text: "a" }], 23.976, 25);
    expect(cue.start).toBe(959);
    expect(cue.end).toBe(1918);
  });

  it("aligns first and last cue to new anchors", () => {
    const aligned = alignCues(
      [
        { start: 1000, end: 2000, text: "a" },
        { start: 3000, end: 4000, text: "b" },
      ],
      2000,
      6000
    );
    expect(aligned[0].start).toBe(2000);
    expect(aligned[1].end).toBe(6000);
    expect(aligned[0].end).toBe(3333);
  });

  it("applies fps before shift and enforces a minimum duration", () => {
    const result = applyTiming([{ start: 1000, end: 1100, text: "a" }], {
      fps: { from: 25, to: 25 },
      shiftMs: 500,
      minDuration: 500,
    });
    expect(result[0]).toEqual({ start: 1500, end: 2000, text: "a" });
  });

  it("trims overlaps when asked", () => {
    const result = applyTiming(
      [
        { start: 0, end: 2000, text: "a" },
        { start: 1500, end: 3000, text: "b" },
      ],
      { shiftMs: 0, fixOverlaps: true }
    );
    expect(result[0].end).toBe(1500);
  });

  it("reports overlaps, zero durations and fast cues", () => {
    const issues = inspectCues([
      { start: 0, end: 0, text: "a" },
      { start: 0, end: 500, text: "b" },
      { start: 400, end: 1300, text: "一二三四五六七八九十一二三四五六七八九十一二" },
    ]);
    const kinds = issues.map((issue) => issue.kind);
    expect(kinds).toContain("zero");
    expect(kinds).toContain("overlap");
    expect(kinds).toContain("fast");
  });
});

describe("bilingual merge", () => {
  const zh: Cue[] = [
    { start: 1000, end: 3200, text: "第一句" },
    { start: 4000, end: 5500, text: "第二句" },
  ];
  const en: Cue[] = [
    { start: 1200, end: 3300, text: "First line" },
    { start: 4100, end: 5400, text: "Second line" },
  ];

  it("stacks the translation under the original", () => {
    const merged = mergeBilingual(zh, en);
    expect(merged[0].text).toBe("第一句\nFirst line");
    expect(merged[1].text).toBe("第二句\nSecond line");
  });

  it("can put the translation first", () => {
    const merged = mergeBilingual(zh, en, { translationFirst: true });
    expect(merged[0].text).toBe("First line\n第一句");
  });

  it("assigns a coarse translation to the best overlapping cue only", () => {
    const merged = mergeBilingual(
      [
        { start: 0, end: 1000, text: "a" },
        { start: 1000, end: 2000, text: "b" },
      ],
      [{ start: 0, end: 2000, text: "whole" }]
    );
    expect(merged[0].text).toBe("a\nwhole");
    expect(merged[1].text).toBe("b");
  });

  it("keeps cues that have no translation", () => {
    const merged = mergeBilingual(zh, [{ start: 1000, end: 3200, text: "Only first" }]);
    expect(merged[1].text).toBe("第二句");
  });

  it("pairs slightly offset tracks within the tolerance", () => {
    const merged = mergeBilingual(
      [{ start: 0, end: 1000, text: "原文" }],
      [{ start: 1200, end: 2000, text: "译文" }]
    );
    expect(merged[0].text).toBe("原文\n译文");
  });

  it("drops translations that are far away", () => {
    const merged = mergeBilingual(
      [{ start: 0, end: 1000, text: "原文" }],
      [{ start: 5000, end: 6000, text: "译文" }]
    );
    expect(merged[0].text).toBe("原文");
  });

  it("splits a bilingual track back into two", () => {
    const { primary, secondary } = splitBilingual([
      { start: 0, end: 1000, text: "原文\n译文" },
      { start: 1000, end: 2000, text: "只有一行" },
    ]);
    expect(primary.map((cue) => cue.text)).toEqual(["原文", "只有一行"]);
    expect(secondary.map((cue) => cue.text)).toEqual(["译文"]);
  });

  it("swaps the line order", () => {
    const swapped = swapCueLines([{ start: 0, end: 1000, text: "原文\n译文" }]);
    expect(swapped[0].text).toBe("译文\n原文");
  });
});

describe("cueCps", () => {
  it("ignores markup and whitespace", () => {
    expect(cueCps({ start: 0, end: 1000, text: "<i>ab cd</i>" })).toBe(4);
  });
});
