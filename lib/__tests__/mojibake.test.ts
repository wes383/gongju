import { describe, expect, it } from "vitest";
import { analyseMojibake, fixCp1252, fixLatin1, fixMojibake, fixRepeated, toMojibake } from "@/lib/mojibake";

describe("mojibake", () => {
  it("recovers UTF-8 read as Latin-1", () => {
    const broken = toMojibake("你好，世界");
    expect(broken).not.toBe("你好，世界");
    expect(fixLatin1(broken)).toBe("你好，世界");
  });

  it("recovers the Windows-1252 range as well", () => {
    const broken = toMojibake("€ — “引号”", "cp1252");
    // Raw Latin-1 cannot map the printable 0x80–0x9F characters back to bytes
    expect(fixLatin1(broken)).toBeNull();
    expect(fixCp1252(broken)).toBe("€ — “引号”");
  });

  it("unwraps double encoding", () => {
    const double = toMojibake(toMojibake("中文测试"));
    expect(fixRepeated(double)).toBe("中文测试");
  });

  it("detects the kind and reports lossy bytes", () => {
    const report = analyseMojibake(toMojibake("你好"));
    expect(report.kind).toBe("latin1");
    expect(report.replacementChars).toBe(0);

    const damaged = analyseMojibake("你好\ufffd\ufffd");
    expect(damaged.replacementChars).toBe(2);
  });

  it("leaves clean text alone", () => {
    expect(fixMojibake("你好，world 2024").text).toBe("你好，world 2024");
  });
});
