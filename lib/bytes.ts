/** Base64 for binary payloads (the encoding helpers in `lib/encoding` are text-only). */

/** Chunked so a multi-megabyte array does not blow the call stack via spread */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Throws if the input is not valid Base64 */
export function base64ToBytes(input: string): Uint8Array {
  const binary = atob(input.replace(/\s+/g, ""));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}
