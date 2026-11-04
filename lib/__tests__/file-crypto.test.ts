import { describe, expect, it } from "vitest";
import {
  decryptFileBytes,
  encryptFileBytes,
  parseFileContainer,
} from "@/lib/file-crypto";
import { isCodedError } from "@/lib/errors";

const PASSWORD = "correct horse battery staple";
const bytes = (value: string) => new TextEncoder().encode(value);

async function codeOf(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
  } catch (error) {
    if (isCodedError(error)) return error.code;
    throw error;
  }
  throw new Error("expected the call to fail");
}

describe("file container", () => {
  it("round-trips content, name and mime type", async () => {
    const sealed = await encryptFileBytes(bytes("secret payload"), "报表.xlsx", "application/vnd.ms-excel", PASSWORD);
    const header = parseFileContainer(sealed);

    expect(new TextDecoder().decode(sealed.subarray(0, 8))).toBe("GJENC001");
    expect(header).not.toBeNull();
    expect(header?.name).toBe("报表.xlsx");
    expect(header?.type).toBe("application/vnd.ms-excel");
    expect(header?.iterations).toBe(210_000);

    const opened = await decryptFileBytes(sealed, PASSWORD);
    expect(new TextDecoder().decode(opened.data)).toBe("secret payload");
    expect(opened.name).toBe("报表.xlsx");
  });

  it("produces a different salt and iv for every call", async () => {
    const first = await encryptFileBytes(bytes("same input"), "a.txt", "text/plain", PASSWORD);
    const second = await encryptFileBytes(bytes("same input"), "a.txt", "text/plain", PASSWORD);

    const a = parseFileContainer(first)!;
    const b = parseFileContainer(second)!;
    expect(Buffer.from(a.salt).equals(Buffer.from(b.salt))).toBe(false);
    expect(Buffer.from(a.iv).equals(Buffer.from(b.iv))).toBe(false);
    expect(Buffer.from(first).equals(Buffer.from(second))).toBe(false);
  });

  it("rejects a wrong password", async () => {
    const sealed = await encryptFileBytes(bytes("secret"), "a.txt", "text/plain", PASSWORD);
    expect(await codeOf(() => decryptFileBytes(sealed, "wrong password"))).toBe(
      "filecrypto.badPassword"
    );
  });

  it("treats a tampered header as an authentication failure", async () => {
    const sealed = await encryptFileBytes(bytes("secret"), "a.txt", "text/plain", PASSWORD);
    const tampered = sealed.slice();
    // Flip one byte of the stored name without changing the header layout, so
    // only the additional-authenticated-data check can catch it
    const nameOffset = 8 + 4 + 16 + 12 + 2;
    tampered[nameOffset] ^= 0x01;

    expect(parseFileContainer(sealed)?.name).toBe("a.txt");
    expect(parseFileContainer(tampered)?.name).not.toBe("a.txt");
    expect(await codeOf(() => decryptFileBytes(tampered, PASSWORD))).toBe("filecrypto.badPassword");
  });

  it("rejects a file that was not produced by the tool", async () => {
    const foreign = new Uint8Array(64).fill(7);
    expect(parseFileContainer(foreign)).toBeNull();
    expect(await codeOf(() => decryptFileBytes(foreign, PASSWORD))).toBe("filecrypto.badFormat");
  });

  it("refuses to encrypt an empty payload", async () => {
    expect(await codeOf(() => encryptFileBytes(new Uint8Array(0), "a.txt", "text/plain", PASSWORD))).toBe(
      "filecrypto.empty"
    );
  });
});
