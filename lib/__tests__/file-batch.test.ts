import { describe, expect, it } from "vitest";
import {
  assembleDuplicateGroups,
  buildRenamePlan,
  checksumText,
  compareFolders,
  DEFAULT_RENAME_OPTIONS,
  duplicateCandidates,
  extensionMismatch,
  manifestCsv,
  sniffFileType,
  summarizeComparison,
  wastedBytes,
} from "@/lib/file-batch";

const bytes = (...values: number[]) => Uint8Array.from(values);

describe("buildRenamePlan", () => {
  it("applies prefix, suffix and padded numbering", () => {
    const plan = buildRenamePlan(["a.jpg", "b.jpg"], {
      ...DEFAULT_RENAME_OPTIONS,
      prefix: "trip-",
      suffix: "",
      start: 5,
      step: 2,
      digits: 3,
    });
    expect(plan.rows.map((row) => row.newName)).toEqual(["trip-a-005.jpg", "trip-b-007.jpg"]);
    expect(plan.rows.every((row) => row.changed)).toBe(true);
    expect(plan.patternInvalid).toBe(false);
  });

  it("puts the counter in front when asked", () => {
    const plan = buildRenamePlan(["a.jpg"], {
      ...DEFAULT_RENAME_OPTIONS,
      numberPlace: "prefix",
      digits: 2,
    });
    expect(plan.rows[0].newName).toBe("01-a.jpg");
  });

  it("does literal find and replace on the stem only", () => {
    const plan = buildRenamePlan(["holiday.2024.jpg"], {
      ...DEFAULT_RENAME_OPTIONS,
      numbered: false,
      find: "holiday",
      replace: "trip",
    });
    expect(plan.rows[0].newName).toBe("trip.2024.jpg");
  });

  it("supports regular expressions and capture groups", () => {
    const plan = buildRenamePlan(["IMG_0001.JPG"], {
      ...DEFAULT_RENAME_OPTIONS,
      numbered: false,
      useRegex: true,
      find: "IMG_(\\d+)",
      replace: "photo-$1",
    });
    expect(plan.rows[0].newName).toBe("photo-0001.JPG");
  });

  it("matches case-insensitively when requested", () => {
    const plan = buildRenamePlan(["Photo.JPG"], {
      ...DEFAULT_RENAME_OPTIONS,
      numbered: false,
      find: "photo",
      replace: "image",
      caseSensitive: false,
    });
    expect(plan.rows[0].newName).toBe("image.JPG");
  });

  it("rewrites the extension in lower, upper and custom modes", () => {
    const lower = buildRenamePlan(["a.JPG"], {
      ...DEFAULT_RENAME_OPTIONS,
      numbered: false,
      extension: "lower",
    });
    expect(lower.rows[0].newName).toBe("a.jpg");

    const custom = buildRenamePlan(["a.png"], {
      ...DEFAULT_RENAME_OPTIONS,
      numbered: false,
      extension: "custom",
      customExtension: ".webp",
    });
    expect(custom.rows[0].newName).toBe("a.webp");
  });

  it("sanitises characters that file systems reject", () => {
    const plan = buildRenamePlan(["a.txt"], {
      ...DEFAULT_RENAME_OPTIONS,
      numbered: false,
      prefix: "a:b*",
    });
    expect(plan.rows[0].newName).toBe("a_b_a.txt");
  });

  it("flags duplicate targets and keeps folders apart", () => {
    const plan = buildRenamePlan(["x/a.txt", "y/a.txt", "x/a.txt"], {
      ...DEFAULT_RENAME_OPTIONS,
      numbered: false,
    });
    expect(plan.rows[0].issue).toBeUndefined();
    expect(plan.rows[1].issue).toBeUndefined();
    expect(plan.rows[2].issue).toBe("duplicate");
    expect(plan.rows[2].dir).toBe("x/");
  });

  it("reports an invalid regex instead of throwing", () => {
    const plan = buildRenamePlan(["a.txt"], {
      ...DEFAULT_RENAME_OPTIONS,
      useRegex: true,
      find: "([a-z",
      numbered: false,
    });
    expect(plan.patternInvalid).toBe(true);
    expect(plan.rows[0].newName).toBe("a.txt");
  });
});

describe("duplicate helpers", () => {
  const files = [
    { item: "small-a", size: 10 },
    { item: "small-b", size: 10 },
    { item: "big-a", size: 500 },
    { item: "big-b", size: 500 },
    { item: "big-c", size: 500 },
    { item: "only-one", size: 42 },
    { item: "empty-a", size: 0 },
    { item: "empty-b", size: 0 },
  ];

  it("only keeps sizes that appear twice", () => {
    const groups = duplicateCandidates(files);
    expect(groups.map((group) => group.size)).toEqual([500, 10]);
    expect(groups[0].items).toHaveLength(3);
  });

  it("confirms duplicates by hash and counts wasted bytes", () => {
    const groups = assembleDuplicateGroups([
      { item: "a", size: 10, hash: "h1" },
      { item: "b", size: 10, hash: "h1" },
      { item: "c", size: 10, hash: "h2" },
      { item: "d", size: 20, hash: "h3" },
      { item: "e", size: 20, hash: "h3" },
    ]);
    expect(groups).toHaveLength(2);
    expect(wastedBytes(groups)).toBe(30);
  });
});

describe("sniffFileType", () => {
  it("recognises PNG and mismatched extensions", () => {
    const detection = sniffFileType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a), "a.png");
    expect(detection.ext).toBe("png");
    expect(detection.mime).toBe("image/png");
    expect(detection.source).toBe("content");
    expect(extensionMismatch(detection, "a.png")).toBe(false);
    expect(extensionMismatch(detection, "a.jpg")).toBe(true);
  });

  it("reads the brand from an ISO-BMFF header", () => {
    const header = new Uint8Array(16);
    header.set([0x66, 0x74, 0x79, 0x70], 4); // ftyp
    header.set([0x61, 0x76, 0x69, 0x66], 8); // avif
    const detection = sniffFileType(header, "cover.avif");
    expect(detection.ext).toBe("avif");
    expect(detection.mime).toBe("image/avif");
    expect(extensionMismatch(detection, "cover.avif")).toBe(false);
  });

  it("recognises RIFF WAVE and WebP", () => {
    const wave = new Uint8Array(12);
    wave.set([0x52, 0x49, 0x46, 0x46], 0);
    wave.set([0x57, 0x41, 0x56, 0x45], 8);
    expect(sniffFileType(wave).ext).toBe("wav");

    const webp = new Uint8Array(12);
    webp.set([0x52, 0x49, 0x46, 0x46], 0);
    webp.set([0x57, 0x45, 0x42, 0x50], 8);
    expect(sniffFileType(webp).ext).toBe("webp");
  });

  it("treats Office files as ZIP containers, not mismatches", () => {
    const detection = sniffFileType(bytes(0x50, 0x4b, 0x03, 0x04, 0x14, 0x00), "report.docx");
    expect(detection.ext).toBe("zip");
    expect(extensionMismatch(detection, "report.docx")).toBe(false);
  });

  it("falls back to text formats named by the extension", () => {
    const detection = sniffFileType(new TextEncoder().encode("# Title\n"), "notes.md");
    expect(detection.kind).toBe("text");
    expect(detection.mime).toBe("text/markdown");
    expect(detection.source).toBe("extension");
  });

  it("returns unknown for opaque binary data", () => {
    const detection = sniffFileType(bytes(0x00, 0x01, 0x02, 0x03, 0x00), "mystery.bin");
    expect(detection.kind).toBe("unknown");
    expect(detection.source).toBe("none");
  });
});

describe("compareFolders", () => {
  const a = [
    { path: "keep.txt", size: 5, item: "a1" },
    { path: "edit.txt", size: 5, item: "a2" },
    { path: "only-a.txt", size: 5, item: "a3" },
  ];
  const b = [
    { path: "keep.txt", size: 5, item: "b1" },
    { path: "edit.txt", size: 7, item: "b2" },
    { path: "only-b.txt", size: 5, item: "b3" },
  ];

  it("classifies by path and size", () => {
    const rows = compareFolders(a, b);
    expect(rows.map((row) => [row.path, row.status])).toEqual([
      ["edit.txt", "changed"],
      ["keep.txt", "same"],
      ["only-a.txt", "only-a"],
      ["only-b.txt", "only-b"],
    ]);
    expect(summarizeComparison(rows)).toEqual({
      total: 4,
      same: 1,
      changed: 1,
      onlyA: 1,
      onlyB: 1,
    });
  });

  it("uses hashes to catch same-size edits", () => {
    const rows = compareFolders(a, b, {
      a: new Map([
        ["keep.txt", "same"],
        ["edit.txt", "one"],
      ]),
      b: new Map([
        ["keep.txt", "same"],
        ["edit.txt", "two"],
      ]),
    });
    const edit = rows.find((row) => row.path === "edit.txt");
    expect(edit?.status).toBe("changed");
  });
});

describe("manifest export", () => {
  const rows = [
    { path: "a,b.txt", size: 1024, lastModified: Date.UTC(2026, 0, 2), hash: "abc" },
    { path: "plain.txt", size: 3, lastModified: 0, hash: "def" },
  ];

  it("quotes commas and keeps a BOM", () => {
    const csv = manifestCsv(rows, "SHA-256");
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"a,b.txt"');
    expect(csv).toContain("1.0 KB,1024");
    expect(csv).toContain("2026-01-02T00:00:00.000Z");
    expect(csv).toContain("sha-256");
  });

  it("writes sha256sum-compatible lines", () => {
    expect(checksumText(rows)).toBe("abc  a,b.txt\ndef  plain.txt\n");
  });
});
