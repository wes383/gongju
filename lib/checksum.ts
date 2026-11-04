/**
 * Frame checksums for serial links: 8-bit sums, XOR (NMEA), LRC (Modbus ASCII)
 * and the CRC variants that turn up in embedded protocols.
 *
 * Everything works on a plain byte array, so the same helpers serve the hex
 * input mode and the ASCII mode.
 */
import { codedError } from "./errors";

export interface ChecksumEntry {
  id: string;
  /** Numeric value, already masked to the width */
  value: number;
  /** Uppercase hex, zero padded to the checksum width */
  hex: string;
  /** How many bytes the checksum occupies on the wire */
  bytes: number;
  /** Bytes in transmission order for little-endian protocols */
  wire?: string;
}

/** Accepts "01 03 00 00", "0x01,0x03", "01-03-00-00" and "\\x01\\x03" */
export function parseHexBytes(input: string): number[] {
  const normalized = input.replace(/\\x/gi, " ");
  const tokens = normalized.split(/[\s,;:|+\-_.]+/).filter(Boolean);
  const digits: string[] = [];
  for (const raw of tokens) {
    const token = raw.replace(/^0x/i, "");
    if (!/^[0-9a-f]+$/i.test(token)) throw codedError("chk.hex", raw.slice(0, 12));
    if (token.length % 2 !== 0) throw codedError("chk.odd", raw.slice(0, 12));
    digits.push(token);
  }
  const joined = digits.join("");
  if (joined.length === 0) return [];
  const bytes: number[] = [];
  for (let i = 0; i < joined.length; i += 2) {
    bytes.push(parseInt(joined.slice(i, i + 2), 16));
  }
  return bytes;
}

/** UTF-8 bytes for ASCII mode */
export function textBytes(text: string): number[] {
  return Array.from(new TextEncoder().encode(text));
}

export function sum8(bytes: number[]): number {
  return bytes.reduce((sum, byte) => (sum + byte) & 0xff, 0) & 0xff;
}

export function xor8(bytes: number[]): number {
  return bytes.reduce((acc, byte) => acc ^ byte, 0) & 0xff;
}

/** Modbus ASCII LRC: two's complement of the byte sum */
export function lrc(bytes: number[]): number {
  return (0x100 - sum8(bytes)) & 0xff;
}

/** CRC-8/MAXIM: poly 0x31 reflected (0x8C), init 0, no final XOR */
export function crc8Maxim(bytes: number[]): number {
  let crc = 0;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0x8c : crc >>> 1;
    }
  }
  return crc & 0xff;
}

/** CRC-16/MODBUS: reflected poly 0xA001, init 0xFFFF */
export function crc16Modbus(bytes: number[]): number {
  let crc = 0xffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xa001 : crc >>> 1;
    }
  }
  return crc & 0xffff;
}

/** MSB-first CRC-16 with a configurable init — covers CCITT-FALSE and XMODEM */
export function crc16Msb(bytes: number[], init: number): number {
  let crc = init & 0xffff;
  for (const byte of bytes) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc & 0xffff;
}

export function crc16CcittFalse(bytes: number[]): number {
  return crc16Msb(bytes, 0xffff);
}

export function crc16Xmodem(bytes: number[]): number {
  return crc16Msb(bytes, 0x0000);
}

export const CHECKSUM_IDS = [
  "sum8",
  "xor8",
  "lrc",
  "crc8",
  "crc16modbus",
  "crc16ccitt",
  "crc16xmodem",
] as const;

export type ChecksumId = (typeof CHECKSUM_IDS)[number];

const WIDTH: Record<ChecksumId, number> = {
  sum8: 1,
  xor8: 1,
  lrc: 1,
  crc8: 1,
  crc16modbus: 2,
  crc16ccitt: 2,
  crc16xmodem: 2,
};

function hex(value: number, bytes: number): string {
  return value.toString(16).toUpperCase().padStart(bytes * 2, "0");
}

export function checksumAll(bytes: number[]): ChecksumEntry[] {
  const modbus = crc16Modbus(bytes);
  const values: Record<ChecksumId, number> = {
    sum8: sum8(bytes),
    xor8: xor8(bytes),
    lrc: lrc(bytes),
    crc8: crc8Maxim(bytes),
    crc16modbus: modbus,
    crc16ccitt: crc16CcittFalse(bytes),
    crc16xmodem: crc16Xmodem(bytes),
  };
  return CHECKSUM_IDS.map((id) => {
    const entry: ChecksumEntry = {
      id,
      value: values[id],
      hex: hex(values[id], WIDTH[id]),
      bytes: WIDTH[id],
    };
    if (id === "crc16modbus") {
      // Modbus puts the low byte first
      entry.wire = `${hex(values[id] & 0xff, 1)} ${hex(values[id] >> 8, 1)}`;
    }
    return entry;
  });
}
