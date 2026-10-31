/**
 * Hash and HMAC helpers.
 *
 * MD5 and SHA-3 are not available in Web Crypto, so those go through
 * hash-wasm; the SHA-2 family and HMAC use the native SubtleCrypto API.
 */
import {
  createMD5,
  createSHA1,
  createSHA256,
  createSHA384,
  createSHA512,
  createSHA3,
  md5,
  sha1,
  sha256,
  sha3,
  sha384,
  sha512,
} from "hash-wasm";
import { codedError } from "./errors";

export type HashAlgorithm = "md5" | "sha1" | "sha256" | "sha384" | "sha512" | "sha3-256" | "sha3-512";

export const HASH_ALGORITHMS: { value: HashAlgorithm; label: string; legacy?: boolean }[] = [
  { value: "md5", label: "MD5", legacy: true },
  { value: "sha1", label: "SHA-1", legacy: true },
  { value: "sha256", label: "SHA-256" },
  { value: "sha384", label: "SHA-384" },
  { value: "sha512", label: "SHA-512" },
  { value: "sha3-256", label: "SHA3-256" },
  { value: "sha3-512", label: "SHA3-512" },
];

export async function hashText(algorithm: HashAlgorithm, text: string): Promise<string> {
  switch (algorithm) {
    case "md5":
      return md5(text);
    case "sha1":
      return sha1(text);
    case "sha256":
      return sha256(text);
    case "sha384":
      return sha384(text);
    case "sha512":
      return sha512(text);
    case "sha3-256":
      return sha3(text, 256);
    case "sha3-512":
      return sha3(text, 512);
  }
}

export type HmacAlgorithm = "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512";

export const HMAC_ALGORITHMS: { value: HmacAlgorithm; label: string; legacy?: boolean }[] = [
  { value: "SHA-1", label: "SHA-1", legacy: true },
  { value: "SHA-256", label: "SHA-256" },
  { value: "SHA-384", label: "SHA-384" },
  { value: "SHA-512", label: "SHA-512" },
];

function assertCrypto() {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw codedError("crypto.unavailable");
  }
}

export async function hmacText(
  algorithm: HmacAlgorithm,
  key: string,
  message: string
): Promise<string> {
  assertCrypto();
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: algorithm },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function hexToBase64(hex: string): string {
  const bytes = hex.match(/.{2}/g) ?? [];
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(parseInt(byte, 16));
  return btoa(binary);
}

const FILE_CHUNK = 4 * 1024 * 1024;

async function createHasher(algorithm: HashAlgorithm) {
  switch (algorithm) {
    case "md5":
      return createMD5();
    case "sha1":
      return createSHA1();
    case "sha256":
      return createSHA256();
    case "sha384":
      return createSHA384();
    case "sha512":
      return createSHA512();
    case "sha3-256":
      return createSHA3(256);
    case "sha3-512":
      return createSHA3(512);
  }
}

/**
 * Hash a file in 4 MB slices so a 2 GB video does not have to sit in memory.
 * Every requested algorithm is fed from the same read pass.
 */
export async function hashFile(
  file: File,
  algorithms: HashAlgorithm[],
  onProgress?: (ratio: number) => void
): Promise<Partial<Record<HashAlgorithm, string>>> {
  if (algorithms.length === 0) return {};
  const hashers = await Promise.all(
    algorithms.map(async (algorithm) => {
      const hasher = await createHasher(algorithm);
      hasher.init();
      return { algorithm, hasher };
    })
  );

  let offset = 0;
  while (offset < file.size) {
    const slice = file.slice(offset, Math.min(offset + FILE_CHUNK, file.size));
    const chunk = new Uint8Array(await slice.arrayBuffer());
    for (const { hasher } of hashers) hasher.update(chunk);
    offset += chunk.length;
    onProgress?.(file.size === 0 ? 1 : offset / file.size);
  }

  const out: Partial<Record<HashAlgorithm, string>> = {};
  for (const { algorithm, hasher } of hashers) out[algorithm] = hasher.digest("hex");
  onProgress?.(1);
  return out;
}
