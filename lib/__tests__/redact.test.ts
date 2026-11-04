import { describe, expect, it } from "vitest";
import {
  ALL_KINDS,
  countByKind,
  findSensitive,
  isValidBankCard,
  isValidIdCard,
  isValidSsn,
  maskValue,
  redactText,
  type RedactMode,
} from "@/lib/redact";

const ID = "11010519491231002X";
const CARD = "4111111111111111";
const SSN = "412-88-7361";

const run = (text: string, mode: RedactMode, kinds = ALL_KINDS, locale: "zh" | "en" = "zh") =>
  redactText(text, { mode, kinds, locale });

describe("sensitive detection", () => {
  it("finds a mobile number with and without a country code", () => {
    const found = findSensitive("联系电话 13812345678，备用 +8613900139000。", ["phone"]);
    expect(found.map((m) => m.value)).toEqual(["13812345678", "+8613900139000"]);
  });

  it("finds North American phone numbers only when they keep their separators", () => {
    const found = findSensitive(
      "call (415) 555-0132, backup 415-555-0132 or +1 415-555-0132, ref 4155550132",
      ["phone"]
    );
    expect(found.map((m) => m.value)).toEqual([
      "(415) 555-0132",
      "415-555-0132",
      "+1 415-555-0132",
    ]);
  });

  it("validates SSN ranges", () => {
    expect(isValidSsn(SSN)).toBe(true);
    expect(isValidSsn("666-12-3456")).toBe(false);
    expect(isValidSsn("900-12-3456")).toBe(false);
    expect(isValidSsn("412-00-7361")).toBe(false);
    expect(isValidSsn("412-88-0000")).toBe(false);

    const found = findSensitive(`ssn ${SSN}, bad 666-12-3456`, ["ssn"]);
    expect(found.map((m) => m.value)).toEqual([SSN]);
  });

  it("requires a valid check digit for ID numbers", () => {
    expect(isValidIdCard(ID)).toBe(true);
    expect(isValidIdCard("110105194912310021")).toBe(false);

    const found = findSensitive(`证件号 ${ID}，错的 110105194912310021`, ["idcard"]);
    expect(found.map((m) => m.value)).toEqual([ID]);
  });

  it("requires a Luhn checksum for bank cards", () => {
    expect(isValidBankCard(CARD)).toBe(true);
    expect(isValidBankCard("4111111111111112")).toBe(false);
    expect(isValidBankCard("4111 1111 1111 1111")).toBe(true);
  });

  it("finds emails and IPv4 addresses", () => {
    const found = findSensitive("zhang.san+work@example.com.cn from 192.168.1.20", [
      "email",
      "ipv4",
    ]);
    expect(found.map((m) => m.kind)).toEqual(["email", "ipv4"]);
    expect(found[1].value).toBe("192.168.1.20");
  });

  it("keeps the more specific match when ranges overlap", () => {
    // The ID number also matches the "15 to 19 digits" card pattern
    const found = findSensitive(`身份证 ${ID}`, ["idcard", "bankcard"]);
    expect(found).toHaveLength(1);
    expect(found[0].kind).toBe("idcard");
    expect(found[0].value).toBe(ID);
  });

  it("honours the kind filter", () => {
    const text = `13812345678 ${ID}`;
    expect(findSensitive(text, ["phone"])).toHaveLength(1);
    expect(findSensitive(text, [])).toHaveLength(0);
  });
});

describe("redaction modes", () => {
  it("masks by keeping the head and tail of each value", () => {
    expect(run("13812345678", "mask").text).toBe("138****5678");
    expect(run("(415) 555-0132", "mask").text).toBe("(415) ***-0132");
    expect(run(SSN, "mask").text).toBe("***-**-7361");
    expect(run(ID, "mask").text).toBe("110105*******1002X");
    expect(run(CARD, "mask").text).toBe("************1111");
    expect(run("zhangsan@example.com", "mask").text).toBe("z***@example.com");
    expect(run("192.168.1.20", "mask").text).toBe("192.168.*.*");
  });

  it("replaces values with locale-aware labels", () => {
    const text = "手机 13812345678，邮箱 zhang@example.com";
    expect(run(text, "replace").text).toBe("手机 [手机号]，邮箱 [邮箱]");
    expect(run(text, "replace", ALL_KINDS, "en").text).toBe("手机 [PHONE]，邮箱 [EMAIL]");
  });

  it("keeps the original layout in keep-format mode", () => {
    expect(run("卡号 4111-1111-1111-1111", "keep-format", ["bankcard"]).text).toBe(
      "卡号 ****-****-****-****"
    );
    expect(run("a@b.com", "keep-format", ["email"]).text).toBe("*@*.***");
  });

  it("returns the text untouched when nothing matches", () => {
    const result = run("这是一段普通文字 123", "mask");
    expect(result.text).toBe("这是一段普通文字 123");
    expect(result.matches).toHaveLength(0);
  });

  it("does not shift offsets when several values are replaced", () => {
    const text = `${ID} and 13812345678 and ${CARD}`;
    expect(run(text, "replace").text).toBe("[身份证号] and [手机号] and [银行卡号]");
  });

  it("counts matches per kind in canonical order", () => {
    const { matches } = run(`13812345678 13800000000 ${ID}`, "mask");
    const counts = countByKind(matches);
    expect(counts.find((c) => c.kind === "phone")?.count).toBe(2);
    expect(counts.find((c) => c.kind === "idcard")?.count).toBe(1);
    expect(counts.find((c) => c.kind === "email")?.count).toBe(0);
  });
});

describe("maskValue", () => {
  it("leaves separators alone", () => {
    expect(maskValue("138-1234-5678", "phone")).toBe("138-****-5678");
  });
});
