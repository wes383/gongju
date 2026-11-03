/**
 * TOTP (RFC 6238) generator and verifier, plus the otpauth:// URI parser used
 * by authenticator apps.
 *
 * HMAC is done with Web Crypto, so codes are computed locally and the shared
 * secret never leaves the page.
 */

import { codedError } from "./errors";

export type TotpAlgorithm = "SHA-1" | "SHA-256" | "SHA-512";

export interface TotpOptions {
  /** Base32 secret, spaces / dashes / padding are ignored */
  secret: string;
  digits?: number;
  /** Seconds per step, 30 by default */
  period?: number;
  algorithm?: TotpAlgorithm;
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function normalizeSecret(secret: string): string {
  return secret.replace(/[\s-]/g, "").replace(/=+$/, "").toUpperCase();
}

export function isBase32(secret: string): boolean {
  const clean = normalizeSecret(secret);
  return clean.length > 0 && /^[A-Z2-7]+$/.test(clean);
}

/** RFC 4648 Base32 decoding (no padding required) */
export function base32Decode(secret: string): Uint8Array {
  const clean = normalizeSecret(secret);
  if (!isBase32(clean)) throw codedError("totp.base32");

  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const ch of clean) {
    const index = ALPHABET.indexOf(ch);
    if (index === -1) throw codedError("totp.base32");
    buffer = (buffer << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((buffer >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(bytes);
}

export function base32Encode(bytes: Uint8Array): string {
  let out = "";
  let buffer = 0;
  let bits = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(buffer >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(buffer << (5 - bits)) & 31];
  return out;
}

/** Cryptographically random Base32 secret (20 bytes = 160 bit, the usual size) */
export function randomSecret(bytes = 20): string {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return base32Encode(buffer);
}

function requireSubtle(): SubtleCrypto {
  if (typeof crypto === "undefined" || !crypto.subtle) throw codedError("crypto.unavailable");
  return crypto.subtle;
}

function counterBytes(counter: number): Uint8Array {
  const buffer = new ArrayBuffer(8);
  new DataView(buffer).setBigUint64(0, BigInt(counter));
  return new Uint8Array(buffer);
}

async function hmac(algorithm: TotpAlgorithm, key: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
  const subtle = requireSubtle();
  const cryptoKey = await subtle.importKey(
    "raw",
    key as unknown as BufferSource,
    { name: "HMAC", hash: { name: algorithm } },
    false,
    ["sign"]
  );
  const signature = await subtle.sign("HMAC", cryptoKey, message as unknown as BufferSource);
  return new Uint8Array(signature);
}

/** The 6–8 digit code for a given time step */
export async function totpAt(options: TotpOptions, timestamp: number): Promise<string> {
  const period = options.period ?? 30;
  const digits = options.digits ?? 6;
  const algorithm = options.algorithm ?? "SHA-1";
  const key = base32Decode(options.secret);
  const counter = Math.floor(timestamp / 1000 / period);
  const digest = await hmac(algorithm, key, counterBytes(counter));

  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return String(binary % 10 ** digits).padStart(digits, "0");
}

/** Current code, and how long it stays valid */
export async function currentTotp(
  options: TotpOptions,
  now = Date.now()
): Promise<{ code: string; next: string; remaining: number; period: number; expiresAt: number }> {
  const period = options.period ?? 30;
  const seconds = Math.floor(now / 1000);
  const remaining = period - (seconds % period);
  return {
    code: await totpAt(options, now),
    next: await totpAt(options, (seconds + remaining) * 1000),
    remaining,
    period,
    expiresAt: (seconds + remaining) * 1000,
  };
}

/** Check a user-supplied code, tolerating ±`window` steps of clock drift */
export async function verifyTotp(
  code: string,
  options: TotpOptions,
  window = 1,
  now = Date.now()
): Promise<boolean> {
  const expected = code.replace(/\s/g, "");
  const period = options.period ?? 30;
  for (let step = -window; step <= window; step += 1) {
    const candidate = await totpAt(options, now + step * period * 1000);
    if (candidate === expected) return true;
  }
  return false;
}

export interface OtpAuthInfo {
  type: "totp" | "hotp";
  label: string;
  issuer: string;
  secret: string;
  digits: number;
  period: number;
  algorithm: TotpAlgorithm;
  counter: number;
}

/** Parse otpauth://totp/Issuer:account?secret=… — the format behind QR codes */
export function parseOtpAuthUri(uri: string): OtpAuthInfo | null {
  const trimmed = uri.trim();
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== "otpauth:") return null;

  const type = url.host.toLowerCase() === "hotp" ? "hotp" : "totp";
  const label = decodeURIComponent(url.pathname.replace(/^\//, ""));
  const params = url.searchParams;
  const algorithm = (params.get("algorithm") ?? "SHA1").toUpperCase().replace("-", "");
  const normalised: TotpAlgorithm =
    algorithm === "SHA256" ? "SHA-256" : algorithm === "SHA512" ? "SHA-512" : "SHA-1";

  return {
    type,
    label,
    issuer: params.get("issuer") ?? (label.includes(":") ? label.split(":")[0].trim() : ""),
    secret: params.get("secret") ?? "",
    digits: Math.min(10, Math.max(4, Number(params.get("digits") ?? 6) || 6)),
    period: Math.max(5, Number(params.get("period") ?? 30) || 30),
    algorithm: normalised,
    counter: Math.max(0, Number(params.get("counter") ?? 0) || 0),
  };
}
