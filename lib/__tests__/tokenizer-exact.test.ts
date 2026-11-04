import { describe, expect, it } from "vitest";
import { countTokensExact, supportsExact } from "@/lib/tokenizer-exact";

const FOX = "The quick brown fox jumps over the lazy dog";

describe("exact tokenizer", () => {
  it("only claims families with a bundled vocabulary", () => {
    expect(supportsExact("o200k")).toBe(true);
    expect(supportsExact("cl100k")).toBe(true);
    expect(supportsExact("claude")).toBe(false);
    expect(supportsExact("gemini")).toBe(false);
    expect(supportsExact("llama")).toBe(false);
  });

  it("counts with the real BPE ranks", async () => {
    // cl100k_base and o200k_base both split this sentence into nine tokens
    await expect(countTokensExact(FOX, "cl100k")).resolves.toBe(9);
    await expect(countTokensExact(FOX, "o200k")).resolves.toBe(9);
  });
});
