/**
 * Password-based encryption for arbitrary files.
 *
 * Container layout, all integers big-endian:
 *
 *   magic       8 bytes  "GJENC001"
 *   iterations  4 bytes  PBKDF2 rounds
 *   salt       16 bytes  random per file
 *   iv         12 bytes  random per file
 *   nameLen     2 bytes  UTF-8 byte length of the original file name
 *   name        n bytes
 *   typeLen     2 bytes
 *   type        n bytes  MIME type, may be empty
 *   payload     rest     AES-GCM ciphertext with its 16-byte tag
 *
 * The whole header is handed to AES-GCM as additional authenticated data, so
 * altering the stored file name or the iteration count breaks decryption
 * instead of silently changing what the container claims to hold.
 */

import {
  IV_BYTES,
  PBKDF2_ITERATIONS,
  SALT_BYTES,
  assertWebCrypto,
  deriveAesKey,
} from "./crypto";
import { codedError } from "./errors";
import { formatBytes } from "./files";

const MAGIC = new TextEncoder().encode("GJENC001");
const FIXED_HEADER_BYTES = MAGIC.length + 4 + SALT_BYTES + IV_BYTES + 2 + 2;
const GCM_TAG_BYTES = 16;
const MAX_NAME_BYTES = 1024;
const MAX_TYPE_BYTES = 128;
const MIN_ITERATIONS = 10_000;
const MAX_ITERATIONS = 1_000_000;

/**
 * AES-GCM needs the whole payload in memory at once, and the browser keeps
 * both the plaintext and the ciphertext alive while encrypting. 256 MB is the
 * point where that stops being safe on a typical laptop.
 */
export const FILE_CRYPTO_MAX_BYTES = 256 * 1024 * 1024;

export interface FileContainer {
  iterations: number;
  salt: Uint8Array<ArrayBuffer>;
  iv: Uint8Array<ArrayBuffer>;
  /** Authenticated header bytes, from the magic through the MIME type */
  header: Uint8Array<ArrayBuffer>;
  name: string;
  type: string;
  payload: Uint8Array<ArrayBuffer>;
}

export interface DecryptedFile {
  data: Uint8Array<ArrayBuffer>;
  name: string;
  type: string;
}

function concat(parts: Uint8Array<ArrayBuffer>[]): Uint8Array<ArrayBuffer> {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function buildHeader(
  iterations: number,
  salt: Uint8Array<ArrayBuffer>,
  iv: Uint8Array<ArrayBuffer>,
  name: Uint8Array<ArrayBuffer>,
  type: Uint8Array<ArrayBuffer>
): Uint8Array<ArrayBuffer> {
  const header = new Uint8Array(FIXED_HEADER_BYTES + name.length + type.length);
  const view = new DataView(header.buffer);
  let offset = 0;

  header.set(MAGIC, offset);
  offset += MAGIC.length;
  view.setUint32(offset, iterations, false);
  offset += 4;
  header.set(salt, offset);
  offset += SALT_BYTES;
  header.set(iv, offset);
  offset += IV_BYTES;
  view.setUint16(offset, name.length, false);
  offset += 2;
  header.set(name, offset);
  offset += name.length;
  view.setUint16(offset, type.length, false);
  offset += 2;
  header.set(type, offset);

  return header;
}

/** Parse and validate a container header. Returns null for foreign files. */
export function parseFileContainer(bytes: Uint8Array<ArrayBuffer>): FileContainer | null {
  if (bytes.length < FIXED_HEADER_BYTES + GCM_TAG_BYTES) return null;
  for (let i = 0; i < MAGIC.length; i += 1) {
    if (bytes[i] !== MAGIC[i]) return null;
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = MAGIC.length;

  const iterations = view.getUint32(offset, false);
  offset += 4;
  if (iterations < MIN_ITERATIONS || iterations > MAX_ITERATIONS) return null;

  const salt = bytes.slice(offset, offset + SALT_BYTES);
  offset += SALT_BYTES;
  const iv = bytes.slice(offset, offset + IV_BYTES);
  offset += IV_BYTES;

  const nameLength = view.getUint16(offset, false);
  offset += 2;
  if (nameLength > MAX_NAME_BYTES) return null;
  if (offset + nameLength + 2 > bytes.length) return null;
  const name = new TextDecoder().decode(bytes.subarray(offset, offset + nameLength));
  offset += nameLength;

  const typeLength = view.getUint16(offset, false);
  offset += 2;
  if (typeLength > MAX_TYPE_BYTES) return null;
  if (offset + typeLength > bytes.length) return null;
  const type = new TextDecoder().decode(bytes.subarray(offset, offset + typeLength));
  offset += typeLength;

  if (bytes.length - offset < GCM_TAG_BYTES) return null;

  return {
    iterations,
    salt,
    iv,
    header: bytes.slice(0, offset),
    name,
    type,
    payload: bytes.subarray(offset),
  };
}

export async function encryptFileBytes(
  data: Uint8Array<ArrayBuffer>,
  name: string,
  type: string,
  password: string
): Promise<Uint8Array<ArrayBuffer>> {
  assertWebCrypto();
  if (data.length === 0) throw codedError("filecrypto.empty");

  const nameBytes = new TextEncoder().encode(name.slice(0, MAX_NAME_BYTES));
  const typeBytes = new TextEncoder().encode(type.slice(0, MAX_TYPE_BYTES));
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const header = buildHeader(PBKDF2_ITERATIONS, salt, iv, nameBytes, typeBytes);

  const key = await deriveAesKey(password, salt, PBKDF2_ITERATIONS);
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: header },
    key,
    data
  );

  return concat([header, new Uint8Array(cipher)]);
}

export async function decryptFileBytes(bytes: Uint8Array<ArrayBuffer>, password: string): Promise<DecryptedFile> {
  assertWebCrypto();

  const container = parseFileContainer(bytes);
  if (!container) throw codedError("filecrypto.badFormat");

  const key = await deriveAesKey(password, container.salt, container.iterations);

  try {
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: container.iv, additionalData: container.header },
      key,
      container.payload
    );
    return { data: new Uint8Array(plain), name: container.name, type: container.type };
  } catch {
    // GCM authentication failure covers both a wrong password and tampering
    throw codedError("filecrypto.badPassword");
  }
}

/** Encrypt a picked file; the resulting blob keeps no trace of the original name. */
export async function encryptFile(file: File, password: string): Promise<Blob> {
  if (file.size === 0) throw codedError("filecrypto.empty");
  if (file.size > FILE_CRYPTO_MAX_BYTES) {
    throw codedError("filecrypto.tooLarge", formatBytes(file.size));
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const sealed = await encryptFileBytes(bytes, file.name, file.type, password);
  return new Blob([sealed as BlobPart], { type: "application/octet-stream" });
}

/** Decrypt a container and restore the name and MIME type stored inside it. */
export async function decryptFile(file: File, password: string): Promise<{ blob: Blob; name: string }> {
  if (file.size === 0) throw codedError("filecrypto.empty");
  if (file.size > FILE_CRYPTO_MAX_BYTES + FIXED_HEADER_BYTES + MAX_NAME_BYTES) {
    throw codedError("filecrypto.tooLarge", formatBytes(file.size));
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const opened = await decryptFileBytes(bytes, password);
  const blob = new Blob([opened.data as BlobPart], {
    type: opened.type || "application/octet-stream",
  });
  return { blob, name: opened.name || "decrypted" };
}
