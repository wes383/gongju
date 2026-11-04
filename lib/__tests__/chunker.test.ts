import { describe, expect, it } from "vitest";
import { chunkText, MAX_CHUNKS, summariseChunks } from "@/lib/chunker";

const ARTICLE = [
  "Retrieval augmented generation starts with clean chunks.",
  "A chunk that cuts a sentence in half gives the retriever a misleading heading.",
  "That is why sentence boundaries make better cut points than fixed character counts.",
  "Overlap helps when an answer spans two chunks, but it also duplicates content in the index.",
  "Keep the overlap small and the chunk size close to the embedding model's sweet spot.",
].join(" ");

describe("chunking", () => {
  it("returns nothing for blank input", () => {
    expect(chunkText("", { maxTokens: 100 })).toEqual([]);
    expect(chunkText("   \n\n", { maxTokens: 100 })).toEqual([]);
  });

  it("keeps every chunk inside the token budget", () => {
    const chunks = chunkText(ARTICLE, { maxTokens: 20, family: "cl100k" });
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.tokens).toBeLessThanOrEqual(20);
    }
  });

  it("rebuilds the original text when there is no overlap", () => {
    const chunks = chunkText(ARTICLE, { maxTokens: 25, family: "cl100k" });
    expect(chunks.map((chunk) => chunk.text).join("")).toBe(ARTICLE);
  });

  it("finishes on a sentence boundary", () => {
    const chunks = chunkText(ARTICLE, { maxTokens: 25, family: "cl100k" });
    for (const chunk of chunks.slice(0, -1)) {
      expect(chunk.text.trimEnd().endsWith(".")).toBe(true);
    }
  });

  it("carries the tail of a chunk into the next one", () => {
    const plain = chunkText(ARTICLE, { maxTokens: 45, family: "cl100k" });
    const overlapping = chunkText(ARTICLE, {
      maxTokens: 45,
      overlapTokens: 20,
      family: "cl100k",
    });

    expect(plain.length).toBeGreaterThan(1);
    const sentences = plain[0].text.match(/[^.]+\./g) ?? [];
    const tail = sentences[sentences.length - 1].trim();
    expect(tail.length).toBeGreaterThan(0);
    expect(overlapping[1].text.trimStart().startsWith(tail)).toBe(true);
  });

  it("hard-splits a single sentence that is longer than the budget", () => {
    const wall = "无".repeat(2_000);
    const chunks = chunkText(wall, { maxTokens: 50, family: "cl100k" });
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.tokens).toBeLessThanOrEqual(50);
    }
    expect(chunks.map((chunk) => chunk.text).join("")).toBe(wall);
  });

  it("refuses an unusable budget", () => {
    expect(() => chunkText(ARTICLE, { maxTokens: 2 })).toThrow();
  });

  it("summarises sizes for the UI", () => {
    const chunks = chunkText(ARTICLE, { maxTokens: 25, family: "cl100k" });
    const summary = summariseChunks(chunks);
    expect(summary.chunks).toBe(chunks.length);
    expect(summary.maxTokens).toBeLessThanOrEqual(25);
    expect(summary.tokens).toBeGreaterThan(0);
  });

  it("stops before producing an unreasonable number of chunks", () => {
    const huge = "字".repeat(MAX_CHUNKS * 40);
    expect(() => chunkText(huge, { maxTokens: 8 })).toThrow();
  });
});
