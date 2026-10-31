/**
 * IP address inspection.
 *
 * Parsing, range classification and CIDR arithmetic all come from `ipaddr.js`;
 * this module only adds the derived views a table wants (binary, hex, decimal,
 * reverse-DNS form, host range) on top of what the library already knows.
 */
import ipaddr from "ipaddr.js";
import { codedError } from "./errors";

export type IpFamily = "ipv4" | "ipv6";

export interface CidrInfo {
  prefix: number;
  /** First address in the block */
  network: string;
  /** Last address in the block; the broadcast address for IPv4 */
  last: string;
  firstHost: string | null;
  lastHost: string | null;
  /** Usable host addresses, as a string because IPv6 counts exceed 2^53 */
  hosts: string;
  /** IPv4 only */
  mask: string | null;
}

export interface IpInfo {
  input: string;
  family: IpFamily;
  /** Address with any /prefix stripped off */
  address: string;
  /** Canonical text form: RFC 5952 for IPv6 */
  canonical: string;
  /** Zero-padded 8-group form; IPv6 only */
  expanded: string | null;
  binary: string;
  hex: string;
  decimal: string;
  /** `ipaddr.js` range code: private, loopback, linkLocal, 6to4, … */
  range: string;
  /** in-addr.arpa / ip6.arpa lookup name */
  reversed: string;
  /** Dotted IPv4 form when this is an IPv4-mapped IPv6 address */
  mappedV4: string | null;
  cidr: CidrInfo | null;
}

const BITS = { ipv4: 32, ipv6: 128 } as const;

function toBigInt(bytes: number[]): bigint {
  return bytes.reduce((acc, byte) => (acc << 8n) | BigInt(byte), 0n);
}

function fromBigInt(value: bigint, length: number): number[] {
  const bytes: number[] = new Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = Number((value >> BigInt(8 * (length - 1 - i))) & 0xffn);
  }
  return bytes;
}

const bitString = (bytes: number[]) =>
  bytes.map((byte) => byte.toString(2).padStart(8, "0")).join("");

function formatV4(value: bigint): string {
  return fromBigInt(value, 4).join(".");
}

function formatV6(value: bigint): string {
  const parts: number[] = new Array(8);
  for (let group = 0; group < 8; group++) {
    parts[group] = Number((value >> BigInt(16 * (7 - group))) & 0xffffn);
  }
  return new ipaddr.IPv6(parts).toRFC5952String();
}

/** Zero-padded 8-group form; `toFixedLengthString` is undocumented in the types */
function expandV6(address: ipaddr.IPv6): string {
  return address.parts.map((part) => part.toString(16).padStart(4, "0")).join(":");
}

function reverseName(bytes: number[]): string {
  if (bytes.length === 4) return `${[...bytes].reverse().join(".")}.in-addr.arpa`;
  const nibbles = bytes
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .split("")
    .reverse();
  return `${nibbles.join(".")}.ip6.arpa`;
}

function cidrInfo(family: IpFamily, bytes: number[], prefix: number): CidrInfo {
  const bits = BITS[family];
  const value = toBigInt(bytes);
  const all = (1n << BigInt(bits)) - 1n;
  const mask = prefix === 0 ? 0n : all ^ ((1n << BigInt(bits - prefix)) - 1n);
  const network = value & mask;
  const last = network | (all ^ mask);
  const format = family === "ipv4" ? formatV4 : formatV6;

  // A /31 (or /127) is a point-to-point link with both ends usable; a /32
  // (or /128) is a single host. Anything wider drops the network and
  // broadcast addresses.
  const single = prefix === bits;
  const pointToPoint = prefix === bits - 1;
  const firstHost = single ? network : pointToPoint ? network : network + 1n;
  const lastHost = single ? last : pointToPoint ? last : last - 1n;
  const hosts = single ? 1n : pointToPoint ? 2n : 1n << BigInt(bits - prefix);
  const usable = single || pointToPoint ? hosts : hosts - 2n;

  return {
    prefix,
    network: format(network),
    last: format(last),
    firstHost: format(firstHost),
    lastHost: format(lastHost),
    hosts: usable.toString(),
    mask: family === "ipv4" ? ipaddr.IPv4.subnetMaskFromPrefixLength(prefix).toString() : null,
  };
}

/** Split `address/prefix` without letting the library decide what is valid */
function splitCidr(text: string): { address: string; prefix: number | null } {
  const slash = text.lastIndexOf("/");
  if (slash === -1) return { address: text, prefix: null };
  const address = text.slice(0, slash).trim();
  const raw = text.slice(slash + 1).trim();
  const prefix = Number(raw);
  if (!/^\d{1,3}$/.test(raw) || !Number.isInteger(prefix)) {
    throw codedError("ip.badPrefix");
  }
  return { address, prefix };
}

export function analyzeIp(input: string): IpInfo {
  const text = input.trim();
  if (!text) throw codedError("ip.empty");

  const { address, prefix } = splitCidr(text);
  // `parse` is lenient — it reads "192.168.1" as 192.168.0.1 — so IPv4 goes
  // through the strict four-part check and IPv6 is left to the library.
  let parsed: ipaddr.IPv4 | ipaddr.IPv6;
  try {
    parsed = address.includes(":")
      ? ipaddr.IPv6.parse(address)
      : ipaddr.IPv4.isValidFourPartDecimal(address)
        ? ipaddr.IPv4.parse(address)
        : (() => {
            throw codedError("ip.invalid");
          })();
  } catch {
    throw codedError("ip.invalid");
  }

  const family: IpFamily = parsed.kind() === "ipv4" ? "ipv4" : "ipv6";
  if (prefix !== null && prefix > BITS[family]) {
    throw codedError("ip.badPrefix");
  }

  const bytes = parsed.toByteArray();
  const value = toBigInt(bytes);
  const isV6 = family === "ipv6";
  const mapped = isV6 && (parsed as ipaddr.IPv6).isIPv4MappedAddress();

  return {
    input: text,
    family,
    address,
    canonical: isV6 ? (parsed as ipaddr.IPv6).toRFC5952String() : parsed.toString(),
    expanded: isV6 ? expandV6(parsed as ipaddr.IPv6) : null,
    binary: isV6 ? (bitString(bytes).match(/.{16}/g) ?? []).join(":") : bytes.map((b) => b.toString(2).padStart(8, "0")).join("."),
    hex: isV6
      ? (bytes.map((b) => b.toString(16).padStart(2, "0")).join("").match(/.{4}/g) ?? []).join(":")
      : `0x${bytes.map((b) => b.toString(16).padStart(2, "0")).join("")}`,
    decimal: value.toString(),
    range: parsed.range(),
    reversed: reverseName(bytes),
    mappedV4: mapped ? (parsed as ipaddr.IPv6).toIPv4Address().toString() : null,
    cidr: prefix === null ? null : cidrInfo(family, bytes, prefix),
  };
}
