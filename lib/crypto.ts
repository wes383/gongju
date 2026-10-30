/**
 * Password-based AES-GCM encryption built on Web Crypto.
 * Everything runs locally; the password never leaves the browser.
 */

const ITERATIONS = 210_000; // OWASP 2023 guidance for PBKDF2-HMAC-SHA256
const SALT_BYTES = 16;
const IV_BYTES = 12;
const VERSION = "v1";

export class CryptoError extends Error {
  code: string;

  constructor(code: string) {
    super(code);
    this.name = "CryptoError";
    this.code = code;
  }
}

function assertCrypto() {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new CryptoError("crypto.unavailable");
  }
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveKey(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number
): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Output format: v1.<iterations>.<salt>.<iv>.<ciphertext>
 * Salt and IV are random per call and travel with the payload, so the same
 * password produces a different string every time.
 */
export async function encryptText(text: string, password: string): Promise<string> {
  assertCrypto();

  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(password, salt, ITERATIONS);

  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(text)
  );

  return [VERSION, ITERATIONS, toBase64(salt), toBase64(iv), toBase64(new Uint8Array(cipher))].join(
    "."
  );
}

export async function decryptText(payload: string, password: string): Promise<string> {
  assertCrypto();

  const parts = payload.trim().split(".");
  if (parts.length !== 5 || parts[0] !== VERSION) {
    throw new CryptoError("crypto.badFormat");
  }

  const iterations = Number(parts[1]);
  if (!Number.isFinite(iterations) || iterations < 1000) {
    throw new CryptoError("crypto.badFormat");
  }

  let salt: Uint8Array<ArrayBuffer>;
  let iv: Uint8Array<ArrayBuffer>;
  let data: Uint8Array<ArrayBuffer>;
  try {
    salt = fromBase64(parts[2]);
    iv = fromBase64(parts[3]);
    data = fromBase64(parts[4]);
  } catch {
    throw new CryptoError("crypto.badFormat");
  }

  const key = await deriveKey(password, salt, iterations);

  try {
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
    return new TextDecoder().decode(plain);
  } catch {
    // GCM authentication failure covers both a wrong password and tampering
    throw new CryptoError("crypto.badPassword");
  }
}
