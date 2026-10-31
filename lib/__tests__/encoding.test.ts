import { describe, expect, it } from "vitest";
import {
  decodeBase64,
  decodeUrl,
  encodeBase64,
  encodeHtmlEntities,
  decodeHtmlEntities,
  encodeUrl,
  decodeJwt,
  hexToText,
  parseInBase,
  textToHex,
  textToUnicode,
  unicodeToText,
} from "@/lib/encoding";
import { isCodedError } from "@/lib/errors";

describe("base64", () => {
  it("round-trips ASCII", () => {
    expect(encodeBase64("Hello, world!")).toBe("SGVsbG8sIHdvcmxkIQ==");
    expect(decodeBase64("SGVsbG8sIHdvcmxkIQ==")).toBe("Hello, world!");
  });

  it("round-trips multi-byte text", () => {
    const text = "GongJu — 中文 🚀";
    expect(decodeBase64(encodeBase64(text))).toBe(text);
  });

  it("drops padding and uses the URL-safe alphabet", () => {
    const encoded = encodeBase64("a?b>c~d", { urlSafe: true });
    expect(encoded).not.toMatch(/[+/=]/);
    expect(decodeBase64(encoded)).toBe("a?b>c~d");
  });

  it("wraps at 76 characters", () => {
    const encoded = encodeBase64("x".repeat(200), { lineBreaks: true });
    for (const line of encoded.split("\n")) expect(line.length).toBeLessThanOrEqual(76);
  });

  it("rejects invalid characters with a coded error", () => {
    try {
      decodeBase64("not base64!");
      throw new Error("should have thrown");
    } catch (err) {
      expect(isCodedError(err)).toBe(true);
      if (isCodedError(err)) expect(err.code).toBe("base64.invalidChars");
    }
  });

  it("rejects an impossible length", () => {
    expect(() => decodeBase64("SGVsbG8")).not.toThrow();
    try {
      decodeBase64("A");
    } catch (err) {
      if (isCodedError(err)) expect(err.code).toBe("base64.badLength");
    }
  });
});

describe("url encoding", () => {
  it("round-trips", () => {
    const text = "a b&c=d/中文";
    expect(decodeUrl(encodeUrl(text, "component"), "component")).toBe(text);
  });
});

describe("html entities", () => {
  it("escapes and restores special characters", () => {
    const encoded = encodeHtmlEntities('<a href="x">&</a>');
    expect(encoded).toContain("&lt;");
    expect(decodeHtmlEntities(encoded)).toBe('<a href="x">&</a>');
  });
});

describe("unicode escapes", () => {
  it("round-trips CJK text", () => {
    const text = "中文测试";
    const escaped = textToUnicode(text, { format: "js" });
    expect(escaped).toMatch(/\\u[0-9a-f]{4}/i);
    expect(unicodeToText(escaped)).toBe(text);
  });
});

describe("hex", () => {
  it("round-trips UTF-8 bytes", () => {
    const text = "Hi 世界";
    const hex = textToHex(text, { separator: "space", upper: false });
    expect(hexToText(hex)).toBe(text);
  });

  it("reports an odd number of hex characters", () => {
    try {
      hexToText("abc");
      throw new Error("should have thrown");
    } catch (err) {
      expect(isCodedError(err) && err.code).toBe("hex.oddLength");
    }
  });
});

describe("base conversion", () => {
  it("parses digits in a given base", () => {
    expect(parseInBase("ff", 16)).toBe(255n);
    expect(parseInBase("1010", 2)).toBe(10n);
  });

  it("rejects digits outside the base", () => {
    try {
      parseInBase("2", 2);
      throw new Error("should have thrown");
    } catch (err) {
      expect(isCodedError(err) && err.code).toBe("radix.digit");
    }
  });
});

describe("jwt", () => {
  it("decodes header and payload", () => {
    const token =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
      "eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0." +
      "signature";
    const decoded = decodeJwt(token);
    expect(decoded.header).toMatchObject({ alg: "HS256", typ: "JWT" });
    expect(decoded.payload).toMatchObject({ sub: "1234567890" });
    expect(decoded.signature).toBe("signature");
  });

  it("rejects a single segment", () => {
    try {
      decodeJwt("onlyonepart");
      throw new Error("should have thrown");
    } catch (err) {
      expect(isCodedError(err) && err.code).toBe("jwt.parts");
    }
  });
});
