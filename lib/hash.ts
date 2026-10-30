/**
 * Hash and HMAC helpers.
 *
 * MD5 and SHA-3 are not available in Web Crypto, so those go through
 * hash-wasm; the SHA-2 family and HMAC use the native SubtleCrypto API.
 */
import { md5, sha1, sha256, sha3, sha384, sha512 } from "hash-wasm";

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
    throw new Error("crypto.unavailable");
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
