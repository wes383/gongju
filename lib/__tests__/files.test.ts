import { describe, expect, it } from "vitest";
import { decodeText } from "@/lib/files";

const bytes = (...values: number[]) => Uint8Array.from(values);

describe("decodeText", () => {
  it("reads UTF-8", () => {
    expect(decodeText(new TextEncoder().encode("第一行字幕"))).toBe("第一行字幕");
  });

  it("strips a UTF-8 BOM", () => {
    const withBom = new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode("1")]);
    expect(decodeText(withBom)).toBe("1");
  });

  it("falls back to GB18030 when the bytes are not valid UTF-8", () => {
    // 你好 encoded as GBK
    expect(decodeText(bytes(0xc4, 0xe3, 0xba, 0xc3))).toBe("你好");
  });

  it("honours a UTF-16LE BOM", () => {
    // 你好 as UTF-16LE
    expect(decodeText(bytes(0xff, 0xfe, 0x60, 0x4f, 0x7d, 0x59))).toBe("你好");
  });

  it("honours a UTF-16BE BOM", () => {
    expect(decodeText(bytes(0xfe, 0xff, 0x4f, 0x60, 0x59, 0x7d))).toBe("你好");
  });

  it("returns an empty string for empty input", () => {
    expect(decodeText(bytes())).toBe("");
  });
});
