import { describe, expect, it } from "vitest";
import { toChineseLower, toRmbUpper } from "@/lib/chinese-number";
import { escapeText } from "@/lib/escape";
import { convertSpeed, transferSeconds } from "@/lib/data-speed";
import { hashFile, hashText } from "@/lib/hash";
import { base64ToBytes, bytesToBase64 } from "@/lib/bytes";

describe("toRmbUpper", () => {
  it("writes plain amounts", () => {
    expect(toRmbUpper("12")).toBe("壹拾贰圆整");
    expect(toRmbUpper("1234.56")).toBe("壹仟贰佰叁拾肆圆伍角陆分");
    expect(toRmbUpper("0")).toBe("零圆整");
  });

  it("keeps the zero placeholders between sections", () => {
    expect(toRmbUpper("10001")).toBe("壹万零壹圆整");
    expect(toRmbUpper("100000000")).toBe("壹亿圆整");
    expect(toRmbUpper("1001.01")).toBe("壹仟零壹圆零壹分");
  });

  it("handles the jiao and fen corners", () => {
    expect(toRmbUpper("0.5")).toBe("伍角整");
    expect(toRmbUpper("0.05")).toBe("零伍分");
    expect(toRmbUpper("12.5")).toBe("壹拾贰圆伍角整");
    expect(toRmbUpper("12.05")).toBe("壹拾贰圆零伍分");
  });

  it("rounds beyond two decimals and keeps the sign", () => {
    expect(toRmbUpper("1.999")).toBe("贰圆整");
    expect(toRmbUpper("-3.5")).toBe("负叁圆伍角整");
  });

  it("ignores grouping separators and rejects nonsense", () => {
    expect(toRmbUpper("1,234.5")).toBe("壹仟贰佰叁拾肆圆伍角整");
    expect(toRmbUpper("abc")).toBeNull();
    expect(toRmbUpper("")).toBeNull();
    expect(toRmbUpper("1.2.3")).toBeNull();
  });
});

describe("toChineseLower", () => {
  it("reads integers the way people speak them", () => {
    expect(toChineseLower("0")).toBe("零");
    expect(toChineseLower("10")).toBe("十");
    expect(toChineseLower("110")).toBe("一百一十");
    expect(toChineseLower("10001")).toBe("一万零一");
    expect(toChineseLower("100000000")).toBe("一亿");
  });

  it("reads decimals digit by digit and keeps the sign", () => {
    expect(toChineseLower("3.14")).toBe("三点一四");
    expect(toChineseLower("-12")).toBe("负十二");
    expect(toChineseLower("abc")).toBeNull();
  });
});

describe("escapeText", () => {
  it("escapes and unescapes JSON strings", () => {
    const escaped = escapeText("json", 'a"b\n', false);
    expect(escaped).toBe('a\\"b\\n');
    expect(escapeText("json", escaped, true)).toBe('a"b\n');
  });

  it("escapes single quotes for javascript literals", () => {
    expect(escapeText("javascript", "it's", false)).toBe("it\\'s");
    expect(escapeText("javascript", "it\\'s", true)).toBe("it's");
  });

  it("escapes HTML entities", () => {
    expect(escapeText("html", '<a href="x">&</a>', false)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;"
    );
    expect(escapeText("html", "&lt;p&gt;", true)).toBe("<p>");
  });

  it("handles URL components and reports broken percent-encoding", () => {
    expect(escapeText("url", "a b&c", false)).toBe("a%20b%26c");
    expect(escapeText("url", "a%20b", true)).toBe("a b");
    expect(() => escapeText("url", "%E4", true)).toThrow();
    expect(() => escapeText("json", "\\x", true)).toThrow();
  });

  it("returns an empty string for empty input", () => {
    expect(escapeText("json", "", false)).toBe("");
    expect(escapeText("url", "", true)).toBe("");
  });
});

describe("speed units", () => {
  it("converts bits and bytes", () => {
    expect(convertSpeed(100, "mbps", "mBps")).toBeCloseTo(12.5, 9);
    expect(convertSpeed(1, "gbps", "mbps")).toBe(1000);
    expect(convertSpeed(1, "mBps", "bps")).toBe(8e6);
  });

  it("estimates transfer time", () => {
    // 1 GB over 100 Mbit/s: 8e9 bits / 1e8 bit/s = 80 s
    expect(transferSeconds(1e9, 1e8)).toBeCloseTo(80, 9);
    expect(transferSeconds(0, 1e8)).toBe(0);
    expect(transferSeconds(1e9, 0)).toBeNaN();
  });
});

describe("file hashing and bytes", () => {
  it("hashes a file in slices and matches the text variant", async () => {
    const content = "GongJu 在线工具箱";
    const file = new File([content], "sample.txt", { type: "text/plain" });
    const digests = await hashFile(file, ["md5", "sha256"]);
    expect(digests.sha256).toBe(await hashText("sha256", content));
    expect(digests.md5).toBe(await hashText("md5", content));
  });

  it("handles an empty file", async () => {
    const digests = await hashFile(new File([], "empty.bin"), ["sha256"]);
    expect(digests.sha256).toBe(await hashText("sha256", ""));
  });

  it("round-trips binary through base64", () => {
    const bytes = new Uint8Array([0, 1, 2, 253, 254, 255]);
    expect([...base64ToBytes(bytesToBase64(bytes))]).toEqual([...bytes]);
    expect(bytesToBase64(new Uint8Array([72, 105]))).toBe("SGk=");
  });
});
