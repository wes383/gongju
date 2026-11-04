import { describe, expect, it } from "vitest";
import { isCodedError } from "@/lib/errors";
import {
  checksumAll,
  crc16CcittFalse,
  crc16Modbus,
  crc16Xmodem,
  crc8Maxim,
  lrc,
  parseHexBytes,
  sum8,
  textBytes,
  xor8,
} from "@/lib/checksum";

function codeOf(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    if (isCodedError(error)) return error.code;
    return "uncoded";
  }
  return "no-error";
}

const READ_HOLDING = [0x01, 0x03, 0x00, 0x00, 0x00, 0x0a];

describe("parseHexBytes", () => {
  it("accepts the usual separator styles", () => {
    expect(parseHexBytes("01 03 00 00 00 0A")).toEqual(READ_HOLDING);
    expect(parseHexBytes("0x01,0x03,0x00,0x00,0x00,0x0A")).toEqual(READ_HOLDING);
    expect(parseHexBytes("01-03-00\n00\t00_0a")).toEqual(READ_HOLDING);
    expect(parseHexBytes("\\x01\\x03\\x00\\x00\\x00\\x0a")).toEqual(READ_HOLDING);
    expect(parseHexBytes("01030000000A")).toEqual(READ_HOLDING);
  });

  it("returns nothing for empty input", () => {
    expect(parseHexBytes("   ")).toEqual([]);
  });

  it("flags a stray character or an odd digit count", () => {
    expect(codeOf(() => parseHexBytes("01 0G"))).toBe("chk.hex");
    expect(codeOf(() => parseHexBytes("010"))).toBe("chk.odd");
  });
});

describe("simple checksums", () => {
  it("sums and xors the Modbus frame", () => {
    expect(sum8(READ_HOLDING)).toBe(0x0e);
    expect(xor8(READ_HOLDING)).toBe(0x08);
    expect(lrc(READ_HOLDING)).toBe(0xf2);
  });

  it("treats an empty frame as zero", () => {
    expect(sum8([])).toBe(0);
    expect(xor8([])).toBe(0);
    expect(lrc([])).toBe(0);
  });
});

describe("CRCs against the standard check vector", () => {
  const check = textBytes("123456789");

  it("CRC-16/MODBUS and the Modbus frame", () => {
    expect(crc16Modbus(check)).toBe(0x4b37);
    expect(crc16Modbus(READ_HOLDING)).toBe(0xcdc5);
  });

  it("CRC-16/CCITT-FALSE and XMODEM", () => {
    expect(crc16CcittFalse(check)).toBe(0x29b1);
    expect(crc16Xmodem(check)).toBe(0x31c3);
  });

  it("CRC-8/MAXIM", () => {
    expect(crc8Maxim(check)).toBe(0xa1);
    expect(crc8Maxim([])).toBe(0);
  });
});

describe("checksumAll", () => {
  it("returns every variant, padded to its width", () => {
    const all = checksumAll(READ_HOLDING);
    expect(all).toHaveLength(7);
    expect(all.map((entry) => entry.id)).toEqual([
      "sum8",
      "xor8",
      "lrc",
      "crc8",
      "crc16modbus",
      "crc16ccitt",
      "crc16xmodem",
    ]);
    for (const entry of all) {
      expect(entry.hex).toHaveLength(entry.bytes * 2);
    }
  });

  it("writes the Modbus CRC low byte first", () => {
    const modbus = checksumAll(READ_HOLDING).find((entry) => entry.id === "crc16modbus")!;
    expect(modbus.hex).toBe("CDC5");
    expect(modbus.wire).toBe("C5 CD");
  });
});
