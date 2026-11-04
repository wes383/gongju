import { describe, expect, it } from "vitest";
import {
  MESSAGE_OVERHEAD,
  REPLY_PRIMING,
  chatOverhead,
  contextBudget,
  estimateTokens,
  tokenizerProfile,
  TOKENIZERS,
} from "@/lib/tokens";

const FOX = "The quick brown fox jumps over the lazy dog";

describe("token estimation", () => {
  it("returns an empty estimate for empty or blank input", () => {
    expect(estimateTokens("").total).toBe(0);
    expect(estimateTokens("  \n\n ").total).toBe(0);
  });

  it("matches the reference count for a well-known English sentence", () => {
    // cl100k_base tokenises this into exactly nine tokens
    expect(estimateTokens(FOX, "cl100k").total).toBe(9);
  });

  it("stays inside the four-to-six characters per token band for prose", () => {
    const prose =
      "Writing documentation is mostly about deciding what the reader already knows, " +
      "then saying the rest in the fewest words that stay unambiguous. Good docs age well " +
      "because they describe behaviour rather than implementation details.";
    const estimate = estimateTokens(prose, "cl100k");
    const ratio = prose.length / estimate.total;
    expect(ratio).toBeGreaterThan(4);
    expect(ratio).toBeLessThan(6);
  });

  it("charges CJK characters at different rates per tokenizer family", () => {
    const chinese = "今天天气很好，我们去公园散步";
    const o200k = estimateTokens(chinese, "o200k").total;
    const cl100k = estimateTokens(chinese, "cl100k").total;
    const llama = estimateTokens(chinese, "llama").total;

    expect(o200k).toBeLessThan(cl100k);
    expect(cl100k).toBeLessThan(llama);
  });

  it("keeps punctuation-heavy JSON close to a real tokenizer", () => {
    // cl100k: {" name ": " test "} → six tokens
    expect(estimateTokens('{"name": "test"}', "cl100k").total).toBe(6);
  });

  it("packs digits in groups of three", () => {
    expect(estimateTokens("1234567890", "cl100k").total).toBe(4);
  });

  it("counts an apostrophe or dash inside a word as part of it", () => {
    expect(estimateTokens("it's", "cl100k").total).toBe(1);
    expect(estimateTokens("state-of-the-art", "cl100k").total).toBe(4);
  });

  it("reports chars, words and a chars-per-token ratio", () => {
    const estimate = estimateTokens("one two three", "cl100k");
    expect(estimate.chars).toBe(13);
    expect(estimate.words).toBe(3);
    expect(estimate.charsPerToken).toBeGreaterThan(2);
  });

  it("counts emoji as single code points", () => {
    expect(estimateTokens("👍🏽", "cl100k").chars).toBe(2);
  });

  it("falls back to the first profile for an unknown family", () => {
    expect(tokenizerProfile("nope" as never).id).toBe(TOKENIZERS[0].id);
  });
});

describe("chat overhead", () => {
  it("adds framing per message plus reply priming", () => {
    expect(chatOverhead(2)).toBe(2 * MESSAGE_OVERHEAD + REPLY_PRIMING);
    expect(chatOverhead(0)).toBe(0);
  });
});

describe("context budget", () => {
  it("subtracts the prompt and the reserve from the window", () => {
    const budget = contextBudget({ window: 128_000, used: 20_000, reserve: 8_000, expected: 4_000 });
    expect(budget.available).toBe(100_000);
    expect(budget.remaining).toBe(96_000);
    expect(budget.fits).toBe(true);
    expect(budget.usage).toBeCloseTo(24_000 / 128_000, 6);
  });

  it("reports the overflow when the planned answer does not fit", () => {
    const budget = contextBudget({ window: 8_192, used: 7_000, reserve: 0, expected: 2_000 });
    expect(budget.fits).toBe(false);
    expect(budget.overflow).toBe(808);
  });

  it("never returns negative room", () => {
    const budget = contextBudget({ window: 1_000, used: 5_000, reserve: 0, expected: 0 });
    expect(budget.available).toBe(0);
    expect(budget.usage).toBe(1);
  });

  it("treats a missing window as unusable instead of dividing by zero", () => {
    const budget = contextBudget({ window: 0, used: 10, reserve: 0, expected: 0 });
    expect(budget.fits).toBe(false);
    expect(budget.usage).toBe(0);
  });
});
